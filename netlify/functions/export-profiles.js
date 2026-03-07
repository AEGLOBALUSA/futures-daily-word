const { createClient } = require("@supabase/supabase-js");

let supabase;
function getSupabase() {
  if (!supabase) {
    supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  }
  return supabase;
}

exports.handler = async (event) => {
  // Auth check — accept token in query param OR Authorization header
  const queryToken = event.queryStringParameters && event.queryStringParameters.token;
  const authHeader = event.headers.authorization || event.headers.Authorization || "";
  const bearerToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  const token = queryToken || bearerToken;

  const secret = process.env.EXPORT_SECRET;
  if (!secret || token !== secret) {
    return { statusCode: 403, body: "Forbidden" };
  }

  try {
    const db = getSupabase();

    // Pagination support — ?page=0&limit=500 (default: 1000, max: 10000)
    const pageNum = parseInt(event.queryStringParameters?.page) || 0;
    const limit = Math.min(parseInt(event.queryStringParameters?.limit) || 1000, 10000);
    const offset = pageNum * limit;

    // Single SQL query with LEFT JOIN for activity stats — way faster than N+1
    const { data: profiles, error, count } = await db.from("profiles")
      .select("*", { count: "exact" })
      .order("last_active_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    // For each profile, get activity stats with a single aggregation query
    const emails = profiles.map(p => p.email);

    let activityStats = {};
    if (emails.length > 0) {
      // Get aggregated counts per email per event_type
      const { data: stats, error: statsErr } = await db.rpc("get_activity_stats", { email_list: emails });

      if (!statsErr && stats) {
        for (const row of stats) {
          if (!activityStats[row.email]) {
            activityStats[row.email] = { total: 0, book_open: 0, chapter_read: 0, search: 0, audio_play: 0, ai_chat: 0 };
          }
          activityStats[row.email][row.event_type] = row.cnt;
          activityStats[row.email].total += row.cnt;
        }
      }
    }

    // Build enriched profiles
    const enriched = profiles.map(p => {
      const s = activityStats[p.email] || {};
      return {
        firstName: p.first_name || "",
        lastName: p.last_name || "",
        email: p.email,
        phone: p.phone || "",
        church: p.church || "",
        city: p.city || "",
        persona: p.persona || "",
        lang: p.lang || "",
        pushEnabled: p.push_enabled || false,
        registeredAt: p.registered_at || "",
        lastActiveAt: p.last_active_at || "",
        totalActions: s.total || 0,
        booksOpened: s.book_open || 0,
        chaptersRead: s.chapter_read || 0,
        searches: s.search || 0,
        audioPlays: s.audio_play || 0,
        aiChats: s.ai_chat || 0
      };
    });

    const format = event.queryStringParameters && event.queryStringParameters.format;

    // JSON format
    if (format === "json") {
      const includeLog = event.queryStringParameters && event.queryStringParameters.log === "true";
      if (includeLog) {
        for (const p of enriched) {
          const { data: logs } = await db.from("activity_events")
            .select("event_type, detail, created_at")
            .eq("email", p.email)
            .order("created_at", { ascending: false })
            .limit(100);
          p.activityLog = (logs || []).map(l => ({ type: l.event_type, detail: l.detail, ts: l.created_at }));
        }
      }
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count: enriched.length, total: count, page: pageNum, profiles: enriched })
      };
    }

    // CSV format
    const csvFields = ["firstName", "lastName", "email", "phone", "church", "city", "persona", "lang", "pushEnabled", "registeredAt", "lastActiveAt", "totalActions", "booksOpened", "chaptersRead", "searches", "audioPlays", "aiChats"];
    const csvHeader = csvFields.join(",");
    const csvRows = enriched.map(p =>
      csvFields.map(f => {
        const val = p[f] !== undefined ? String(p[f]) : "";
        return val.includes(",") || val.includes('"') ? `"${val.replace(/"/g, '""')}"` : val;
      }).join(",")
    );
    const csv = [csvHeader, ...csvRows].join("\n");

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="daily-word-profiles-${new Date().toISOString().slice(0,10)}.csv"`
      },
      body: csv
    };
  } catch (err) {
    console.error("Export profiles error:", err);
    return { statusCode: 500, body: "Server error" };
  }
};
