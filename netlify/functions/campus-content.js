const { createClient } = require("@supabase/supabase-js");
const crypto = require("crypto");

const PASTOR_SECRET = process.env.PASTOR_SECRET || "";

const ALLOWED_ORIGINS = [
  "https://futures-daily-word.netlify.app",
  "https://futuresdailyword.com",
  "https://www.futuresdailyword.com",
  "http://localhost:8888"
];

function sanitize(str, maxLen = 2000) {
  if (typeof str !== "string") return "";
  return str.replace(/[\x00-\x1F\x7F]/g, "").trim().slice(0, maxLen);
}

// Validate campus pastor code: SHA-256(campusId:secret) first 8 chars uppercase
function validateCampusCode(campusId, code) {
  if (!PASTOR_SECRET || !code || !campusId) return false;
  const expected = crypto.createHash("sha256")
    .update(campusId + ":" + PASTOR_SECRET)
    .digest("hex").slice(0, 8).toUpperCase();
  return code.toUpperCase() === expected;
}

let supabase;
function getSupabase() {
  if (!supabase) supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  return supabase;
}

exports.handler = async (event) => {
  const origin = event.headers.origin || event.headers.referer || "";
  const corsOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  const headers = {
    "Access-Control-Allow-Origin": corsOrigin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json"
  };

  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers, body: "" };

  const db = getSupabase();

  try {
    // GET - list campus content
    if (event.httpMethod === "GET") {
      const params = event.queryStringParameters || {};
      const campus = params.campus || '';

      if (!campus) return { statusCode: 400, headers, body: JSON.stringify({ error: "Campus required" }) };

      const { data, error } = await db.from("campus_content")
        .select("*")
        .eq("campus", campus)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;

      const items = (data || []).map(item => ({
        id: item.id,
        type: item.type || 'note', // 'announcement', 'sermon_note', 'essay', 'note'
        title: item.title,
        content: item.content,
        author: item.author,
        date: item.created_at ? new Date(item.created_at).toLocaleDateString() : ''
      }));

      return { statusCode: 200, headers, body: JSON.stringify({ items }) };
    }

    // POST - add content (requires valid pastor code for the campus)
    if (event.httpMethod === "POST") {
      const body = JSON.parse(event.body);
      const { campus, type, title, content, author, code } = body;

      if (!campus || !title || !content) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: "Missing required fields" }) };
      }

      // Validate content type
      const validTypes = ["note", "announcement", "sermon_note", "essay", "prayer_point", "video"];
      if (type && !validTypes.includes(type)) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid content type" }) };
      }

      // Require valid pastor code for the campus
      if (!validateCampusCode(campus, code)) {
        return { statusCode: 403, headers, body: JSON.stringify({ error: "Invalid or missing pastor code" }) };
      }

      const { error } = await db.from("campus_content").insert({
        campus: sanitize(campus, 100),
        type: sanitize(type || 'note', 50),
        title: sanitize(title, 200),
        content: sanitize(content, 5000),
        author: sanitize(author || '', 100)
      });

      if (error) throw error;
      return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
  } catch (err) {
    console.error("Campus content error:", err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: "Server error" }) };
  }
};
