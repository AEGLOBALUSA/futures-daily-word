const { createClient } = require("@supabase/supabase-js");
const crypto = require("crypto");

const { ALLOWED_ORIGINS } = require('./lib/cors');

let supabase;
function getSupabase() {
  if (!supabase) {
    supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  }
  return supabase;
}

function hashEndpoint(endpoint) {
  return crypto.createHash("sha256").update(endpoint).digest("hex").slice(0, 64);
}

exports.handler = async (event) => {
  const origin = event.headers.origin || event.headers.referer || "";
  const corsOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  const headers = {
    "Access-Control-Allow-Origin": corsOrigin,
    "Access-Control-Allow-Methods": "POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json"
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers, body: "" };
  }

  if (event.httpMethod !== "POST" && event.httpMethod !== "DELETE") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  try {
    const body = JSON.parse(event.body);
    const { action, subscription, timezone, preferredHour, lang } = body;
    const db = getSupabase();

    if (action === "subscribe") {
      if (!subscription || !subscription.endpoint) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: "Missing subscription" }) };
      }
      const endpointHash = hashEndpoint(subscription.endpoint);

      const record = {
        endpoint_hash: endpointHash,
        subscription: subscription,
        timezone: timezone || "America/New_York",
        preferred_hour: preferredHour !== undefined ? preferredHour : 7,
        active: true,
        ...(lang ? { lang } : {}),
      };

      // Upsert — if same endpoint already exists, update it
      const { error } = await db.from("push_subscriptions")
        .upsert(record, { onConflict: "endpoint_hash" });

      if (error) throw error;
      return { statusCode: 200, headers, body: JSON.stringify({ success: true, message: "Subscribed" }) };
    }

    if (action === "unsubscribe") {
      if (!subscription || !subscription.endpoint) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: "Missing subscription" }) };
      }
      const endpointHash = hashEndpoint(subscription.endpoint);

      await db.from("push_subscriptions").delete().eq("endpoint_hash", endpointHash);
      return { statusCode: 200, headers, body: JSON.stringify({ success: true, message: "Unsubscribed" }) };
    }

    if (action === "update") {
      if (!subscription || !subscription.endpoint) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: "Missing subscription" }) };
      }
      const endpointHash = hashEndpoint(subscription.endpoint);

      const updates = {};
      if (timezone) updates.timezone = timezone;
      if (preferredHour !== undefined) updates.preferred_hour = preferredHour;
      if (lang) updates.lang = lang;

      if (Object.keys(updates).length > 0) {
        await db.from("push_subscriptions").update(updates).eq("endpoint_hash", endpointHash);
      }
      return { statusCode: 200, headers, body: JSON.stringify({ success: true, message: "Updated" }) };
    }

    return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid action" }) };
  } catch (err) {
    console.error("Push subscribe error:", err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: "Server error" }) };
  }
};
