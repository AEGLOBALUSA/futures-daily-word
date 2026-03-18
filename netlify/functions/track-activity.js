const { createClient } = require("@supabase/supabase-js");

const ALLOWED_ORIGINS = [
  "https://futures-daily-word.netlify.app",
  "https://futuresdailyword.com",
  "https://www.futuresdailyword.com",
  "http://localhost:8888",
  "http://localhost:3000"
];

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
    "Access-Control-Allow-Headers": "Content-Type",
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

  // Reject requests not from our app
  if (!ALLOWED_ORIGINS.some(o => origin.startsWith(o))) {
    return { statusCode: 403, headers, body: JSON.stringify({ error: "Forbidden" }) };
  }

  try {
    const body = JSON.parse(event.body);
    const { email, events } = body;

    if (!email || !events || !Array.isArray(events) || events.length === 0) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "Email and events array required" }) };
    }
    // Cap at 50 events per request to prevent abuse
    if (events.length > 50) events.length = 50;

    const db = getSupabase();
    const cleanEmail = email.toLowerCase().trim();

    // Whitelist valid event types to prevent analytics pollution
    const VALID_EVENTS = [
      'book_open','chapter_read','search','scripture_search','audio_play','audio_stop',
      'ai_chat','ai_question','share','highlight_add','highlight_remove','journal_save',
      'journal_delete','version_switch','persona_change','language_change','chapter_change',
      'pathway_start','pathway_complete','pathway_lesson','push_subscribe','push_unsubscribe',
      'profile_update','profile_pic','login','heartbeat','app_open','page_view','tts_play'
    ];

    // Build rows to insert — filter to valid event types only
    const rows = events
      .filter(evt => evt.type && VALID_EVENTS.includes(evt.type))
      .map(evt => ({
        email: cleanEmail,
        event_type: evt.type,
        detail: typeof evt.detail === 'string' ? evt.detail.slice(0, 500) : ""
      }));

    if (rows.length === 0) {
      return { statusCode: 200, headers, body: JSON.stringify({ success: true, note: "No valid events" }) };
    }

    // Batch insert all activity events
    const { error: insertError } = await db.from("activity_events").insert(rows);
    if (insertError) throw insertError;

    // Also update lastActiveAt on the profile
    await db.from("profiles")
      .update({ last_active_at: new Date().toISOString() })
      .eq("email", cleanEmail);

    return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
  } catch (err) {
    console.error("Track activity error:", err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: "Server error" }) };
  }
};
