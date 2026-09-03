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
const { isCongregationId, normalizeCongregation, DEFAULT_CONGREGATION } = require("./lib/congregations");
// Weekly turnover (Ashley, 2 Sep 2026 night): a message stops being current on
// the next Sunday morning in its congregation's local time — decided HERE, at
// read time. Nothing is deleted; the archive keeps every row.
const { currentUntil, isCurrentAt } = require("./lib/sermon-window");

const LIST_LIMIT = 200;

let supabase;
function db() {
  if (!supabase) supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  return supabase;
}

exports.handler = async (event) => {
  const origin = event.headers.origin || event.headers.referer || "";
  const qs = event.queryStringParameters || {};
  const isList = !!qs.list;
  // ?congregation=futures-au — one current message per congregation. A missing
  // or unknown value reads Futures USA, so every existing reader keeps working.
  const congregation = normalizeCongregation(qs.congregation);
  const listAll = isList && !isCongregationId(qs.congregation);
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
      let q = db()
        .from("published_sermons")
        .select("id, is_current, published_at, sermon, congregation")
        .order("published_at", { ascending: false })
        .limit(LIST_LIMIT);
      if (!listAll) q = q.eq("congregation", congregation);
      const { data, error } = await q;
      if (error) throw error;
      const now = new Date();
      const sermons = (data || [])
        .filter((row) => row && row.sermon && typeof row.sermon.id === "string")
        .map((row) => ({
          id: row.id,
          // "current" means current TODAY: the database flag and inside its week.
          is_current: isCurrentAt(row, now),
          current_until: row.is_current ? currentUntil(row, now).toISOString() : null,
          published_at: row.published_at || null,
          congregation: row.congregation || DEFAULT_CONGREGATION,
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
      .select("sermon, published_at, congregation, is_current")
      .eq("is_current", true)
      .eq("congregation", congregation)
      .maybeSingle();
    if (error) throw error;
    const now = new Date();
    const live = !!(data && data.sermon && typeof data.sermon.id === "string");
    // Past its Sunday-morning turnover the row stays (archive, Sermon Prep's
    // list) but the congregation reads "no message this week".
    const current = live && isCurrentAt(data, now);
    const sermon = current ? data.sermon : null;
    const current_until = live ? currentUntil(data, now).toISOString() : null;
    return { statusCode: 200, headers, body: JSON.stringify({ sermon, congregation, current_until }) };
  } catch (err) {
    console.error("published-sermon", err);
    return { statusCode: 500, headers, body: JSON.stringify({ sermon: null }) };
  }
};
