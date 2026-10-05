const { createClient } = require("@supabase/supabase-js");
const crypto = require("crypto");

const { ALLOWED_ORIGINS } = require('./lib/cors');
const { stateUpdates } = require('./lib/push-v2.js');

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

      // B09-17: the device's own reading state (lib/push-v2.js stateUpdates):
      // a whitelist with length caps and type checks, and no identity of any
      // kind. A bad state refuses the whole request before anything is written.
      let reading = null;
      if (body.state !== undefined) {
        reading = stateUpdates(body.state);
        if (!reading.ok) {
          return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid state", reason: reading.error }) };
        }
      }

      const updates = {};
      if (timezone) updates.timezone = timezone;
      if (preferredHour !== undefined) updates.preferred_hour = preferredHour;
      if (lang) updates.lang = lang;

      if (Object.keys(updates).length > 0) {
        await db.from("push_subscriptions").update(updates).eq("endpoint_hash", endpointHash);
      }
      // Written apart from the fields above, so a reading-state write that fails
      // (for example before its migration is applied) never costs a reader her
      // hour or language change.
      if (reading && Object.keys(reading.updates).length > 0) {
        const { error: stateErr } = await db.from("push_subscriptions").update(reading.updates).eq("endpoint_hash", endpointHash);
        if (stateErr) console.error("Push subscribe: reading state not stored:", stateErr.code || "", stateErr.message || "");
      }
      return { statusCode: 200, headers, body: JSON.stringify({ success: true, message: "Updated" }) };
    }

    return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid action" }) };
  } catch (err) {
    console.error("Push subscribe error:", err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: "Server error" }) };
  }
};
