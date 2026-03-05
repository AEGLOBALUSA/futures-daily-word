const { getStore } = require("@netlify/blobs");

function hashEmail(email) {
  const str = email.toLowerCase().trim();
  return Buffer.from(str).toString("base64url").slice(0, 48);
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
    const profileStore = getStore({ name: "user-profiles", siteID: process.env.NETLIFY_SITE_ID || "", token: process.env.BLOB_TOKEN || "" });
    const activityStore = getStore({ name: "user-activity", siteID: process.env.NETLIFY_SITE_ID || "", token: process.env.BLOB_TOKEN || "" });

    // Pagination support — ?page=1&limit=500 (default: all)
    const pageNum = parseInt(event.queryStringParameters?.page) || 0;
    const limit = Math.min(parseInt(event.queryStringParameters?.limit) || 10000, 10000);

    // Collect all profile keys with pagination
    const allBlobs = [];
    let cursor = undefined;
    do {
      const listOpts = { paginate: true };
      if (cursor) listOpts.cursor = cursor;
      const page = await profileStore.list(listOpts);
      allBlobs.push(...(page.blobs || []));
      cursor = page.cursor || null;
    } while (cursor);

    // Apply page/limit
    const startIdx = pageNum * limit;
    const pageBlobs = allBlobs.slice(startIdx, startIdx + limit);

    // Fetch profiles in batches of 20 to avoid overwhelming Blobs
    const profiles = [];
    const BATCH_SIZE = 20;
    for (let i = 0; i < pageBlobs.length; i += BATCH_SIZE) {
      const batch = pageBlobs.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map(async (blob) => {
          const record = await profileStore.get(blob.key, { type: "json" });
          if (!record || !record.email) return null;

          // Fetch activity stats
          const actKey = hashEmail(record.email);
          const activity = await activityStore.get(actKey, { type: "json" }).catch(() => null);
          if (activity && activity.stats) {
            record.totalActions = Object.values(activity.stats).reduce((a, b) => a + b, 0);
            record.booksOpened = activity.stats.book_open || 0;
            record.chaptersRead = activity.stats.chapter_read || 0;
            record.searches = activity.stats.search || 0;
            record.audioPlays = activity.stats.audio_play || 0;
            record.aiChats = activity.stats.ai_chat || 0;
            record.lastActivity = activity.lastActivity || "";
          } else {
            record.totalActions = 0;
            record.booksOpened = 0;
            record.chaptersRead = 0;
            record.searches = 0;
            record.audioPlays = 0;
            record.aiChats = 0;
            record.lastActivity = "";
          }
          return record;
        })
      );

      for (const r of results) {
        if (r.status === 'fulfilled' && r.value) profiles.push(r.value);
      }
    }

    profiles.sort((a, b) => (b.lastActiveAt || "").localeCompare(a.lastActiveAt || ""));

    const format = event.queryStringParameters && event.queryStringParameters.format;

    // JSON format
    if (format === "json") {
      const includeLog = event.queryStringParameters && event.queryStringParameters.log === "true";
      if (includeLog) {
        for (const p of profiles) {
          const actKey = hashEmail(p.email);
          const activity = await activityStore.get(actKey, { type: "json" }).catch(() => null);
          p.activityLog = activity ? (activity.events || []).slice(-100) : []; // Last 100 events only
        }
      }
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count: profiles.length, total: allBlobs.length, page: pageNum, profiles })
      };
    }

    // CSV format
    const csvFields = ["firstName", "lastName", "email", "phone", "church", "city", "persona", "lang", "pushEnabled", "registeredAt", "lastActiveAt", "totalActions", "booksOpened", "chaptersRead", "searches", "audioPlays", "aiChats", "lastActivity"];
    const csvHeader = csvFields.join(",");
    const csvRows = profiles.map(p =>
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
