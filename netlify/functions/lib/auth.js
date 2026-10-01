/**
 * Session Token Authentication Helper
 *
 * Provides token generation, hashing, and validation for the
 * email-gate auth model. Tokens are stored as SHA-256 hashes
 * in the profiles.session_token_hashes jsonb array.
 *
 * Three classes of token share that one array:
 *   - PROVEN   "<hash>"    promoted after the person typed the code we emailed
 *                          to that address. Every hash that existed before the
 *                          proof change is plain, so every device in use today
 *                          stays proven. Capped at 5 per profile.
 *   - FIRST    "r:<hash>"  issued to the device that first registered a NEW
 *                          email. It syncs straight away (it counts as proven),
 *                          but nobody has shown they own the inbox, so it is
 *                          provisional: the moment ANY device types a code for
 *                          that address, every "r:" entry for it is removed.
 *                          That closes the squat where an attacker registers
 *                          someone's address before they ever sign up. Capped
 *                          at 3 per profile.
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
const FIRST_PREFIX = "r:";
const MAX_PROVEN = 5;
const MAX_FIRST = 3;
const MAX_UNPROVEN = 3;
// Hard ceiling on unproven entries when every one of them has a live code and so
// may not be evicted (see issueToken).
const MAX_UNPROVEN_HARD = 5;

// An emailed code lives this long (email-proof.js CODE_TTL_MS). Kept here so
// issueToken can leave a token alone while its code is still live.
const CODE_TTL_MS = 10 * 60 * 1000;
/** rate_limit_hits key prefix under which the live codes of one token are stored. */
const proofCodePrefix = (hash) => `dwproof-code:${hash}:`;

const isUnproven = (h) => typeof h === "string" && h.startsWith(UNPROVEN_PREFIX);
const isFirst = (h) => typeof h === "string" && h.startsWith(FIRST_PREFIX);
const isPlain = (h) => !isUnproven(h) && !isFirst(h);

/** Keep only the newest `max` entries that satisfy `inClass`, leaving every other entry untouched. */
function capClass(hashes, inClass, max) {
  const idx = [];
  hashes.forEach((h, i) => { if (inClass(h)) idx.push(i); });
  if (idx.length <= max) return hashes;
  const drop = new Set(idx.slice(0, idx.length - max));
  return hashes.filter((_, i) => !drop.has(i));
}

/** True when this unproven token has an emailed code that is still live. Any error counts as "no". */
async function hasLiveCode(db, hash) {
  try {
    const since = new Date(Date.now() - CODE_TTL_MS).toISOString();
    const { count, error } = await db
      .from("rate_limit_hits")
      .select("*", { count: "exact", head: true })
      .like("key", proofCodePrefix(hash) + "%")
      .gte("created_at", since);
    return !error && count > 0;
  } catch {
    return false;
  }
}

/**
 * Trim the unproven class to MAX_UNPROVEN, oldest first, but never drop the
 * entry just added, and skip a token that has a live emailed code: otherwise a
 * stranger minting tokens for a reader's address (5/min/IP) pushes the reader's
 * pending token out between "email me the code" and typing it, and the reader
 * gets 409 token_gone. The ceiling is MAX_UNPROVEN_HARD, so a flood still cannot
 * grow the array without limit.
 */
async function capUnproven(db, hashes, justAdded) {
  const idx = [];
  hashes.forEach((h, i) => { if (isUnproven(h)) idx.push(i); });
  if (idx.length <= MAX_UNPROVEN) return hashes;
  const drop = new Set();
  let remaining = idx.length;
  for (const i of idx) {
    if (remaining <= MAX_UNPROVEN) break;
    if (hashes[i] === justAdded) continue;
    if (remaining <= MAX_UNPROVEN_HARD && await hasLiveCode(db, hashes[i].slice(UNPROVEN_PREFIX.length))) continue;
    drop.add(i);
    remaining--;
  }
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
 * PROVEN (see the header). Looks for the plain hash, then "r:<hash>" (the first
 * device of a new email: proven, but provisional), then "u:<hash>".
 *
 * @returns {{email: string, proven: boolean, provisional: boolean, hash: string}|null}
 */
async function authenticateSession(event, db) {
  const hash = bearerHash(event);
  if (!hash) return null;
  const provenEmail = await findByEntry(db, hash);
  if (provenEmail) return { email: provenEmail, proven: true, provisional: false, hash };
  const firstEmail = await findByEntry(db, FIRST_PREFIX + hash);
  if (firstEmail) return { email: firstEmail, proven: true, provisional: true, hash };
  const unprovenEmail = await findByEntry(db, UNPROVEN_PREFIX + hash);
  if (unprovenEmail) return { email: unprovenEmail, proven: false, provisional: false, hash };
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
 * entries are capped at 5; a first-device token (`first: true`, only for the
 * request that created the profile) is stored as "r:<hash>", capped at 3; an
 * unproven token is stored as "u:<hash>" and the "u:" entries are capped at 3
 * (a token with a live emailed code is not evicted, see capUnproven). The
 * classes never evict each other. Defaults to UNPROVEN: a caller has to say so
 * to hand out a trusted token.
 *
 * @returns {string} The raw token (to send to the frontend).
 */
async function issueToken(db, email, { proven = false, first = false } = {}) {
  const { raw, hash } = generateToken();
  const entry = first ? FIRST_PREFIX + hash : proven ? hash : UNPROVEN_PREFIX + hash;

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
    // A proven token means the person has been proved (today: a staff password
    // sign-in through intake sync_token). Like promoteToken, that ends every
    // "r:" token for the address: they were handed out with no proof, and one
    // may belong to someone who registered the address before its owner did.
    if (proven && !first) hashes = hashes.filter((h) => !isFirst(h));
    hashes.push(entry);
    if (first) hashes = capClass(hashes, isFirst, MAX_FIRST);
    else if (proven) hashes = capClass(hashes, isPlain, MAX_PROVEN);
    else hashes = await capUnproven(db, hashes, entry);

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
 * (so it counts as the newest proven token and the proven cap applies). It also
 * removes EVERY "r:" entry for the address: those were handed out with no proof,
 * and the person who just proved the inbox may not be the device that got one
 * (someone could have registered the address first). The real first device, if
 * it was theirs, costs one code on its next sync.
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

    let hashes = prev.filter((h) => h !== UNPROVEN_PREFIX + hash && !isFirst(h));
    hashes.push(hash);
    hashes = capClass(hashes, isPlain, MAX_PROVEN);

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
  promoteToken, migrateRequest, safeCompare, checkMigrationRate, bearerHash, UNPROVEN_PREFIX, FIRST_PREFIX,
  proofCodePrefix, CODE_TTL_MS,
};
