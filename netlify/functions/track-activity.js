const { createClient } = require("@supabase/supabase-js");
const { authenticateRequest, migrateRequest } = require("./lib/auth");

const { ALLOWED_ORIGINS } = require('./lib/cors');
const { buildActivityRows } = require('./lib/activity-rows');

let supabase;
function getSupabase() {
  if (!supabase) {
    supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  }
  return supabase;
}

// Rate limit per IP
const ipHits = {};
function checkRate(ip, max = 60) {
  const now = Date.now();
  if (!ipHits[ip]) ipHits[ip] = [];
  ipHits[ip] = ipHits[ip].filter(t => now - t < 60000);
  if (ipHits[ip].length >= max) return true;
  ipHits[ip].push(now);
  if (Object.keys(ipHits).length > 500) {
    for (const k of Object.keys(ipHits)) {
      if (ipHits[k].every(t => now - t >= 60000)) delete ipHits[k];
    }
  }
  return false;
}

exports.handler = async (event) => {
  const origin = event.headers.origin || event.headers.referer || "";
  const corsOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  const headers = {
    "Access-Control-Allow-Origin": corsOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
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
  if (checkRate(clientIP)) {
    return { statusCode: 429, headers, body: JSON.stringify({ error: "Too many requests" }) };
  }

  // Reject requests not from our app (exact match to prevent origin spoofing)
  if (!ALLOWED_ORIGINS.includes(origin)) {
    return { statusCode: 403, headers, body: JSON.stringify({ error: "Forbidden" }) };
  }

  try {
    let body;
    try {
      body = JSON.parse(event.body);
    } catch {
      body = null;
    }
    if (!body || typeof body !== "object") {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid JSON body" }) };
    }
    const { events } = body;
    const db = getSupabase();

    // Validate the payload BEFORE authenticating. migrateRequest mints a session
    // token and persists its hash into profiles.session_token_hashes, which is
    // capped at 5 — so minting one for a request we are about to reject would
    // evict the reader's real token and start 401ing their cloud sync. Nothing
    // in this check depends on the caller's identity, so it belongs first.
    if (!events || !Array.isArray(events) || events.length === 0) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "Events array required" }) };
    }

    // Authenticate via session token
    let email = await authenticateRequest(event, db);
    let migrationToken = null;

    if (!email) {
      const migration = await migrateRequest(event, db, body.email);
      if (!migration) return { statusCode: 401, headers, body: JSON.stringify({ error: "Unauthorized" }) };
      email = migration.email;
      migrationToken = migration.token;
    }
    // Cap at 50 events per request to prevent abuse
    if (events.length > 50) events.length = 50;

    const cleanEmail = email.toLowerCase().trim();

    // Build rows to insert — buildActivityRows validates shape AND gates
    // event_type against the known TRACKED_EVENTS list server-side (the origin
    // check alone is not a name gate for a non-browser caller).
    const rows = buildActivityRows(cleanEmail, events);

    if (rows.length === 0) {
      return { statusCode: 200, headers, body: JSON.stringify({ success: true, note: "No valid events" }) };
    }

    // Batch insert all activity events. Analytics is best-effort — a failed
    // insert must never cost a freshly minted session token (migrateRequest
    // already persisted its hash into profiles.session_token_hashes before we
    // got here), so log and carry on instead of throwing.
    const { error: insertError } = await db.from("activity_events").insert(rows);
    if (insertError) {
      console.error("Track activity insert error:", insertError);
    }

    // Update lastActiveAt on the profile unconditionally — the presence
    // heartbeat has no dependency on the activity_events insert succeeding,
    // and analytics-dashboard.js reads last_active_at alone for active-today/
    // week/month, so a transient insert error must not also sag those numbers.
    await db.from("profiles")
      .update({ last_active_at: new Date().toISOString() })
      .eq("email", cleanEmail);

    return { statusCode: 200, headers, body: JSON.stringify({ success: true, ...(migrationToken ? { sessionToken: migrationToken } : {}) }) };
  } catch (err) {
    console.error("Track activity error:", err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: "Server error" }) };
  }
};
