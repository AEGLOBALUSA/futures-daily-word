const { createClient } = require("@supabase/supabase-js");

const ALLOWED_ORIGINS = [
  "https://futures-daily-word.netlify.app",
  "https://futuresdailyword.com",
  "https://www.futuresdailyword.com",
  "http://localhost:8888"
];

// 21 campus slots + Non-Futures. Server-side lookup for prayer wall campus names.
const CAMPUSES={
  'futures-alpharetta':'Futures Alpharetta',
  'futures-bali':'Futures Bali',
  'futures-lagos':'Futures Lagos',
  'futures-london':'Futures London',
  'futures-online':'Futures Online',
  'campus-06':'Campus 6','campus-07':'Campus 7','campus-08':'Campus 8',
  'campus-09':'Campus 9','campus-10':'Campus 10','campus-11':'Campus 11',
  'campus-12':'Campus 12','campus-13':'Campus 13','campus-14':'Campus 14',
  'campus-15':'Campus 15','campus-16':'Campus 16','campus-17':'Campus 17',
  'campus-18':'Campus 18','campus-19':'Campus 19','campus-20':'Campus 20',
  'campus-21':'Campus 21',
  'other':'Non-Futures Church'
};

function sanitize(str, maxLen = 500) {
  if (typeof str !== "string") return "";
  return str.replace(/[\x00-\x1F\x7F]/g, "").trim().slice(0, maxLen);
}

let supabase;
function getSupabase() {
  if (!supabase) supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  return supabase;
}

// Simple rate limit
const ipHits = {};
function checkRate(ip, max = 20) {
  const now = Date.now();
  if (!ipHits[ip]) ipHits[ip] = [];
  ipHits[ip] = ipHits[ip].filter(t => now - t < 60000);
  if (ipHits[ip].length >= max) return true;
  ipHits[ip].push(now);
  return false;
}

function timeAgo(date) {
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return Math.floor(s / 60) + 'm ago';
  if (s < 86400) return Math.floor(s / 3600) + 'h ago';
  if (s < 604800) return Math.floor(s / 86400) + 'd ago';
  return new Date(date).toLocaleDateString();
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

  const clientIP = event.headers?.["x-forwarded-for"]?.split(",")[0]?.trim() || "unknown";
  if (checkRate(clientIP)) return { statusCode: 429, headers, body: JSON.stringify({ error: "Too many requests" }) };

  const db = getSupabase();

  try {
    // GET - list prayers
    if (event.httpMethod === "GET") {
      const params = event.queryStringParameters || {};
      const filter = params.filter || 'all';
      const campus = params.campus || '';

      let query = db.from("prayers").select("*").order("created_at", { ascending: false }).limit(50);
      if (filter === 'my-campus' && campus) {
        query = query.eq("campus", campus);
      }

      const { data, error } = await query;
      if (error) throw error;

      const prayers = (data || []).map(p => ({
        id: p.id,
        name: p.name,
        campus: p.campus,
        campusName: CAMPUSES[p.campus] || p.campus,
        prayer: p.prayer,
        prayerCount: p.prayer_count || 0,
        timeAgo: timeAgo(p.created_at),
        createdAt: p.created_at
      }));

      return { statusCode: 200, headers, body: JSON.stringify({ prayers }) };
    }

    // POST actions
    if (event.httpMethod === "POST") {
      const body = JSON.parse(event.body);

      if (body.action === 'create') {
        const prayer = sanitize(body.prayer, 500);
        const name = sanitize(body.name, 100) || 'Anonymous';
        const campus = sanitize(body.campus, 100);
        const email = sanitize(body.email, 254);

        if (!prayer) return { statusCode: 400, headers, body: JSON.stringify({ error: "Prayer text required" }) };

        const { error } = await db.from("prayers").insert({ prayer, name, campus, email, prayer_count: 0 });
        if (error) throw error;

        return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
      }

      if (body.action === 'pray') {
        const id = body.id;
        if (!id) return { statusCode: 400, headers, body: JSON.stringify({ error: "Prayer ID required" }) };

        // Increment prayer count
        const { data, error: getErr } = await db.from("prayers").select("prayer_count").eq("id", id).single();
        if (getErr) throw getErr;

        const { error } = await db.from("prayers").update({ prayer_count: (data.prayer_count || 0) + 1 }).eq("id", id);
        if (error) throw error;

        return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
      }

      return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid action" }) };
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
  } catch (err) {
    console.error("Prayer wall error:", err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: "Server error" }) };
  }
};
