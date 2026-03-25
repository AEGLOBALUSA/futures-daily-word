const { createClient } = require("@supabase/supabase-js");

const ALLOWED_ORIGINS = [
  "https://futures-daily-word.netlify.app",
  "https://futuresdailyword.com",
  "https://www.futuresdailyword.com"
];

// 21 Futures campuses (8 AU + 7 US + 5 ID + 1 BR) + Non-Futures
const CAMPUSES={
  // Australia
  'au-paradise':'Futures Paradise','au-adelaide-city':'Futures Adelaide City',
  'au-salisbury':'Futures Salisbury','au-south':'Futures South',
  'au-clare-valley':'Futures Clare Valley','au-mount-barker':'Futures Mount Barker',
  'au-victor-harbor':'Futures Victor Harbor','au-copper-coast':'Futures Copper Coast',
  // North America
  'us-gwinnett':'Futures Gwinnett','us-kennesaw':'Futures Kennesaw',
  'us-alpharetta':'Futures Alpharetta',
  'us-futuros-duluth':'Futuros Duluth','us-futuros-kennesaw':'Futuros Kennesaw',
  'us-futuros-grayson':'Futuros Grayson','us-franklin':'Futures Franklin',
  // Indonesia
  'id-solo':'Futures Solo','id-cemani':'Futures Cemani',
  'id-bali':'Futures Bali','id-samarinda':'Futures Samarinda',
  'id-langowan':'Futures Langowan',
  // Brazil
  'br-rio':'Futures Rio',
  // Other
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

        // Atomic increment via RPC
        const { error } = await db.rpc("increment_prayer_count", { prayer_id: id });
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
