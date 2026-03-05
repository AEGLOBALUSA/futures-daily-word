const { getStore } = require("@netlify/blobs");

const ALLOWED_ORIGINS = [
  "https://futures-daily-word.netlify.app",
  "http://localhost:8888",
  "http://localhost:3000"
];

function hashEmail(email) {
  const str = email.toLowerCase().trim();
  return Buffer.from(str).toString("base64url").slice(0, 48);
}

exports.handler = async (event) => {
  const origin = event.headers.origin || event.headers.referer || "";
  const corsOrigin = ALLOWED_ORIGINS.find(o => origin.startsWith(o)) || ALLOWED_ORIGINS[0];
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

  try {
    const body = JSON.parse(event.body);
    const { email, events } = body;

    if (!email || !events || !Array.isArray(events) || events.length === 0) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "Email and events array required" }) };
    }

    const activityStore = getStore({ name: "user-activity", siteID: process.env.NETLIFY_SITE_ID || "", token: process.env.BLOB_TOKEN || "" });
    const profileStore = getStore({ name: "user-profiles", siteID: process.env.NETLIFY_SITE_ID || "", token: process.env.BLOB_TOKEN || "" });
    const key = hashEmail(email);

    // Get existing activity log (or start fresh)
    let log = await activityStore.get(key, { type: "json" }).catch(() => null);
    if (!log) {
      log = { email: email.toLowerCase().trim(), events: [], stats: {} };
    }

    // Append new events with timestamps
    const now = new Date().toISOString();
    for (const evt of events) {
      const entry = {
        type: evt.type,         // e.g. "book_open", "chapter_read", "search", "audio_play", "ai_chat", "plan_day"
        detail: evt.detail || "",  // e.g. book title, search query, passage ref
        ts: now
      };
      log.events.push(entry);

      // Update stats counters
      if (!log.stats[evt.type]) log.stats[evt.type] = 0;
      log.stats[evt.type]++;
    }

    // Keep only last 500 events to avoid bloating the blob
    if (log.events.length > 500) {
      log.events = log.events.slice(-500);
    }

    log.lastActivity = now;
    await activityStore.setJSON(key, log);

    // Also update lastActiveAt on the profile
    const profile = await profileStore.get(key, { type: "json" }).catch(() => null);
    if (profile) {
      profile.lastActiveAt = now;
      await profileStore.setJSON(key, profile);
    }

    return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
  } catch (err) {
    console.error("Track activity error:", err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: "Server error" }) };
  }
};
