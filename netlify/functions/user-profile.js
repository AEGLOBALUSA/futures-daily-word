const { createClient } = require("@supabase/supabase-js");
const { authenticateRequest, issueToken, migrateRequest } = require("./lib/auth");

const ALLOWED_ORIGINS = [
  "https://futures-daily-word.netlify.app",
  "https://futuresdailyword.com",
  "https://www.futuresdailyword.com"
];

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
  if (Object.keys(ipHits).length > 500) {
    for (const k of Object.keys(ipHits)) {
      if (ipHits[k].every(t => now - t >= 60000)) delete ipHits[k];
    }
  }
  return false;
}

let supabase;
function getSupabase() {
  if (!supabase) {
    supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  }
  return supabase;
}

exports.handler = async (event) => {
  const origin = event.headers.origin || event.headers.referer || "";
  const corsOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  const headers = {
    "Access-Control-Allow-Origin": corsOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
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

  // Reject requests not from our app (prevents external abuse)
  if (!ALLOWED_ORIGINS.some(o => origin.startsWith(o))) {
    return { statusCode: 403, headers, body: JSON.stringify({ error: "Forbidden" }) };
  }

  if (!event.body) {
    return { statusCode: 400, headers, body: '{"error":"Missing request body"}' };
  }

  try {
    const body = JSON.parse(event.body);
    const { action } = body;
    const db = getSupabase();

    // ── Register ──
    if (action === "register") {
      const email = sanitize(body.email, 254).toLowerCase();
      if (!email) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: "Email is required" }) };
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid email address" }) };
      }

      const record = {
        email,
        first_name: sanitize(body.firstName || "", 100),
        last_name: sanitize(body.lastName || "", 100),
        phone: sanitize(body.phone || "", 20),
        church: sanitize(body.church || "", 200),
        city: sanitize(body.city || "", 100),
        campus: sanitize(body.campus || "", 100),
        persona: sanitize(body.persona || "", 50),
        lang: sanitize(body.lang || "en", 5),
        push_enabled: !!body.pushEnabled,
        last_active_at: new Date().toISOString()
      };

      // Upsert — insert or update on conflict
      const { data, error } = await db.from("profiles")
        .upsert(record, { onConflict: "email" })
        .select("first_name, last_name, email")
        .single();

      if (error) throw error;

      // Issue a session token on registration
      const sessionToken = await issueToken(db, data.email);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: "Profile saved",
          profile: { firstName: data.first_name, lastName: data.last_name, email: data.email },
          sessionToken
        })
      };
    }

    // ── Update ──
    if (action === "update") {
      let email = await authenticateRequest(event, db);
      let migrationToken = null;

      if (!email) {
        const migration = await migrateRequest(event, db, sanitize(body.email, 254));
        if (!migration) return { statusCode: 401, headers, body: JSON.stringify({ error: "Unauthorized" }) };
        email = migration.email;
        migrationToken = migration.token;
      }

      const updates = { last_active_at: new Date().toISOString() };
      const fieldMap = {
        firstName: ["first_name", 100],
        lastName: ["last_name", 100],
        phone: ["phone", 20],
        church: ["church", 200],
        city: ["city", 100],
        campus: ["campus", 100],
        persona: ["persona", 50],
        lang: ["lang", 5]
      };

      for (const [jsField, [dbField, maxLen]] of Object.entries(fieldMap)) {
        if (body[jsField] !== undefined) {
          updates[dbField] = sanitize(body[jsField], maxLen);
        }
      }
      if (body.pushEnabled !== undefined) updates.push_enabled = !!body.pushEnabled;

      const { data, error } = await db.from("profiles")
        .update(updates)
        .eq("email", email)
        .select("email");

      if (error) throw error;
      if (!data || data.length === 0) {
        return { statusCode: 404, headers, body: JSON.stringify({ error: "Profile not found" }) };
      }

      return { statusCode: 200, headers, body: JSON.stringify({ success: true, message: "Profile updated", ...(migrationToken ? { sessionToken: migrationToken } : {}) }) };
    }

    // ── Heartbeat ──
    if (action === "heartbeat") {
      let email = await authenticateRequest(event, db);
      let migrationToken = null;

      if (!email) {
        const migration = await migrateRequest(event, db, sanitize(body.email, 254));
        if (!migration) return { statusCode: 401, headers, body: JSON.stringify({ error: "Unauthorized" }) };
        email = migration.email;
        migrationToken = migration.token;
      }

      const updates = { last_active_at: new Date().toISOString() };
      if (body.persona) updates.persona = sanitize(body.persona, 50);
      if (body.lang) updates.lang = sanitize(body.lang, 5);
      if (body.campus) updates.campus = sanitize(body.campus, 100);

      await db.from("profiles").update(updates).eq("email", email);
      return { statusCode: 200, headers, body: JSON.stringify({ success: true, ...(migrationToken ? { sessionToken: migrationToken } : {}) }) };
    }

    // ── Get ──
    if (action === "get") {
      let email = await authenticateRequest(event, db);
      let migrationToken = null;

      if (!email) {
        // Migration / pre-registration lookup (rate-limited)
        const migration = await migrateRequest(event, db, sanitize(body.email, 254));
        if (!migration) {
          // Could be rate-limited or email doesn't exist — return 404 to avoid enumeration
          return { statusCode: 404, headers, body: JSON.stringify({ error: "Not found" }) };
        }
        email = migration.email;
        migrationToken = migration.token;
      }

      const { data, error } = await db.from("profiles")
        .select("first_name, last_name, email, phone, church, city, campus, persona, lang, push_enabled, registered_at, last_active_at")
        .eq("email", email).single();
      if (error || !data) {
        return { statusCode: 404, headers, body: JSON.stringify({ error: "Not found" }) };
      }

      const profile = {
        firstName: data.first_name,
        lastName: data.last_name,
        email: data.email,
        phone: data.phone,
        church: data.church,
        city: data.city,
        campus: data.campus,
        persona: data.persona,
        lang: data.lang,
        pushEnabled: data.push_enabled,
        registeredAt: data.registered_at,
        lastActiveAt: data.last_active_at
      };

      return { statusCode: 200, headers, body: JSON.stringify({ success: true, profile, ...(migrationToken ? { sessionToken: migrationToken } : {}) }) };
    }

    return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid action" }) };
  } catch (err) {
    console.error("User profile error:", err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: "Server error" }) };
  }
};
