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

// Sanitize string input — strip control chars, cap length
function sanitize(str, maxLen = 200) {
  if (typeof str !== "string") return "";
  return str.replace(/[\x00-\x1F\x7F]/g, "").trim().slice(0, maxLen);
}

// Simple in-memory rate limit per IP (per function instance)
const ipHits = {};
function checkRateLimit(ip, maxPerMin = 30) {
  const now = Date.now();
  if (!ipHits[ip]) ipHits[ip] = [];
  ipHits[ip] = ipHits[ip].filter(t => now - t < 60000);
  if (ipHits[ip].length >= maxPerMin) return true;
  ipHits[ip].push(now);
  // Cleanup stale IPs
  if (Object.keys(ipHits).length > 500) {
    for (const k of Object.keys(ipHits)) {
      if (ipHits[k].every(t => now - t >= 60000)) delete ipHits[k];
    }
  }
  return false;
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

  // Rate limit
  const clientIP = event.headers?.["x-forwarded-for"]?.split(",")[0]?.trim() || "unknown";
  if (checkRateLimit(clientIP)) {
    return { statusCode: 429, headers, body: JSON.stringify({ error: "Too many requests" }) };
  }

  try {
    const body = JSON.parse(event.body);
    const { action } = body;
    const store = getStore({ name: "user-profiles", siteID: process.env.NETLIFY_SITE_ID || "", token: process.env.BLOB_TOKEN || "" });

    // ── Register ──
    if (action === "register") {
      const email = sanitize(body.email, 254).toLowerCase();
      if (!email) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: "Email is required" }) };
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid email address" }) };
      }
      const key = hashEmail(email);
      const existing = await store.get(key, { type: "json" }).catch(() => null);
      const record = {
        firstName: (existing && existing.firstName) || sanitize(body.firstName || "", 100),
        lastName: (existing && existing.lastName) || sanitize(body.lastName || "", 100),
        email: email,
        phone: sanitize(body.phone || "", 20),
        church: sanitize(body.church || "", 200),
        city: sanitize(body.city || "", 100),
        persona: sanitize(body.persona || "", 50),
        lang: sanitize(body.lang || "en", 5),
        pushEnabled: !!body.pushEnabled,
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
      const email = sanitize(body.email, 254).toLowerCase();
      if (!email) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: "Email required" }) };
      }
      const key = hashEmail(email);
      const existing = await store.get(key, { type: "json" }).catch(() => null);
      if (!existing) {
        return { statusCode: 404, headers, body: JSON.stringify({ error: "Profile not found" }) };
      }
      const fields = { firstName: 100, lastName: 100, phone: 20, church: 200, city: 100, persona: 50, lang: 5 };
      for (const [f, maxLen] of Object.entries(fields)) {
        if (body[f] !== undefined) {
          existing[f] = sanitize(body[f], maxLen);
        }
      }
      if (body.pushEnabled !== undefined) existing.pushEnabled = !!body.pushEnabled;
      existing.lastActiveAt = new Date().toISOString();
      await store.setJSON(key, existing);
      return { statusCode: 200, headers, body: JSON.stringify({ success: true, message: "Profile updated" }) };
    }

    // ── Heartbeat ──
    if (action === "heartbeat") {
      const email = sanitize(body.email, 254).toLowerCase();
      if (!email) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: "Email required" }) };
      }
      const key = hashEmail(email);
      const existing = await store.get(key, { type: "json" }).catch(() => null);
      if (!existing) {
        return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
      }
      existing.lastActiveAt = new Date().toISOString();
      if (body.persona) existing.persona = sanitize(body.persona, 50);
      if (body.lang) existing.lang = sanitize(body.lang, 5);
      await store.setJSON(key, existing);
      return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
    }

    // ── Get ──
    if (action === "get") {
      const email = sanitize(body.email, 254).toLowerCase();
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
