/**
 * Session Token Authentication Helper
 *
 * Provides token generation, hashing, and validation for the
 * email-gate auth model. Tokens are stored as SHA-256 hashes
 * in the profiles.session_token_hashes jsonb array (up to 5 per user).
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

/**
 * Authenticate a request by extracting the Bearer token from the
 * Authorization header, hashing it, and looking up the matching
 * profile in Supabase.
 *
 * @returns {string|null} The authenticated email, or null if invalid/missing.
 */
async function authenticateRequest(event, db) {
  const authHeader = event.headers.authorization || event.headers.Authorization || "";
  if (!authHeader.startsWith("Bearer ")) return null;

  const raw = authHeader.slice(7).trim();
  if (!raw || raw.length !== 64) return null;

  const hash = hashToken(raw);

  // Query: find profile where session_token_hashes contains this hash
  const { data, error } = await db
    .from("profiles")
    .select("email")
    .contains("session_token_hashes", [hash])
    .single();

  if (error || !data) return null;
  return data.email;
}

/**
 * Issue a new session token for an email. Appends the hash to
 * the session_token_hashes array, capped at 5 (removes oldest).
 *
 * @returns {string} The raw token (to send to the frontend).
 */
async function issueToken(db, email) {
  const { raw, hash } = generateToken();

  // Get current hashes — verify email exists first
  const { data, error } = await db
    .from("profiles")
    .select("session_token_hashes")
    .eq("email", email)
    .single();

  if (error || !data) {
    throw new Error("Cannot issue token: profile not found for " + email);
  }

  let hashes = Array.isArray(data.session_token_hashes) ? [...data.session_token_hashes] : [];
  hashes.push(hash);

  // Cap at 5 tokens (oldest first — keep the 5 most recent)
  if (hashes.length > 5) hashes = hashes.slice(-5);

  const { error: updateErr } = await db
    .from("profiles")
    .update({ session_token_hashes: hashes })
    .eq("email", email);

  if (updateErr) {
    throw new Error("Failed to store token: " + updateErr.message);
  }

  return raw;
}

/**
 * Migration helper: validates email exists and issues token, with rate limiting.
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
    const token = await issueToken(db, email);
    return { email, token };
  } catch {
    return null;
  }
}

module.exports = { hashToken, generateToken, authenticateRequest, issueToken, migrateRequest, safeCompare, checkMigrationRate };
