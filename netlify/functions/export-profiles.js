const { getStore } = require("@netlify/blobs");

exports.handler = async (event) => {
  // Auth check
  const token = event.queryStringParameters && event.queryStringParameters.token;
  const secret = process.env.EXPORT_SECRET;
  if (!secret || token !== secret) {
    return { statusCode: 403, body: "Forbidden" };
  }

  try {
    const store = getStore("user-profiles");
    const { blobs } = await store.list();
    const profiles = [];

    for (const blob of blobs) {
      try {
        const record = await store.get(blob.key, { type: "json" });
        if (record && record.email) {
          profiles.push(record);
        }
      } catch (e) {
        // skip corrupt entries
      }
    }

    // Sort by most recently active
    profiles.sort((a, b) => (b.lastActiveAt || "").localeCompare(a.lastActiveAt || ""));

    // Build CSV
    const csvFields = ["firstName", "lastName", "email", "phone", "church", "city", "persona", "lang", "pushEnabled", "registeredAt", "lastActiveAt"];
    const csvHeader = csvFields.join(",");
    const csvRows = profiles.map(p =>
      csvFields.map(f => {
        const val = p[f] !== undefined ? String(p[f]) : "";
        // Escape commas and quotes
        return val.includes(",") || val.includes('"') ? `"${val.replace(/"/g, '""')}"` : val;
      }).join(",")
    );
    const csv = [csvHeader, ...csvRows].join("\n");

    const format = event.queryStringParameters && event.queryStringParameters.format;
    if (format === "json") {
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count: profiles.length, profiles })
      };
    }

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
