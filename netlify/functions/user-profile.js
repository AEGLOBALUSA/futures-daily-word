const { getStore } = require("@netlify/blobs");
const crypto = require("crypto");

const ALLOWED_ORIGINS = [
  "https://futures-daily-word.netlify.app",
  "http://localhost:8888",
  "http://localhost:3000"
];

function hashEmail(email) {
  return crypto.createHash("sha256").update(email.toLowerCase().trim()).digest("hex").slice(0, 48);
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
    const { action } = body;
    const store = getStore("user-profiles");

    // ── Register ──
    if (action === "register") {
      const { firstName, lastName, email, phone, church, city, persona, lang, pushEnabled } = body;
      if (!email) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: "Email is required" }) };
      }
      // Basic email validation
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid email address" }) };
      }
      const key = hashEmail(email);
      const existing = await store.get(key, { type: "json" }).catch(() => null);
      const record = {
        firstName: (existing && existing.firstName) || (firstName || "").trim(),
        lastName: (existing && existing.lastName) || (lastName || "").trim(),
        email: email.toLowerCase().trim(),
        phone: (phone || "").trim(),
        church: (church || "").trim(),
        city: (city || "").trim(),
        persona: persona || "",
        lang: lang || "en",
        pushEnabled: !!pushEnabled,
        registeredAt: existing ? existing.registeredAt : new Date().toISOString(),
        lastActiveAt: new Date().toISOString()
      };
      await store.setJSON(key, record);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, message: "Profile saved", profile: { firstName: record.firstName, lastName: record.lastName, email: record.email } })
      };
    }

    // ── Update ──
    if (action === "update") {
      const { email } = body;
      if (!email) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: "Email required" }) };
      }
      const key = hashEmail(email);
      const existing = await store.get(key, { type: "json" }).catch(() => null);
      if (!existing) {
        return { statusCode: 404, headers, body: JSON.stringify({ error: "Profile not found" }) };
      }
      // Merge updates
      const fields = ["firstName", "lastName", "phone", "church", "city", "persona", "lang", "pushEnabled"];
      for (const f of fields) {
        if (body[f] !== undefined) {
          existing[f] = typeof body[f] === "string" ? body[f].trim() : body[f];
        }
      }
      existing.lastActiveAt = new Date().toISOString();
      await store.setJSON(key, existing);
      return { statusCode: 200, headers, body: JSON.stringify({ success: true, message: "Profile updated" }) };
    }

    // ── Heartbeat (lightweight lastActiveAt update) ──
    if (action === "heartbeat") {
      const { email } = body;
      if (!email) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: "Email required" }) };
      }
      const key = hashEmail(email);
      const existing = await store.get(key, { type: "json" }).catch(() => null);
      if (!existing) {
        return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
      }
      existing.lastActiveAt = new Date().toISOString();
      if (body.persona) existing.persona = body.persona;
      if (body.lang) existing.lang = body.lang;
      await store.setJSON(key, existing);
      return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
    }

    // ── Get ──
    if (action === "get") {
      const { email } = body;
      if (!email) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: "Email required" }) };
      }
      const key = hashEmail(email);
      const record = await store.get(key, { type: "json" }).catch(() => null);
      if (!record) {
        return { statusCode: 404, headers, body: JSON.stringify({ error: "Not found" }) };
      }
      return { statusCode: 200, headers, body: JSON.stringify({ success: true, profile: record }) };
    }

    return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid action" }) };
  } catch (err) {
    console.error("User profile error:", err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: "Server error" }) };
  }
};
