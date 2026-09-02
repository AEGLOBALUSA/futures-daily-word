/**
 * Public current sermon for Sermon Notes on Home.
 * Published only when Ashley approves a hub intake submission.
 *
 * `?list=1` additionally serves the pastor Preach workspace's sermon archive
 * (past `published_sermons` rows, newest first) — same public read, same
 * table; the congregation already reads the current row with no auth, so a
 * bounded read of the historical rows needs none either.
 */
const { createClient } = require("@supabase/supabase-js");
const { getAllowedOrigin } = require("./lib/cors");

const LIST_LIMIT = 200;

let supabase;
function db() {
  if (!supabase) supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  return supabase;
}

exports.handler = async (event) => {
  const origin = event.headers.origin || event.headers.referer || "";
  const isList = !!(event.queryStringParameters && event.queryStringParameters.list);
  const headers = {
    "Access-Control-Allow-Origin": getAllowedOrigin(origin),
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
    "Cache-Control": isList ? "public, max-age=300" : "public, max-age=60"
  };

  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers, body: "" };
  if (event.httpMethod !== "GET") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  if (isList) {
    try {
      const { data, error } = await db()
        .from("published_sermons")
        .select("id, is_current, published_at, sermon")
        .order("published_at", { ascending: false })
        .limit(LIST_LIMIT);
      if (error) throw error;
      const sermons = (data || [])
        .filter((row) => row && row.sermon && typeof row.sermon.id === "string")
        .map((row) => ({
          id: row.id,
          is_current: !!row.is_current,
          published_at: row.published_at || null,
          sermon: row.sermon
        }));
      return { statusCode: 200, headers, body: JSON.stringify({ sermons }) };
    } catch (err) {
      console.error("published-sermon list", err);
      return { statusCode: 500, headers, body: JSON.stringify({ sermons: [] }) };
    }
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
