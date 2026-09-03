/**
 * "Email these notes to me" (Ashley, 2 Sep 2026, night).
 *
 * POST /api/sermon-notes-email  { sermonId, email, responses, lang }
 *
 * One field, one button, on the Sermon Notes page: a person types an address
 * and their own filled-in notes are emailed to them, once, from the Bible
 * app's own domain (futuresdailyword.com, verified in Resend 2 Sep 2026).
 *
 * Rulings, in his words:
 *   - NO unsubscribe on this email. "They want to give their email for the
 *     notes or they don't fill it in." It is a one-off transactional send.
 *   - The address lands in the comms hub tagged "sermon notes". Any later bulk
 *     mail carries the hub's own unsubscribe, as the law requires.
 *   - References and public-domain text only: no NIV/NLT/ESV verse text in an
 *     email. lib/notes-email.js sends no verse text at all.
 *
 * What stops this being a relay for our sender:
 *   - the request must come from an allowed browser origin (no Origin, or an
 *     unknown one, is refused before any work);
 *   - the sermon must be a real published_sermons row, and the outline comes
 *     from THAT row — the client only sends answers, accepted under the keys
 *     the sermon actually has (lib/notes-email.js), every value bounded;
 *   - the subject and every heading are ours; the person's words appear only
 *     as their answers, escaped;
 *   - a per-connection and a per-address brake through the shared limiter.
 *
 * Fails honestly: no RESEND_API_KEY → 503 "not set up"; a Resend refusal →
 * 502. The hub record is best-effort AFTER a successful send and never fails
 * the send (the person asked for their notes, not for a CRM row).
 */
const { createClient } = require("@supabase/supabase-js");
const crypto = require("crypto");
const { getAllowedOrigin, isAllowedOrigin } = require("./lib/cors");
const { isSharedRateLimited } = require("./lib/rate-limit");
const { normalizeCongregation, congregationName, DEFAULT_CONGREGATION } = require("./lib/congregations");
const { pickResponses, renderNotesEmail } = require("./lib/notes-email");

const RESEND_URL = "https://api.resend.com/emails";
const DEFAULT_FROM = "Futures Daily Word <notes@futuresdailyword.com>";
const APP_URL = "https://futuresdailyword.com";
const MAX_BODY_BYTES = 64 * 1024;
const LANGS = new Set(["en", "es", "pt", "id"]);

// The comms hub's nation codes (hub_nation.code), by congregation. Australia's
// contacts stay Australia's: the hub never mixes nations, so the row says which.
const NATION_BY_CONGREGATION = { "futures-us": "usa", "futures-au": "australia", "futuros-us": "futuros" };

let supabase;
function db() {
  if (!supabase) supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  return supabase;
}

function headersFor(event) {
  const origin = event.headers.origin || event.headers.Origin || event.headers.referer || "";
  return {
    "Access-Control-Allow-Origin": getAllowedOrigin(origin),
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
    "Cache-Control": "no-store"
  };
}

function json(event, status, payload) {
  return { statusCode: status, headers: headersFor(event), body: JSON.stringify(payload) };
}

function clientIp(event) {
  return (event.headers["x-nf-client-connection-ip"] || event.headers["x-forwarded-for"] || event.headers["client-ip"] || "unknown")
    .split(",")[0].trim();
}

function validEmail(raw) {
  const e = String(raw || "").trim().toLowerCase().slice(0, 200);
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e) ? e : "";
}

/** For logs: never the whole address. */
function maskEmail(email) {
  const [user, domain] = String(email).split("@");
  return `${(user || "").slice(0, 1)}***@${domain || ""}`;
}

async function sendWithResend({ to, subject, html, text, sermonId }) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { ok: false, status: 503, error: "not_configured" };
  const from = process.env.SERMON_NOTES_FROM || DEFAULT_FROM;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const res = await fetch(RESEND_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: [to],
        subject,
        html,
        text,
        tags: [{ name: "app", value: "daily-word" }, { name: "kind", value: "sermon-notes" }]
      }),
      signal: controller.signal
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error(`[sermon-notes-email] resend ${res.status} sermon=${sermonId} ${JSON.stringify(data).slice(0, 300)}`);
      return { ok: false, status: 502, error: "provider" };
    }
    return { ok: true, id: data && data.id };
  } catch (err) {
    console.error(`[sermon-notes-email] resend threw sermon=${sermonId}: ${err && err.message}`);
    return { ok: false, status: 502, error: "provider" };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * The comms hub keeps the address, tagged "sermon notes", in its own nation.
 * Best-effort: a hub outage is logged and the person still has their email.
 */
async function recordInHub({ email, congregation, sermonId }) {
  const url = process.env.SERMON_NOTES_HUB_URL;
  const secret = process.env.SERMON_NOTES_HUB_SECRET;
  if (!url || !secret) {
    console.warn("[sermon-notes-email] hub not configured; address not recorded");
    return false;
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        nation: NATION_BY_CONGREGATION[congregation] || NATION_BY_CONGREGATION[DEFAULT_CONGREGATION],
        congregation,
        sermon_id: sermonId,
        source: "sermon notes"
      }),
      signal: controller.signal
    });
    if (!res.ok) {
      console.error(`[sermon-notes-email] hub ${res.status} for sermon=${sermonId}`);
      return false;
    }
    return true;
  } catch (err) {
    console.error(`[sermon-notes-email] hub threw: ${err && err.message}`);
    return false;
  } finally {
    clearTimeout(timer);
  }
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: headersFor(event), body: "" };
  if (event.httpMethod !== "POST") return json(event, 405, { error: "Method not allowed" });

  // A browser on one of our origins, or nothing. curl and unknown sites get no
  // further: this endpoint sends mail carrying a stranger's words.
  const origin = event.headers.origin || event.headers.Origin || "";
  if (!isAllowedOrigin(origin)) return json(event, 403, { error: "This form is not accepting requests." });

  if (Buffer.byteLength(event.body || "", "utf8") > MAX_BODY_BYTES) {
    return json(event, 413, { error: "That is longer than this can take." });
  }
  let body;
  try {
    body = JSON.parse(event.body || "{}");
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("shape");
  } catch {
    return json(event, 400, { error: "Bad request" });
  }

  const email = validEmail(body.email);
  if (!email) return json(event, 400, { error: "Enter an email address." });
  const sermonId = String(body.sermonId || "").trim().slice(0, 200);
  if (!sermonId) return json(event, 400, { error: "Missing sermon" });
  const lang = LANGS.has(body.lang) ? body.lang : "en";

  // Brakes before any read: per connection, then per address. Fail-open by the
  // limiter's design (an infra blip never blocks a person from their notes).
  const ip = clientIp(event);
  if (await isSharedRateLimited("sermon-notes-email", ip, 8, 10 * 60 * 1000)) {
    return json(event, 429, { error: "Too many sends from this connection. Try again in a few minutes." });
  }
  const addrKey = crypto.createHash("sha256").update(email).digest("hex").slice(0, 32);
  if (await isSharedRateLimited("sermon-notes-email-addr", addrKey, 6, 24 * 60 * 60 * 1000)) {
    return json(event, 429, { error: "That address has had its notes sent several times today. Check your inbox." });
  }

  try {
    const { data: row, error } = await db()
      .from("published_sermons")
      .select("id, sermon, congregation")
      .eq("id", sermonId)
      .maybeSingle();
    if (error) throw error;
    if (!row || !row.sermon || typeof row.sermon !== "object") return json(event, 404, { error: "No published message with that id" });

    const congregation = normalizeCongregation(row.congregation);
    const responses = pickResponses(row.sermon, body.responses);
    const mail = renderNotesEmail({ sermon: row.sermon, responses, lang, appUrl: APP_URL });
    const sent = await sendWithResend({ to: email, ...mail, sermonId });
    if (!sent.ok) {
      return json(event, sent.status, {
        error: sent.error === "not_configured" ? "Email isn't set up yet." : "That didn't send. Try again."
      });
    }
    console.log(`[sermon-notes-email] sent sermon=${sermonId} congregation=${congregation} to=${maskEmail(email)} answers=${Object.keys(responses).length} id=${sent.id || ""}`);

    const recorded = await recordInHub({ email, congregation, sermonId });
    return json(event, 200, { ok: true, congregation: congregationName(congregation), recorded });
  } catch (err) {
    console.error("[sermon-notes-email]", err && err.message ? err.message : err);
    return json(event, 500, { error: "That didn't send. Try again." });
  }
};
