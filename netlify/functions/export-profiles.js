const { createClient } = require("@supabase/supabase-js");
const crypto = require("crypto");

let supabase;
function getSupabase() {
  if (!supabase) {
    supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  }
  return supabase;
}

// Rate limiting: 1 request per minute per IP
const exportRateLimits = {};
function isExportRateLimited(ip) {
  const now = Date.now();
  const last = exportRateLimits[ip];
  if (last && now - last < 60000) return true;
  exportRateLimits[ip] = now;
  // Cleanup old entries
  for (const k of Object.keys(exportRateLimits)) {
    if (now - exportRateLimits[k] > 120000) delete exportRateLimits[k];
  }
  return false;
}

// Constant-time string comparison to prevent timing attacks
function safeEqual(a, b) {
  if (!a || !b) return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

exports.handler = async (event) => {
  // Auth check — ONLY accept token via Authorization header (never query string — leaks in logs)
  const authHeader = event.headers.authorization || event.headers.Authorization || "";
  const bearerToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

  const secret = process.env.EXPORT_SECRET;
  if (!secret || !safeEqual(bearerToken, secret)) {
    return { statusCode: 403, body: "Forbidden" };
  }

  // Rate limit: 1 export per minute per IP
  const clientIP = event.headers?.["x-forwarded-for"]?.split(",")[0]?.trim() || "unknown";
  if (isExportRateLimited(clientIP)) {
    return { statusCode: 429, body: "Too many requests. Try again in 1 minute." };
  }

  // Audit log
  console.log(`[AUDIT] Profile export by IP ${clientIP} at ${new Date().toISOString()}`);

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
        // Cap log enrichment to 50 profiles to prevent N+1 timeout under load
        const logProfiles = enriched.slice(0, 50);
        const logEmails = logProfiles.map(p => p.email);
        // Batch query: fetch all activity logs for capped set in one query
        const { data: allLogs } = await db.from("activity_events")
          .select("email, event_type, detail, created_at")
          .in("email", logEmails)
          .order("created_at", { ascending: false })
          .limit(5000);
        // Group logs by email
        const logsByEmail = {};
        for (const l of (allLogs || [])) {
          if (!logsByEmail[l.email]) logsByEmail[l.email] = [];
          if (logsByEmail[l.email].length < 100) {
            logsByEmail[l.email].push({ type: l.event_type, detail: l.detail, ts: l.created_at });
          }
        }
        for (const p of logProfiles) {
          p.activityLog = logsByEmail[p.email] || [];
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
        let val = p[f] !== undefined ? String(p[f]) : "";
        // Prevent CSV formula injection — prefix dangerous chars
        if (/^[=+\-@\t\r]/.test(val)) val = "'" + val;
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
