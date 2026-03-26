const { createClient } = require("@supabase/supabase-js");
const crypto = require("crypto");

// ── Config ──
const PASTOR_SECRET = process.env.PASTOR_SECRET || "";
const ALLOWED_ORIGINS = ["https://futuresdailyword.com", "https://www.futuresdailyword.com", "https://futures-daily-word.netlify.app"];
function getCorsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return { "Access-Control-Allow-Origin": allowed, "Access-Control-Allow-Headers": "Content-Type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
}

let supabase;
function getSupabase() {
  if (!supabase) supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  return supabase;
}

// Generate a pastor code for a campus: first 8 chars of SHA-256(campusId + secret)
function generateCode(campusId) {
  if (!PASTOR_SECRET) return null;
  return crypto.createHash("sha256").update(campusId + ":" + PASTOR_SECRET).digest("hex").slice(0, 8).toUpperCase();
}

// Validate a code against a campus (constant-time comparison)
function validateCode(campusId, code) {
  if (!PASTOR_SECRET || !code) return false;
  const expected = generateCode(campusId);
  if (!expected || expected.length !== code.toUpperCase().length) return false;
  try { return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(code.toUpperCase())); } catch { return false; }
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

  // ── Action: post ── Create content (requires valid code)
  if (action === "post") {
    const { type, title, content, author } = body;
    if (!campusId || !code) return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: "Missing campusId or code" }) };
    if (!validateCode(campusId, code)) return { statusCode: 403, headers: corsHeaders, body: JSON.stringify({ error: "Invalid code" }) };
    if (!type || !content) return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: "Missing type or content" }) };

    const validTypes = ["announcement", "sermon_note", "essay", "note", "prayer_point", "video"];
    if (!validTypes.includes(type)) return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: "Invalid type" }) };

    const db = getSupabase();
    const { data, error } = await db.from("campus_content").insert({
      campus: sanitize(campusId, 100),
      type: type,
      title: sanitize(title || "", 200),
      content: sanitize(content, 5000),
      author: sanitize(author || "Campus Pastor", 100)
    }).select();

    if (error) return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: "Failed to save" }) };
    return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ success: true, item: data[0] }) };
  }

  // ── Action: delete ── Remove content (requires valid code)
  if (action === "delete") {
    const { itemId } = body;
    if (!campusId || !code || !itemId) return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: "Missing fields" }) };
    if (!validateCode(campusId, code)) return { statusCode: 403, headers: corsHeaders, body: JSON.stringify({ error: "Invalid code" }) };

    const db = getSupabase();
    // Only delete content belonging to this campus
    const { error } = await db.from("campus_content").delete().eq("id", itemId).eq("campus", campusId);
    if (error) return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: "Failed to delete" }) };
    return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ success: true }) };
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
