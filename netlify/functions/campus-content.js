const { createClient } = require("@supabase/supabase-js");
const { getAllowedOrigin } = require("./lib/cors");

let supabase;
function getSupabase() {
  if (!supabase) supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  return supabase;
}

exports.handler = async (event) => {
  const origin = event.headers.origin || event.headers.referer || "";
  const headers = {
    "Access-Control-Allow-Origin": getAllowedOrigin(origin),
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json"
  };

  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers, body: "" };

  const db = getSupabase();

  try {
    // GET - list campus content (public read for the campus corner)
    if (event.httpMethod === "GET") {
      const params = event.queryStringParameters || {};
      const campus = params.campus || "";

      if (!campus) return { statusCode: 400, headers, body: JSON.stringify({ error: "Campus required" }) };

      const { data, error } = await db.from("campus_content")
        .select("*")
        .eq("campus", campus)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;

      const items = (data || []).map(item => ({
        id: item.id,
        type: item.type || "note",
        title: item.title,
        content: item.content,
        author: item.author,
        date: item.created_at ? new Date(item.created_at).toLocaleDateString() : ""
      }));

      return { statusCode: 200, headers, body: JSON.stringify({ items }) };
    }

    // Live writes go through staff intake. Save publishes.
    if (event.httpMethod === "POST") {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({
          error: "Campus updates go through the staff form at /staff. Save puts them on the campus corner.",
          intake: "/staff"
        })
      };
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
  } catch (err) {
    console.error("Campus content error:", err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: "Server error" }) };
  }
};
