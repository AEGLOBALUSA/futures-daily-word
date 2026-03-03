const { getStore } = require("@netlify/blobs");

const ALLOWED_ORIGINS = [
  "https://futures-daily-word.netlify.app",
  "http://localhost:8888",
  "http://localhost:3000"
];

exports.handler = async (event) => {
  const origin = event.headers.origin || event.headers.referer || "";
  const corsOrigin = ALLOWED_ORIGINS.find(o => origin.startsWith(o)) || ALLOWED_ORIGINS[0];
  const headers = {
    "Access-Control-Allow-Origin": corsOrigin,
    "Access-Control-Allow-Methods": "POST, DELETE, OPTIONS",
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
    const { action, subscription, timezone, preferredHour } = body;
    const store = getStore("push-subscriptions");

    if (action === "subscribe") {
      if (!subscription || !subscription.endpoint) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: "Missing subscription" }) };
      }
      // Use a hash of the endpoint as the key
      const key = Buffer.from(subscription.endpoint).toString("base64url").slice(0, 64);
      const record = {
        subscription,
        timezone: timezone || "America/New_York",
        preferredHour: preferredHour !== undefined ? preferredHour : 7,
        subscribedAt: new Date().toISOString(),
        active: true
      };
      await store.setJSON(key, record);
      return { statusCode: 200, headers, body: JSON.stringify({ success: true, message: "Subscribed" }) };
    }

    if (action === "unsubscribe") {
      if (!subscription || !subscription.endpoint) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: "Missing subscription" }) };
      }
      const key = Buffer.from(subscription.endpoint).toString("base64url").slice(0, 64);
      try { await store.delete(key); } catch (e) { /* ok if not found */ }
      return { statusCode: 200, headers, body: JSON.stringify({ success: true, message: "Unsubscribed" }) };
    }

    if (action === "update") {
      // Update preferences (timezone, hour) without resubscribing
      if (!subscription || !subscription.endpoint) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: "Missing subscription" }) };
      }
      const key = Buffer.from(subscription.endpoint).toString("base64url").slice(0, 64);
      const existing = await store.get(key, { type: "json" }).catch(() => null);
      if (existing) {
        existing.timezone = timezone || existing.timezone;
        existing.preferredHour = preferredHour !== undefined ? preferredHour : existing.preferredHour;
        await store.setJSON(key, existing);
      }
      return { statusCode: 200, headers, body: JSON.stringify({ success: true, message: "Updated" }) };
    }

    return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid action" }) };
  } catch (err) {
    console.error("Push subscribe error:", err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: "Server error" }) };
  }
};
