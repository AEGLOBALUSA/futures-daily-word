const webpush = require("web-push");
const { createClient } = require("@supabase/supabase-js");
const crypto = require("crypto");
const { getVerseSnippet, getTemplate, normLang, getPassageLabel, ALL_PASSAGES } = require("./lib/push-templates.js");

const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;
const VAPID_EMAIL = process.env.VAPID_EMAIL || "mailto:noreply@futuresdailyword.com";

if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
  console.error("VAPID keys not configured in environment variables");
}
if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC, VAPID_PRIVATE);
}

let supabase;
function getSupabase() {
  if (!supabase) {
    supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  }
  return supabase;
}

function getTodaysPassage() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((now - start) / 86400000);
  return ALL_PASSAGES[dayOfYear % ALL_PASSAGES.length];
}

// Pre-compute current hour for each common timezone
function buildTimezoneHourCache() {
  const cache = {};
  const now = new Date();
  const commonTZs = [
    'America/New_York','America/Chicago','America/Denver','America/Los_Angeles',
    'America/Sao_Paulo','America/Mexico_City','America/Bogota','America/Lima',
    'Europe/London','Europe/Paris','Europe/Berlin','Europe/Madrid','Europe/Lisbon',
    'Africa/Johannesburg','Africa/Lagos','Africa/Nairobi',
    'Asia/Tokyo','Asia/Shanghai','Asia/Kolkata','Asia/Dubai',
    'Australia/Sydney','Pacific/Auckland','UTC'
  ];
  for (const tz of commonTZs) {
    try {
      const h = parseInt(new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", hour12: false }).format(now));
      cache[tz] = h;
    } catch (e) {}
  }
  return cache;
}

function getCurrentHour(timezone, tzCache) {
  if (tzCache[timezone] !== undefined) return tzCache[timezone];
  try {
    const h = parseInt(new Intl.DateTimeFormat("en-US", { timeZone: timezone, hour: "numeric", hour12: false }).format(new Date()));
    tzCache[timezone] = h;
    return h;
  } catch (e) {
    const etHour = new Date().getUTCHours() - 5;
    return (etHour + 24) % 24;
  }
}

// Subscriber-local date string (YYYY-MM-DD via en-CA) — keys the once-per-day ledger
function getLocalDate(timezone, dateCache) {
  if (dateCache[timezone] !== undefined) return dateCache[timezone];
  let s;
  try {
    s = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  } catch (e) {
    s = new Date().toISOString().slice(0, 10);
  }
  dateCache[timezone] = s;
  return s;
}

function buildPayload(passage, lang) {
  const verse = getVerseSnippet(passage, lang);
  const template = getTemplate(lang);
  const passageLabel = getPassageLabel(passage, lang);
  return JSON.stringify({
    title: template.title,
    body: template.body.replace("{passage}", passageLabel).replace("{verse}", verse),
    icon: "/icons/icon-192x192.png",
    badge: "/icons/icon-72x72.png",
    url: "/",
    passage: passage
  });
}

exports.handler = async (event) => {
  // Auth check — only authorized callers (cron job) can trigger push sends
    const authHeader = event.headers?.authorization || event.headers?.Authorization || '';
    const cronSecret = process.env.CRON_SECRET;
    const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    // Use timing-safe comparison to prevent timing attacks on the cron secret
    const isAuthed = cronSecret && bearerToken.length === cronSecret.length &&
      crypto.timingSafeEqual(Buffer.from(bearerToken), Buffer.from(cronSecret));
    if (!isAuthed) {
          return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
    }
  
  if (!VAPID_PUBLIC || !VAPID_PRIVATE || !VAPID_EMAIL) {
    return { statusCode: 500, body: JSON.stringify({ error: "VAPID keys not configured" }) };
  }

  const db = getSupabase();
  const passage = getTodaysPassage();

  const tzCache = buildTimezoneHourCache();

  // Cache payloads per language to avoid rebuilding for each subscriber.
  // Prototype-less store + normalised key so a crafted/inherited lang value
  // (e.g. "constructor", region-tagged "es-MX", mixed-case "EN") can never
  // read back a Function from Object.prototype as a false cache hit.
  const payloadCache = Object.create(null);
  function getPayload(lang) {
    const key = normLang(lang);
    if (!payloadCache[key]) {
      payloadCache[key] = buildPayload(passage, key);
    }
    return payloadCache[key];
  }

  try {
    // Single query to get ALL active subscriptions — includes lang field if available.
    // Prefer selecting last_sent_date (the once-per-local-day send ledger that
    // enables the catch-up window). Until that column exists, fall back to the
    // legacy select + exact-hour matching so the run never breaks.
    let subs;
    let hasLedger = true;
    const res = await db.from("push_subscriptions")
      .select("id, subscription, timezone, preferred_hour, endpoint_hash, lang, last_sent_date")
      .eq("active", true);
    if (res.error) {
      hasLedger = false;
      const legacy = await db.from("push_subscriptions")
        .select("id, subscription, timezone, preferred_hour, endpoint_hash, lang")
        .eq("active", true);
      if (legacy.error) throw legacy.error;
      subs = legacy.data;
    } else {
      subs = res.data;
    }

    let sent = 0, failed = 0, skipped = 0;
    const CONCURRENCY = 10;
    const expiredIds = [];
    const dateCache = {};
    const sentIdsByDate = {};

    // Process in batches of CONCURRENCY
    for (let i = 0; i < (subs || []).length; i += CONCURRENCY) {
      const batch = subs.slice(i, i + CONCURRENCY);
      const results = await Promise.allSettled(
        batch.map(async (sub) => {
          const currentHour = getCurrentHour(sub.timezone, tzCache);
          // Legacy rows with a null preferred_hour would never match — default 7am
          const preferredHour = sub.preferred_hour ?? 7;
          if (hasLedger) {
            // Catch-up window: scheduled functions are best-effort, so a
            // delayed/skipped hourly run used to silently drop that hour's
            // cohort for the day. Fire up to 2h past the preferred hour, at
            // most once per subscriber-local day (keyed on last_sent_date).
            const localDate = getLocalDate(sub.timezone, dateCache);
            const withinWindow = currentHour >= preferredHour && currentHour - preferredHour <= 2;
            if (!withinWindow || sub.last_sent_date === localDate) {
              return 'skipped';
            }
          } else if (currentHour !== preferredHour) {
            return 'skipped';
          }
          const payload = getPayload(sub.lang);
          await webpush.sendNotification(sub.subscription, payload);
          return 'sent';
        })
      );

      for (let j = 0; j < results.length; j++) {
        const r = results[j];
        if (r.status === 'fulfilled') {
          if (r.value === 'sent') {
            sent++;
            if (hasLedger) {
              const localDate = getLocalDate(batch[j].timezone, dateCache);
              if (!sentIdsByDate[localDate]) sentIdsByDate[localDate] = [];
              sentIdsByDate[localDate].push(batch[j].id);
            }
          }
          else skipped++;
        } else {
          const err = r.reason;
          if (err && (err.statusCode === 410 || err.statusCode === 404)) {
            expiredIds.push(batch[j].id);
          }
          failed++;
        }
      }
    }

    // Record today's send per subscriber (grouped by local date) — this is what
    // stops the catch-up window double-sending on the next hourly run.
    for (const [localDate, ids] of Object.entries(sentIdsByDate)) {
      const { error: ledgerErr } = await db.from("push_subscriptions")
        .update({ last_sent_date: localDate }).in("id", ids);
      if (ledgerErr) console.error("Failed to record last_sent_date:", ledgerErr);
    }

    // Cleanup expired subscriptions in one batch delete
    if (expiredIds.length > 0) {
      await db.from("push_subscriptions").delete().in("id", expiredIds);
    }

    const result = { sent, failed, skipped, expired: expiredIds.length, passage };
    console.log("Push send complete:", result);
    return { statusCode: 200, body: JSON.stringify(result) };
  } catch (err) {
    console.error("Push send error:", err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
