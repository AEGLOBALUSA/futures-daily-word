const { createClient } = require("@supabase/supabase-js");

// ── Config ──
const ALLOWED_ORIGINS = [
  "https://futuresdailyword.com",
  "https://www.futuresdailyword.com",
  "http://localhost:5173",
  "http://localhost:4173",
];

function getCorsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Headers": "Content-Type, X-Pastor-Code",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  };
}

let supabase;
function getSupabase() {
  if (!supabase) supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  return supabase;
}

// Simple admin auth — reuse PASTOR_SECRET as the admin key
function isAdmin(event) {
  const code = (event.headers["x-pastor-code"] || "").toUpperCase();
  const secret = process.env.PASTOR_SECRET || "";
  if (!secret || !code) return false;
  // Admin code = first 8 chars of SHA-256("admin:" + secret)
  const crypto = require("crypto");
  const expected = crypto.createHash("sha256").update("admin:" + secret).digest("hex").slice(0, 8).toUpperCase();
  return code === expected;
}

exports.handler = async (event) => {
  const origin = event.headers.origin || "";
  const cors = getCorsHeaders(origin);

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: cors, body: "" };
  }

  const db = getSupabase();

  // ── POST: Submit a poll response ──
  if (event.httpMethod === "POST") {
    try {
      const body = JSON.parse(event.body || "{}");
      const { poll_version, campus, home_clutter, home_priority } = body;

      if (!home_clutter || !Array.isArray(home_priority)) {
        return { statusCode: 400, headers: cors, body: JSON.stringify({ error: "Missing required fields" }) };
      }

      // Validate home_clutter
      const validClutter = ["clean", "busy", "lost", "redesign"];
      if (!validClutter.includes(home_clutter)) {
        return { statusCode: 400, headers: cors, body: JSON.stringify({ error: "Invalid home_clutter value" }) };
      }

      // Validate home_priority (max 3)
      const validPriority = ["devotion", "campus", "events", "giving", "sermon", "prayer", "plan", "community"];
      const filtered = home_priority.filter(p => validPriority.includes(p)).slice(0, 3);

      const { error } = await db.from("poll_responses").insert({
        poll_version: poll_version || "v1",
        campus: campus || null,
        home_clutter,
        home_priority: filtered,
      });

      if (error) {
        console.error("Poll insert error:", error);
        return { statusCode: 500, headers: cors, body: JSON.stringify({ error: "Failed to save response" }) };
      }

      return { statusCode: 200, headers: cors, body: JSON.stringify({ ok: true }) };
    } catch (e) {
      console.error("Poll POST error:", e);
      return { statusCode: 500, headers: cors, body: JSON.stringify({ error: "Server error" }) };
    }
  }

  // ── GET: Fetch poll results (admin only) ──
  if (event.httpMethod === "GET") {
    if (!isAdmin(event)) {
      return { statusCode: 401, headers: cors, body: JSON.stringify({ error: "Unauthorized" }) };
    }

    try {
      const version = event.queryStringParameters?.version || "v1";

      // Fetch all responses for this version
      const { data: responses, error } = await db
        .from("poll_responses")
        .select("*")
        .eq("poll_version", version)
        .order("submitted_at", { ascending: false });

      if (error) {
        console.error("Poll fetch error:", error);
        return { statusCode: 500, headers: cors, body: JSON.stringify({ error: "Failed to fetch results" }) };
      }

      // Compute summaries server-side
      const total = responses.length;
      const today = new Date().toISOString().slice(0, 10);
      const todayCount = responses.filter(r => r.submitted_at?.slice(0, 10) === today).length;

      // Q1 summary
      const clutterCounts = {};
      responses.forEach(r => {
        clutterCounts[r.home_clutter] = (clutterCounts[r.home_clutter] || 0) + 1;
      });

      // Q2 summary
      const priorityCounts = {};
      responses.forEach(r => {
        (r.home_priority || []).forEach(p => {
          priorityCounts[p] = (priorityCounts[p] || 0) + 1;
        });
      });

      // Campus summary
      const campusCounts = {};
      responses.forEach(r => {
        const c = r.campus || "Unknown";
        campusCounts[c] = (campusCounts[c] || 0) + 1;
      });

      // Top priority
      const topPriority = Object.entries(priorityCounts).sort((a, b) => b[1] - a[1])[0];

      return {
        statusCode: 200,
        headers: { ...cors, "Content-Type": "application/json" },
        body: JSON.stringify({
          total,
          todayCount,
          campusCount: Object.keys(campusCounts).length,
          topPriority: topPriority ? topPriority[0] : null,
          clutterCounts,
          priorityCounts,
          campusCounts,
          version,
        }),
      };
    } catch (e) {
      console.error("Poll GET error:", e);
      return { statusCode: 500, headers: cors, body: JSON.stringify({ error: "Server error" }) };
    }
  }

  return { statusCode: 405, headers: cors, body: JSON.stringify({ error: "Method not allowed" }) };
};
