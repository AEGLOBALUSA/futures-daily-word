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

  // Get current hashes
  const { data } = await db
    .from("profiles")
    .select("session_token_hashes")
    .eq("email", email)
    .single();

  let hashes = Array.isArray(data?.session_token_hashes) ? [...data.session_token_hashes] : [];
  hashes.push(hash);

  // Cap at 5 tokens (oldest first — keep the 5 most recent)
  if (hashes.length > 5) hashes = hashes.slice(-5);

  await db
    .from("profiles")
    .update({ session_token_hashes: hashes })
    .eq("email", email);

  return raw;
}

module.exports = { hashToken, generateToken, authenticateRequest, issueToken };
