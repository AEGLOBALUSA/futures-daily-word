const { createClient } = require("@supabase/supabase-js");
const { authenticateSession, issueToken, migrateRequest, checkMigrationRate } = require("./lib/auth");
const { sendProofCode, verifyProofCode } = require("./lib/email-proof");
const { clientIp } = require("./lib/client-ip");

const { ALLOWED_ORIGINS, isAllowedOrigin } = require('./lib/cors');

// Sanitize string input — strip control chars, cap length
function sanitize(str, maxLen = 200) {
  if (typeof str !== "string") return "";
  return str.replace(/[\x00-\x1F\x7F]/g, "").trim().slice(0, maxLen);
}

// Map any incoming persona to one of the 5 canonical values so writes never
// violate the profiles_persona_check constraint, regardless of client version.
const CANONICAL_PERSONAS = ["congregation", "deeper_study", "pastor_leader", "comfort", "new_to_faith"];
const PERSONA_ALIASES = {
  deeper: "deeper_study",
  pastor: "pastor_leader",
  "church leader": "pastor_leader",
  new_believer: "new_to_faith",
  new_returning: "new_to_faith",
  believer: "congregation",
  difficult: "comfort",
};
function coercePersona(raw) {
  const v = sanitize(raw || "", 50);
  if (CANONICAL_PERSONAS.includes(v)) return v;
  return PERSONA_ALIASES[v.toLowerCase()] || "congregation";
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

/**
 * Who is asking, and has that token been proven? A Bearer token wins; without
 * one the body email is migrated to a fresh UNPROVEN token (rate-limited).
 * Returns null when the caller cannot be identified at all.
 */
async function resolveCaller(event, db, body) {
  const session = await authenticateSession(event, db);
  if (session) return { email: session.email, proven: session.proven, migrationToken: null };
  const migration = await migrateRequest(event, db, sanitize(body.email, 254));
  if (!migration) return null;
  return { email: migration.email, proven: false, migrationToken: migration.token };
}

const tokenField = (caller) => (caller.migrationToken ? { sessionToken: caller.migrationToken } : {});

exports.handler = async (event) => {
  const origin = event.headers.origin || event.headers.referer || "";
  const corsOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  const headers = {
    "Access-Control-Allow-Origin": corsOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
    "Content-Type": "application/json"
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  // Rate limit
  // Netlify's own connection address, never a client-chosen x-forwarded-for
  // (lib/client-ip.js): this IP also feeds the register migration limit and the
  // proof-send per-IP cap.
  const clientIP = clientIp(event);
  if (checkRateLimit(clientIP)) {
    return { statusCode: 429, headers, body: JSON.stringify({ error: "Too many requests" }) };
  }

  // Reject requests not from our app (prevents external abuse)
  if (!isAllowedOrigin(origin)) {
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
        persona: coercePersona(body.persona),
        lang: sanitize(body.lang || "en", 5),
        push_enabled: !!body.pushEnabled,
        last_active_at: new Date().toISOString()
      };

      // Register is unauthenticated, so for an email that already has a
      // profile it must not overwrite anything. A failed existence read is an
      // error (500), never "no profile": treating it as "new" used to send this
      // request down the insert path and overwrite a proven reader's profile.
      const readExisting = async () => {
        const { data: row, error } = await db.from("profiles")
          .select("email, first_name, last_name, phone, church, city, campus, persona, lang")
          .eq("email", email)
          .maybeSingle();
        if (error) throw error;
        return row;
      };
      let existing = await readExisting();

      let data;
      if (!existing) {
        // New email — a plain insert, never an upsert: if another register for
        // the same address lands first (a race), the unique violation sends this
        // one down the existing-email branch below, so it still overwrites nothing.
        const { data: inserted, error } = await db.from("profiles")
          .insert(record)
          .select("first_name, last_name, email")
          .single();
        if (error && error.code === "23505") {
          existing = await readExisting();
          if (!existing) throw error;
        } else if (error) {
          throw error;
        } else {
          data = inserted;
        }
      }

      if (existing) {
        // Anyone can call register with any address, so an existing profile only
        // gets "this reader was active" — unless the caller holds a PROVEN,
        // non-provisional token for this same address. Only then may register
        // fill empty fields and turn push on: the same writes `update` and
        // `heartbeat` refuse to an unproven token.
        const updates = { last_active_at: record.last_active_at };
        const session = await authenticateSession(event, db);
        if (session && session.proven && !session.provisional && session.email === email) {
          for (const f of ["first_name", "last_name", "phone", "church", "city", "campus", "persona", "lang"]) {
            if (!existing[f] && record[f]) updates[f] = record[f];
          }
          if (body.pushEnabled === true) updates.push_enabled = true;
        }

        const { data: updated, error } = await db.from("profiles")
          .update(updates)
          .eq("email", email)
          .select("first_name, last_name, email")
          .single();
        if (error) throw error;
        data = updated;
      }

      // Token issuance.
      //  - NEW email: this request created the profile, so this device is the one
      //    that first registered it. It gets a FIRST-device token ("r:", see
      //    lib/auth.js), with no limiter, so a room of new readers on one church
      //    wifi never loses a token. It syncs straight away, but it is only
      //    provisional: nobody has shown they own the inbox, so the first time
      //    ANYONE types a code for this address every "r:" token is revoked. That
      //    is what stops someone registering a stranger's address before the
      //    stranger signs up and then reading their journal for ever.
      //  - EXISTING email: whoever is asking only knows the address. They get an
      //    UNPROVEN token under the migration limiter (5/min per IP) and prove
      //    the address by typing the emailed code before their journal opens.
      //    When limited, the profile still saves; the client just gets no token.
      let sessionToken = null;
      if (!existing) {
        try {
          sessionToken = await issueToken(db, data.email, { first: true });
        } catch (tokenErr) {
          console.error("Register token issuance failed:", tokenErr);
        }
      } else if (!checkMigrationRate(clientIP)) {
        try {
          sessionToken = await issueToken(db, data.email, { proven: false });
        } catch (tokenErr) {
          console.error("Register token issuance failed:", tokenErr);
        }
      }

      // For an EXISTING email the stored name is never returned (that would be an
      // unlimited name lookup for anyone who knows an address): echo back only
      // what this request itself sent.
      const echoed = existing
        ? { firstName: record.first_name, lastName: record.last_name, email }
        : { firstName: data.first_name, lastName: data.last_name, email: data.email };
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: "Profile saved",
          profile: echoed,
          ...(sessionToken ? { sessionToken } : {})
        })
      };
    }

    // ── Update ──
    if (action === "update") {
      const caller = await resolveCaller(event, db, body);
      if (!caller) return { statusCode: 401, headers, body: JSON.stringify({ error: "Unauthorized" }) };
      // An unproven token may not rewrite name, phone or campus.
      if (!caller.proven) {
        return { statusCode: 403, headers, body: JSON.stringify({ error: "proof_required", ...tokenField(caller) }) };
      }
      const email = caller.email;

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
      if (body.persona !== undefined) updates.persona = coercePersona(body.persona);
      if (body.pushEnabled !== undefined) updates.push_enabled = !!body.pushEnabled;

      const { data, error } = await db.from("profiles")
        .update(updates)
        .eq("email", email)
        .select("email");

      if (error) throw error;
      if (!data || data.length === 0) {
        return { statusCode: 404, headers, body: JSON.stringify({ error: "Profile not found" }) };
      }

      return { statusCode: 200, headers, body: JSON.stringify({ success: true, message: "Profile updated" }) };
    }

    // ── Heartbeat ──
    if (action === "heartbeat") {
      const caller = await resolveCaller(event, db, body);
      if (!caller) return { statusCode: 401, headers, body: JSON.stringify({ error: "Unauthorized" }) };
      const email = caller.email;
      const migrationToken = caller.migrationToken;

      const updates = { last_active_at: new Date().toISOString() };
      // Persona, language and campus writes wait for proof; an unproven token
      // only says "this reader was active".
      if (caller.proven) {
        if (body.persona) updates.persona = coercePersona(body.persona);
        if (body.lang) updates.lang = sanitize(body.lang, 5);
        if (body.campus) updates.campus = sanitize(body.campus, 100);
      }

      const { error: hbError } = await db.from("profiles").update(updates).eq("email", email);
      if (hbError) {
        console.error("Heartbeat error:", hbError);
        return { statusCode: 500, headers, body: JSON.stringify({ error: "Failed to update heartbeat" }) };
      }
      return { statusCode: 200, headers, body: JSON.stringify({ success: true, ...(migrationToken ? { sessionToken: migrationToken } : {}) }) };
    }

    // ── Get ──
    if (action === "get") {
      const caller = await resolveCaller(event, db, body);
      if (!caller) {
        // Could be rate-limited or email doesn't exist — return 404 to avoid enumeration
        return { statusCode: 404, headers, body: JSON.stringify({ error: "Not found" }) };
      }
      const email = caller.email;

      // An unproven token gets no profile fields (phone, church, city, campus).
      if (!caller.proven) {
        return { statusCode: 200, headers, body: JSON.stringify({ success: true, proofRequired: true, ...tokenField(caller) }) };
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

      return { statusCode: 200, headers, body: JSON.stringify({ success: true, profile }) };
    }

    // ── Proof of email: send / verify a one-time code ──
    // Both need a Bearer token and take the address FROM THE TOKEN, never the
    // body, so a code can only ever go to the address the token belongs to.
    if (action === "proof-send" || action === "proof-verify") {
      const session = await authenticateSession(event, db);
      if (!session) return { statusCode: 401, headers, body: JSON.stringify({ error: "Unauthorized" }) };
      if (session.proven) {
        return { statusCode: 200, headers, body: JSON.stringify({ success: true, alreadyProven: true }) };
      }

      if (action === "proof-send") {
        const { data: prof } = await db.from("profiles").select("lang").eq("email", session.email).maybeSingle();
        const sent = await sendProofCode(db, session.email, session.hash, prof && prof.lang, clientIP.slice(0, 64));
        if (!sent.ok) {
          return { statusCode: sent.status, headers, body: JSON.stringify({ success: false, error: sent.error }) };
        }
        return { statusCode: 200, headers, body: JSON.stringify({ success: true, sent: true }) };
      }

      const result = await verifyProofCode(db, session.email, session.hash, typeof body.code === "string" ? body.code.trim() : "");
      if (!result.ok) {
        return { statusCode: result.status, headers, body: JSON.stringify({ success: false, error: result.error }) };
      }
      return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
    }

    return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid action" }) };
  } catch (err) {
    console.error("User profile error:", err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: "Server error" }) };
  }
};
