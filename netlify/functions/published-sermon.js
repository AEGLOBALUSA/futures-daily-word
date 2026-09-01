/**
 * Public current sermon for Sermon Notes on Home.
 * Published only when Ashley approves a hub intake submission.
 */
const { createClient } = require("@supabase/supabase-js");
const { getAllowedOrigin } = require("./lib/cors");

let supabase;
function db() {
  if (!supabase) supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  return supabase;
}

exports.handler = async (event) => {
  const origin = event.headers.origin || event.headers.referer || "";
  const headers = {
    "Access-Control-Allow-Origin": getAllowedOrigin(origin),
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
    "Cache-Control": "public, max-age=60"
  };

  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers, body: "" };
  if (event.httpMethod !== "GET") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  try {
    const { data, error } = await db()
      .from("published_sermons")
      .select("sermon")
      .eq("is_current", true)
      .maybeSingle();
    if (error) throw error;
    const sermon = data && data.sermon && typeof data.sermon.id === "string" ? data.sermon : null;
    return { statusCode: 200, headers, body: JSON.stringify({ sermon }) };
  } catch (err) {
    console.error("published-sermon", err);
    return { statusCode: 500, headers, body: JSON.stringify({ sermon: null }) };
  }
};
