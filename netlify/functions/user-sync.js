/**
 * User Sync — cloud backup and restore for all user data.
 *
 * Stores journal entries, streak, reading plans, reactions,
 * preferences, and settings in Supabase so users can switch
 * devices without losing anything.
 *
 * Actions:
 *   pull  — fetch all cloud data for a user
 *   push  — write all user data to cloud (upsert)
 *   merge — smart-merge journal entries by ID, push result
 */

const { createClient } = require("@supabase/supabase-js");
const { authenticateRequest, migrateRequest } = require("./lib/auth");

const { ALLOWED_ORIGINS, isAllowedOrigin } = require('./lib/cors');

function sanitize(str, maxLen = 200) {
  if (typeof str !== "string") return "";
  return str.replace(/[\x00-\x1F\x7F]/g, "").trim().slice(0, maxLen);
}

// Rate limit per IP
const ipHits = {};
function checkRateLimit(ip, maxPerMin = 30) {
  const now = Date.now();
  if (!ipHits[ip]) ipHits[ip] = [];
  ipHits[ip] = ipHits[ip].filter(t => now - t < 60000);
  if (ipHits[ip].length >= maxPerMin) return true;
  ipHits[ip].push(now);
  if (Object.keys(ipHits).length > 500) {
    for (const k of Object.keys(ipHits)) {
      if (ipHits[k].every(t => now - t >= 60000)) delete ipHits[k];
    }
  }
  return false;
}

let supabase;
function getSupabase() {
  if (!supabase) {
    supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
  }
  return supabase;
}

/**
 * Merge two journal arrays by entry ID.
 * If both have an entry with the same id, keep the one with the later updatedAt.
 * Returns a merged, deduplicated, date-sorted array.
 */
function mergeJournals(cloudJournal, localJournal) {
  const map = new Map();

  // Index cloud entries
  for (const entry of (cloudJournal || [])) {
    if (entry && entry.id) {
      map.set(entry.id, entry);
    }
  }

  // Merge local entries — overwrite if newer
  for (const entry of (localJournal || [])) {
    if (!entry || !entry.id) continue;
    const existing = map.get(entry.id);
    if (!existing) {
      map.set(entry.id, entry);
    } else {
      // Keep whichever was updated more recently
      const existingTime = new Date(existing.updatedAt || existing.date || 0).getTime();
      const localTime = new Date(entry.updatedAt || entry.date || 0).getTime();
      if (localTime >= existingTime) {
        map.set(entry.id, entry);
      }
    }
  }

  // Prune expired deletion tombstones (ported from the client's mergeJournals so
  // the two implementations can't diverge — without this a caller of 'merge' lets
  // tombstones accumulate forever). NaN-safe: a tombstone with a missing or
  // unparsable updatedAt is RETAINED (unknown age must never look "expired").
  const kept = Array.from(map.values()).filter((e) => {
    if (!e || !e.deleted) return true;
    const t = e.updatedAt ? new Date(String(e.updatedAt)).getTime() : NaN;
    return Number.isNaN(t) || (Date.now() - t) < TOMBSTONE_TTL_MS;
  });

  // Sort newest first
  return kept.sort((a, b) => {
    const aTime = new Date(a.date || a.updatedAt || 0).getTime();
    const bTime = new Date(b.date || b.updatedAt || 0).getTime();
    return bTime - aTime;
  });
}

// Keep in step with TOMBSTONE_TTL_MS in src/utils/cloudSync.ts.
const TOMBSTONE_TTL_MS = 180 * 24 * 60 * 60 * 1000; // 180 days

/** JSONB fields protected by the empty-overwrite guard below. */
const GUARDED_FIELDS = ["journal", "highlights", "streak", "active_plans", "book_plans", "reactions", "pathway_progress"];

function isEmptyField(v) {
  return v == null ||
    (Array.isArray(v) ? v.length === 0 : (typeof v === "object" && Object.keys(v).length === 0));
}

/**
 * Data-loss guard: never let an EMPTY field overwrite NON-EMPTY stored data —
 * UNLESS the pushing client is provably up to date with the cloud. A fresh
 * install / cleared device pushes [] / {} for everything (and has never pulled,
 * so its lastSyncVersion is 0/absent): those empties are dropped. A client whose
 * lastSyncVersion matches the stored row's sync_version (bumped by a DB trigger
 * on every update) has SEEN the current cloud state, so its empty field is a
 * real deletion — e.g. quitting the only active plan, or un-highlighting the
 * last verse, which hard-delete rather than tombstone — and must stick.
 * Genuinely new users have no stored row (existing == null), so their first
 * backup passes through untouched.
 */
function dropEmptyOverwrites(cleaned, existing, clientSyncVersion) {
  if (!existing) return;
  if (clientSyncVersion && Number(clientSyncVersion) === existing.sync_version) return;
  for (const f of GUARDED_FIELDS) {
    if (f in cleaned && isEmptyField(cleaned[f]) && !isEmptyField(existing[f])) {
      delete cleaned[f];
    }
  }
}

/**
 * Validate and cap the size of the payload to prevent abuse.
 * Returns the cleaned data object or throws if invalid.
 */
function validatePayload(data) {
  if (!data || typeof data !== "object") {
    throw new Error("Invalid data payload");
  }

  const cleaned = {};

  // JSONB fields — validate they're the right type, cap size
  if (Array.isArray(data.journal)) {
    // Cap at 5000 entries to prevent abuse
    cleaned.journal = data.journal.slice(0, 5000);
  }
  // Fix 2: sync highlights (verse color markers). Keyed by verseKey, so it's an object, not an array.
  // Cap at ~2000 entries to avoid abuse — that's years of daily highlighting.
  if (data.highlights && typeof data.highlights === "object" && !Array.isArray(data.highlights)) {
    const entries = Object.entries(data.highlights).slice(0, 2000);
    cleaned.highlights = Object.fromEntries(entries);
  }
  // active plans: the client stores them as an OBJECT map { planId: progress }, so
  // accept that shape (older array payloads still supported). Without this branch the
  // upsert silently dropped active_plans and plans never synced to the cloud.
  if (Array.isArray(data.activePlans)) {
    cleaned.active_plans = data.activePlans.slice(0, 100);
  } else if (data.activePlans && typeof data.activePlans === "object") {
    cleaned.active_plans = Object.fromEntries(Object.entries(data.activePlans).slice(0, 100));
  }
  if (data.streak && typeof data.streak === "object" && !Array.isArray(data.streak)) {
    cleaned.streak = data.streak;
  }
  if (data.bookPlans && typeof data.bookPlans === "object" && !Array.isArray(data.bookPlans)) {
    cleaned.book_plans = data.bookPlans;
  }
  if (data.reactions && typeof data.reactions === "object" && !Array.isArray(data.reactions)) {
    cleaned.reactions = data.reactions;
  }
  if (data.pathwayProgress && typeof data.pathwayProgress === "object" && !Array.isArray(data.pathwayProgress)) {
    cleaned.pathway_progress = data.pathwayProgress;
  }

  // String preferences
  if (data.fontSize !== undefined) cleaned.font_size = sanitize(String(data.fontSize), 10);
  if (data.darkMode !== undefined) cleaned.dark_mode = sanitize(String(data.darkMode), 10);
  if (data.translation !== undefined) cleaned.translation = sanitize(String(data.translation), 20);
  if (data.translationManual !== undefined) cleaned.translation_manual = sanitize(String(data.translationManual), 20);

  // Profile pic — https URLs only (blocks data:/javascript: XSS via <img src>)
  if (data.profilePic !== undefined) {
    const pic = String(data.profilePic || "").trim();
    if (pic.length <= 500000 && /^https:\/\//i.test(pic)) {
      cleaned.profile_pic = pic;
    } else {
      cleaned.profile_pic = "";
    }
  }

  return cleaned;
}

exports.handler = async (event) => {
  const origin = event.headers.origin || event.headers.referer || "";
  const corsOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  const headers = {
    "Access-Control-Allow-Origin": corsOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Content-Type": "application/json"
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers, body: "" };
  }
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  // Rate limit
  const clientIP = event.headers?.["x-forwarded-for"]?.split(",")[0]?.trim() || "unknown";
  if (checkRateLimit(clientIP)) {
    return { statusCode: 429, headers, body: JSON.stringify({ error: "Too many requests" }) };
  }

  // Reject requests not from our app (prevents external abuse)
  if (!isAllowedOrigin(origin)) {
    return { statusCode: 403, headers, body: JSON.stringify({ error: "Forbidden" }) };
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const { action } = body;
    const db = getSupabase();

    // Authenticate via session token
    let email = await authenticateRequest(event, db);
    let migrationToken = null;

    if (!email) {
      const migration = await migrateRequest(event, db, sanitize(body.email, 254));
      if (!migration) {
        return { statusCode: 401, headers, body: JSON.stringify({ error: "Unauthorized" }) };
      }
      email = migration.email;
      migrationToken = migration.token;
    }

    // ── PULL: fetch all cloud data for user ──
    if (action === "pull") {
      const { data, error } = await db
        .from("user_data")
        .select("*")
        .eq("email", email)
        .single();

      // 404 ONLY for the PostgREST no-rows code. Any other error (pool exhaustion,
      // timeout, outage) must be a 500: the client treats a 404 as "brand-new user"
      // and seeds a first backup, which would overwrite the real backup.
      if (error && error.code !== "PGRST116") {
        console.error("Pull error:", error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: "Failed to load data" })
        };
      }
      if (error || !data) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ success: false, error: "No data found" })
        };
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          ...(migrationToken ? { sessionToken: migrationToken } : {}),
          data: {
            journal: data.journal || [],
            highlights: data.highlights || {},  // Fix 2
            streak: data.streak || {},
            activePlans: data.active_plans || {},
            bookPlans: data.book_plans || {},
            reactions: data.reactions || {},
            pathwayProgress: data.pathway_progress || {},
            fontSize: data.font_size || "15",
            darkMode: data.dark_mode || "",
            translation: data.translation || "",
            translationManual: data.translation_manual || "",
            profilePic: data.profile_pic || "",
            misc: data.misc || {},
            syncVersion: data.sync_version || 1,
            updatedAt: data.updated_at
          }
        })
      };
    }

    // ── PUSH: write all user data to cloud (upsert) ──
    if (action === "push") {
      const cleaned = validatePayload(body.data || {});
      cleaned.email = email;
      cleaned.updated_at = new Date().toISOString();

      // Pre-read the stored row for the empty-overwrite guard + misc handling.
      // maybeSingle: no row (genuinely new user) is NOT an error.
      const { data: existing, error: readErr } = await db
        .from("user_data")
        .select("journal, highlights, streak, active_plans, book_plans, reactions, pathway_progress, misc, sync_version")
        .eq("email", email)
        .maybeSingle();
      if (readErr) {
        // Can't verify what we'd overwrite — refuse rather than risk clobbering
        // the only backup with a fresh device's empty state.
        console.error("Push pre-read error:", readErr);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: "Failed to save data" })
        };
      }

      dropEmptyOverwrites(cleaned, existing, body.lastSyncVersion);

      // Misc bag (sermon fill-ins, "my season" story, reading cadence, prayed-for set,
      // book-today pointers). Folded into the SAME upsert so a push is one atomic row
      // write (the old separate update let two concurrent pushes interleave into a
      // mixed snapshot; it predates the misc column migration, long since applied).
      const miscIn = body.data && body.data.misc;
      const miscWarnings = [];
      if (miscIn && typeof miscIn === "object" && !Array.isArray(miscIn)) {
        // Known-large authored keys get a higher cap (a single key holds ALL sermon
        // notes / the whole "My Season" story — years of use exceed 20k chars).
        const LARGE_KEY_CAPS = { dw_sermon_notes: 200000, dw_user_story: 100000 };
        const storedMisc = (existing && existing.misc && typeof existing.misc === "object" && !Array.isArray(existing.misc))
          ? existing.misc : {};
        const misc = {};
        let count = 0;
        for (const [k, v] of Object.entries(miscIn)) {
          if (typeof k !== "string" || k.length > 100) continue;
          const cap = LARGE_KEY_CAPS[k] || 20000;
          const tooBig = typeof v === "string" && v.length > cap;
          if (tooBig || count >= 300) {
            // Skip, DON'T slice: mid-string truncation corrupts JSON values (they
            // restore as empty on the next device). Keep the previously stored
            // value for this key and tell the client what couldn't be saved.
            if (storedMisc[k] !== undefined) misc[k] = storedMisc[k];
            miscWarnings.push(k);
            continue;
          }
          misc[k] = v;
          count++;
        }
        // Same empty-overwrite guard as the columns above.
        if (!(isEmptyField(misc) && !isEmptyField(storedMisc))) {
          cleaned.misc = misc;
        }
      }

      const { data, error } = await db
        .from("user_data")
        .upsert(cleaned, { onConflict: "email" })
        .select("sync_version")
        .single();

      if (error) {
        console.error("Push error:", error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: "Failed to save data" })
        };
      }

      // Dual-write: mirror this user's data into the normalized tables. NON-FATAL —
      // supabase-js v2 resolves rpc failures as { error } (it does not throw), so
      // destructure and log; the try/catch stays as defence for transport throws.
      // Either way a failure here can never block the user's save (JSONB is still source of truth).
      try {
        const { error: rpcError } = await db.rpc("sync_user_data_to_normalized", { p_email: email });
        if (rpcError) console.error("normalized dual-write (push) failed:", rpcError.message || rpcError);
      } catch (e) { console.error("normalized dual-write (push) failed:", e?.message || e); }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          syncVersion: data?.sync_version || 1,
          ...(miscWarnings.length ? { miscWarnings: miscWarnings.slice(0, 20) } : {}),
          ...(migrationToken ? { sessionToken: migrationToken } : {})
        })
      };
    }

    // ── MERGE: smart-merge journal entries ──
    if (action === "merge") {
      // Fetch current cloud data
      const { data: existing } = await db
        .from("user_data")
        .select("journal, highlights, streak, active_plans, book_plans, reactions, pathway_progress, sync_version")
        .eq("email", email)
        .single();

      const cloudJournal = existing?.journal || [];
      const localJournal = body.localJournal || [];

      // Merge
      const merged = mergeJournals(cloudJournal, localJournal);

      // Also accept other data fields if provided — with the same guard as push:
      // an empty field must not wipe non-empty stored data.
      const otherData = validatePayload(body.data || {});
      dropEmptyOverwrites(otherData, existing);

      // Write merged journal + any other data back
      const record = {
        ...otherData,
        email,
        journal: merged,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await db
        .from("user_data")
        .upsert(record, { onConflict: "email" })
        .select("sync_version")
        .single();

      if (error) {
        console.error("Merge error:", error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: "Failed to merge data" })
        };
      }

      // Dual-write: mirror into the normalized tables. NON-FATAL (never blocks the
      // user's save). supabase-js v2 resolves rpc failures as { error } — destructure
      // and log it (the catch alone was dead code and drift went unrecorded).
      try {
        const { error: rpcError } = await db.rpc("sync_user_data_to_normalized", { p_email: email });
        if (rpcError) console.error("normalized dual-write (merge) failed:", rpcError.message || rpcError);
      } catch (e) { console.error("normalized dual-write (merge) failed:", e?.message || e); }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          journal: merged,
          syncVersion: data?.sync_version || 1,
          ...(migrationToken ? { sessionToken: migrationToken } : {})
        })
      };
    }

    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: "Invalid action. Use pull, push, or merge." })
    };

  } catch (err) {
    console.error("User sync error:", err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Server error" })
    };
  }
};
