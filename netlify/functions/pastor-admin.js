const { createClient } = require("@supabase/supabase-js");
const crypto = require("crypto");

// ── Config ──
const PASTOR_SECRET = process.env.PASTOR_SECRET || "";
const { ALLOWED_ORIGINS } = require('./lib/cors');
const { isCampusId } = require('./lib/intake-core');
const { generateCampusCode, validateCampusCode } = require('./lib/campus-code');
function getCorsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return { "Access-Control-Allow-Origin": allowed, "Access-Control-Allow-Headers": "Content-Type, Authorization", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Max-Age": "86400" };
}

let supabase;
function getSupabase() {
  if (!supabase) supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  return supabase;
}

// Pastor code for a campus: first 8 chars of SHA-256(campusId + ":" + secret).
// ONE derivation shared with analytics-dashboard via lib/campus-code (the
// dashboard used to hash the short slug, so listed codes never opened it).
function generateCode(campusId) {
  return generateCampusCode(campusId, PASTOR_SECRET);
}

// Validate a code against a campus (constant-time; accepts the legacy slug form too)
function validateCode(campusId, code) {
  return validateCampusCode(campusId, code, PASTOR_SECRET);
}

function sanitize(str, maxLen = 5000) {
  if (typeof str !== "string") return "";
  return str.replace(/<[^>]*>/g, "").replace(/[\x00-\x1F\x7F]/g, "").trim().slice(0, maxLen);
}

// Rate limit: 20 req/min per IP
const rateBuckets = {};
function rateOk(ip) {
  const now = Date.now();
  const bucket = rateBuckets[ip] || { count: 0, reset: now + 60000 };
  if (now > bucket.reset) { bucket.count = 0; bucket.reset = now + 60000; }
  bucket.count++;
  rateBuckets[ip] = bucket;
  return bucket.count <= 20;
}

exports.handler = async (event) => {
  const origin = event.headers.origin || event.headers.Origin || "";
  const corsHeaders = getCorsHeaders(origin);
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: corsHeaders };
  if (event.httpMethod !== "POST") return { statusCode: 405, headers: corsHeaders, body: "Method not allowed" };

  const ip = event.headers["x-forwarded-for"] || event.headers["client-ip"] || "unknown";
  if (!rateOk(ip)) return { statusCode: 429, headers: corsHeaders, body: JSON.stringify({ error: "Rate limited" }) };

  let body;
  try { body = JSON.parse(event.body); } catch { return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: "Invalid JSON" }) }; }

  const { action, campusId, code } = body;

  // ── Action: verify ── Check if a pastor code is valid
  if (action === "verify") {
    if (!campusId || !code) return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: "Missing campusId or code" }) };
    const valid = validateCode(campusId, code);
    return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ valid, campusId }) };
  }

  // Live campus-corner writes go through staff intake. Save publishes.
  if (action === "post" || action === "delete") {
    return {
      statusCode: 403,
      headers: corsHeaders,
      body: JSON.stringify({
        error: "Campus updates go through the staff form at /staff. Save puts them on the campus corner.",
        intake: "/staff"
      })
    };
  }

  // ── Action: my-campus-code ── The signed-in pastor's own campus code.
  // Auth is the staff session issued by intake.js (Authorization: Bearer <token>,
  // the same dw_staff_token the app already holds). The code is derived from the
  // ROSTER campus, never from a campus the client names, so a campus pastor can
  // only ever receive the code for the campus they are assigned to. Admin / hub
  // staff with no roster campus get { code: null } — their global view stays on
  // the admin PIN. Provisioned by the app at sign-in so nobody hand-types it.
  if (action === "my-campus-code") {
    const auth = event.headers.authorization || event.headers.Authorization || "";
    if (!auth.startsWith("Bearer ")) return { statusCode: 401, headers: corsHeaders, body: JSON.stringify({ error: "Sign in required" }) };
    const raw = auth.slice(7).trim();
    if (!raw || raw.length < 32) return { statusCode: 401, headers: corsHeaders, body: JSON.stringify({ error: "Sign in required" }) };
    try {
      const tokenHash = crypto.createHash("sha256").update(raw).digest("hex");
      const { data: session } = await getSupabase()
        .from("staff_sessions").select("email, expires_at").eq("token_hash", tokenHash).maybeSingle();
      if (!session || new Date(session.expires_at).getTime() < Date.now()) {
        return { statusCode: 401, headers: corsHeaders, body: JSON.stringify({ error: "Sign in required" }) };
      }
      const email = String(session.email || "").trim().toLowerCase();
      // Migration 20260902_staff_campus_set_by is applied (2 Sep 2026). Any
      // error here is a real failure and answers 500 — never a dropped gate.
      const rosterRes = await getSupabase()
        .from("staff_roster").select("campus_id, campus_set_by").eq("email", email).maybeSingle();
      if (rosterRes.error) throw rosterRes.error;
      const roster = rosterRes.data;
      const rosterCampus = roster && typeof roster.campus_id === "string" ? roster.campus_id : "";
      const campusId = isCampusId(rosterCampus) ? rosterCampus : null;
      // Only an ADMIN-confirmed campus mints a code (Ashley, 2 Sep 2026).
      // campus_set_by is 'admin' (Ashley, /staff → People → roster_save) or
      // 'self' (the pastor's own first /staff submission). The migration's
      // backfill stamped every earlier assignment 'admin'; a null is only a
      // row written by a path that predates the column, treated as 'admin'.
      const setBy = roster && roster.campus_set_by ? String(roster.campus_set_by) : "admin";
      const confirmed = setBy === "admin";
      const code = campusId && confirmed ? generateCode(campusId) : null;
      const reason = campusId && !confirmed ? "campus_not_confirmed" : null;
      // Audit line: a roster campus can be self-assigned on a pastor's first
      // /staff submission, so every mint (and every refusal) is in the function log.
      console.log("[pastor-admin] my-campus-code", email, campusId || "(no campus)", code ? "minted" : "none", reason || `set_by=${setBy}`);
      const payload = reason ? { campusId, code, reason } : { campusId, code };
      return { statusCode: 200, headers: corsHeaders, body: JSON.stringify(payload) };
    } catch (err) {
      console.error("[pastor-admin] my-campus-code failed:", err && err.message);
      return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: "Server error" }) };
    }
  }

  // ── Action: list-codes ── Admin only: list all campus codes (requires master secret directly)
  if (action === "list-codes") {
    const { masterSecret } = body;
    const secretMatch = masterSecret && PASTOR_SECRET && masterSecret.length === PASTOR_SECRET.length &&
      crypto.timingSafeEqual(Buffer.from(masterSecret), Buffer.from(PASTOR_SECRET));
    if (!secretMatch) return { statusCode: 403, headers: corsHeaders, body: JSON.stringify({ error: "Unauthorized" }) };

    const CAMPUSES = {
      "au-paradise": "Futures Paradise", "au-adelaide-city": "Futures Adelaide City",
      "au-salisbury": "Futures Salisbury", "au-south": "Futures South",
      "au-clare-valley": "Futures Clare Valley", "au-mount-barker": "Futures Mount Barker",
      "au-victor-harbor": "Futures Victor Harbor", "au-copper-coast": "Futures Copper Coast",
      "us-gwinnett": "Futures Gwinnett", "us-kennesaw": "Futures Kennesaw",
      "us-alpharetta": "Futures Alpharetta",
      "us-futuros-duluth": "Futuros Duluth", "us-futuros-kennesaw": "Futuros Kennesaw",
      "us-futuros-grayson": "Futuros Grayson", "us-franklin": "Futures Franklin",
      "id-solo": "Futures Solo", "id-cemani": "Futures Cemani",
      "id-bali": "Futures Bali", "id-samarinda": "Futures Samarinda",
      "id-langowan": "Futures Langowan",
      "br-rio": "Futures Rio"
    };

    const codes = Object.entries(CAMPUSES).map(([id, name]) => ({
      campusId: id, name, code: generateCode(id)
    }));

    return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ codes }) };
  }

  return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: "Unknown action" }) };
};
