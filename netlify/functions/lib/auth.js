/**
 * Session Token Authentication Helper
 *
 * Provides token generation, hashing, and validation for the
 * email-gate auth model. Tokens are stored as SHA-256 hashes
 * in the profiles.session_token_hashes jsonb array.
 *
 * Two classes of token share that one array:
 *   - PROVEN   "<hash>"    issued to the device that first registered a NEW
 *                          email, or promoted after the person typed the code
 *                          we emailed to that address. Every hash that existed
 *                          before the proof change is plain, so every device in
 *                          use today stays proven. Capped at 5 per profile.
 *   - UNPROVEN "u:<hash>"  issued for an email that already had a profile
 *                          (migrate, or register of an existing email): the
 *                          caller only knew the address. It may identify the
 *                          caller (so the proof prompt can run) but it never
 *                          unlocks the journal, highlights, profile picture or
 *                          profile fields. Capped at 3 per profile, in its own
 *                          class, so a stranger can never evict a real device.
 *
 * No external dependencies — uses Node.js crypto only.
 */

const crypto = require("crypto");

// Migration rate limiter — prevent brute-force token issuance via email enumeration
const migrationHits = {};
function checkMigrationRate(ip, maxPerMin = 5) {
  const now = Date.now();
  if (!migrationHits[ip]) migrationHits[ip] = [];
  migrationHits[ip] = migrationHits[ip].filter(t => now - t < 60000);
  if (migrationHits[ip].length >= maxPerMin) return true;
  migrationHits[ip].push(now);
  // Cleanup old entries
  if (Object.keys(migrationHits).length > 200) {
    for (const k of Object.keys(migrationHits)) {
      if (migrationHits[k].every(t => now - t >= 60000)) delete migrationHits[k];
    }
  }
  return false;
}

/** Constant-time string comparison to prevent timing attacks */
function safeCompare(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

/** SHA-256 hash a raw token string → hex */
function hashToken(raw) {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

/** Generate a cryptographically random 64-char hex token */
function generateToken() {
  const raw = crypto.randomBytes(32).toString("hex");
  return { raw, hash: hashToken(raw) };
}

const UNPROVEN_PREFIX = "u:";
const MAX_PROVEN = 5;
const MAX_UNPROVEN = 3;

/** Keep only the newest `max` entries of one class, leaving the other class untouched. */
function capClass(hashes, unproven, max) {
  const idx = [];
  hashes.forEach((h, i) => {
    if ((typeof h === "string" && h.startsWith(UNPROVEN_PREFIX)) === unproven) idx.push(i);
  });
  if (idx.length <= max) return hashes;
  const drop = new Set(idx.slice(0, idx.length - max));
  return hashes.filter((_, i) => !drop.has(i));
}

/** The raw Bearer token's hash, or null when the header is missing or malformed. */
function bearerHash(event) {
  const headers = (event && event.headers) || {};
  const authHeader = headers.authorization || headers.Authorization || "";
  if (!authHeader.startsWith("Bearer ")) return null;
  const raw = authHeader.slice(7).trim();
  if (!raw || raw.length !== 64) return null;
  return hashToken(raw);
}

/** Look up the profile whose session_token_hashes contains `entry`. */
async function findByEntry(db, entry) {
  // session_token_hashes is jsonb, so the containment value must be passed as a
  // JSON string. Passing a JS array makes supabase-js emit PostgREST's ARRAY
  // literal form (cs.{hash}), which Postgres then fails to cast to jsonb —
  // "invalid input syntax for type json". The query errors, this function
  // returns null, and the caller silently treats the request as anonymous.
  const { data, error } = await db
    .from("profiles")
    .select("email")
    .contains("session_token_hashes", JSON.stringify([entry]))
    .single();
  if (error || !data) return null;
  return data.email;
}

/**
 * Authenticate a request by its Bearer token and say whether that token is
 * PROVEN (see the header). Looks for the plain hash first, then "u:<hash>".
 *
 * @returns {{email: string, proven: boolean, hash: string}|null}
 */
async function authenticateSession(event, db) {
  const hash = bearerHash(event);
  if (!hash) return null;
  const provenEmail = await findByEntry(db, hash);
  if (provenEmail) return { email: provenEmail, proven: true, hash };
  const unprovenEmail = await findByEntry(db, UNPROVEN_PREFIX + hash);
  if (unprovenEmail) return { email: unprovenEmail, proven: false, hash };
  return null;
}

/**
 * Authenticate by Bearer token for callers that only need to know WHO is
 * asking (activity tracking, PCO sync). Accepts either class of token. Anything
 * that unlocks a reader's private data must use authenticateSession and check
 * `proven`.
 *
 * @returns {string|null} The authenticated email, or null if invalid/missing.
 */
async function authenticateRequest(event, db) {
  const session = await authenticateSession(event, db);
  return session ? session.email : null;
}

/**
 * Issue a new session token for an email. Appends the hash to
 * the session_token_hashes array. A proven token is stored plain and the plain
 * entries are capped at 5; an unproven token is stored as "u:<hash>" and the
 * "u:" entries are capped at 3. The classes never evict each other.
 * Defaults to UNPROVEN: a caller has to say so to hand out a trusted token.
 *
 * @returns {string} The raw token (to send to the frontend).
 */
async function issueToken(db, email, { proven = false } = {}) {
  const { raw, hash } = generateToken();
  const entry = proven ? hash : UNPROVEN_PREFIX + hash;

  // Compare-and-swap append. Parallel startup calls (user-sync pull,
  // user-profile get, track-activity) each trigger migration concurrently;
  // a plain read-modify-write here loses tokens (last write wins), so the
  // client can store a hash that was never persisted and silently de-auth.
  // Guarding the update with the previously-read array value makes each
  // append atomic; on conflict we re-read and retry.
  for (let attempt = 0; attempt < 4; attempt++) {
    // Get current hashes — verify email exists first
    const { data, error } = await db
      .from("profiles")
      .select("session_token_hashes")
      .eq("email", email)
      .single();

    if (error || !data) {
      throw new Error("Cannot issue token: profile not found for " + email);
    }

    const prev = Array.isArray(data.session_token_hashes) ? data.session_token_hashes : null;
    let hashes = prev ? [...prev] : [];
    hashes.push(entry);
    hashes = capClass(hashes, !proven, proven ? MAX_PROVEN : MAX_UNPROVEN);

    let update = db
      .from("profiles")
      .update({ session_token_hashes: hashes })
      .eq("email", email);
    // CAS guard: only write if the array is unchanged since our read.
    // jsonb filter values must be passed as JSON strings (see findByEntry).
    update = prev === null
      ? update.is("session_token_hashes", null)
      : update.eq("session_token_hashes", JSON.stringify(prev));

    const { data: updated, error: updateErr } = await update.select("email");

    if (updateErr) {
      // The guarded update itself failed (not a CAS miss). Fall back to the
      // legacy unconditional write so token issuance never hard-breaks.
      console.error("issueToken CAS update error, falling back:", updateErr.message);
      const { error: plainErr } = await db
        .from("profiles")
        .update({ session_token_hashes: hashes })
        .eq("email", email);
      if (plainErr) throw new Error("Failed to store token: " + plainErr.message);
      return raw;
    }
    if (updated && updated.length > 0) {
      return raw;
    }
    // Zero rows matched — a concurrent issue landed between our read and
    // write. Loop to re-read the fresh array and append onto it.
  }

  throw new Error("Failed to store token: concurrent update conflict");
}

/**
 * Promote an unproven token to proven once the person has typed the emailed
 * code: a compare-and-swap that removes "u:<hash>" and appends the plain hash
 * (so it counts as the newest proven token and the proven cap applies).
 *
 * @returns {Promise<boolean>} true when the token is proven afterwards.
 */
async function promoteToken(db, email, hash) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const { data, error } = await db
      .from("profiles")
      .select("session_token_hashes")
      .eq("email", email)
      .single();
    if (error || !data || !Array.isArray(data.session_token_hashes)) return false;

    const prev = data.session_token_hashes;
    if (prev.includes(hash)) return true; // already proven
    if (!prev.includes(UNPROVEN_PREFIX + hash)) return false; // token was evicted

    let hashes = prev.filter((h) => h !== UNPROVEN_PREFIX + hash);
    hashes.push(hash);
    hashes = capClass(hashes, false, MAX_PROVEN);

    const { data: updated, error: updateErr } = await db
      .from("profiles")
      .update({ session_token_hashes: hashes })
      .eq("email", email)
      .eq("session_token_hashes", JSON.stringify(prev))
      .select("email");
    if (updateErr) {
      console.error("promoteToken update error:", updateErr.message);
      return false;
    }
    if (updated && updated.length > 0) return true;
    // CAS miss — a concurrent token change landed; re-read and retry.
  }
  return false;
}

/**
 * Migration helper: validates email exists and issues an UNPROVEN token, with
 * rate limiting. Knowing an address is not proof of owning it, so this token
 * identifies the caller but never unlocks private data (see the header).
 * Returns { email, token } or null if rate-limited/invalid.
 */
async function migrateRequest(event, db, bodyEmail) {
  const ip = event.headers?.["x-forwarded-for"]?.split(",")[0]?.trim() || "unknown";
  if (checkMigrationRate(ip)) return null; // Rate limited

  if (!bodyEmail || typeof bodyEmail !== "string") return null;
  const email = bodyEmail.toLowerCase().trim();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;

  // Verify the email exists in profiles
  const { data: existing, error } = await db
    .from("profiles")
    .select("email")
    .eq("email", email)
    .single();

  if (error || !existing) return null;

  try {
    const token = await issueToken(db, email, { proven: false });
    return { email, token, proven: false };
  } catch {
    return null;
  }
}

module.exports = {
  hashToken, generateToken, authenticateRequest, authenticateSession, issueToken,
  promoteToken, migrateRequest, safeCompare, checkMigrationRate, bearerHash, UNPROVEN_PREFIX,
};
