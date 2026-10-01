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
const { rateLimitIp, rateLimitKeyIp } = require("./client-ip");

// Migration rate limiter — prevent brute-force token issuance via email enumeration.
// Callers pass the rate-limit key (lib/client-ip.js rateLimitIp): an IPv6 caller's /64.
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
// Hard ceiling on unproven entries when every one of them is protected (a live
// code, or the newest mint from its IP in the last 10 minutes) and so may not be
// evicted: past it a new unproven mint is refused (see capUnproven).
const MAX_UNPROVEN_HARD = 5;

// An emailed code lives this long (email-proof.js CODE_TTL_MS). Kept here so
// issueToken can leave a token alone while its code is still live.
const CODE_TTL_MS = 10 * 60 * 1000;
/** rate_limit_hits key prefix under which the live codes of one token are stored. */
const proofCodePrefix = (hash) => `dwproof-code:${hash}:`;
// A freshly minted unproven token is left alone this long (within
// MAX_UNPROVEN_HARD), so a reader who has not asked for a code yet is not pushed
// out by three stranger tokens before they do. The grace is PER MINTING IP: only
// the newest mint from each IP (an IPv6 caller's /64) is protected, so one
// stranger polling from one connection holds at most one protected slot and can
// never fill the class with fresh tokens. Recorded as dwproof-mint:<hash>:<ip>.
const MINT_GRACE_MS = 10 * 60 * 1000;
const mintKey = (hash, ip) => `dwproof-mint:${hash}:${ip}`;
const mintPrefix = (hash) => `dwproof-mint:${hash}`;

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

/** True when rate_limit_hits has a row matching `pattern` (LIKE) newer than `windowMs`. Any error counts as "no". */
async function hasRecentRow(db, pattern, windowMs) {
  try {
    const since = new Date(Date.now() - windowMs).toISOString();
    const { count, error } = await db
      .from("rate_limit_hits")
      .select("*", { count: "exact", head: true })
      .like("key", pattern)
      .gte("created_at", since);
    return !error && count > 0;
  } catch {
    return false;
  }
}

/** True when this unproven token has an emailed code that is still live. Any error counts as "no". */
const hasLiveCode = (db, hash) => hasRecentRow(db, proofCodePrefix(hash) + "%", CODE_TTL_MS);

/**
 * This unproven token's mint inside MINT_GRACE_MS, as { ip, at }, or null when
 * it has none (or on any error). A row written before the grace was per IP
 * (dwproof-mint:<hash>, no IP) counts as its own IP.
 */
async function recentMint(db, hash) {
  try {
    const since = new Date(Date.now() - MINT_GRACE_MS).toISOString();
    const { data, error } = await db
      .from("rate_limit_hits")
      .select("key, created_at")
      .like("key", `${mintPrefix(hash)}%`)
      .gte("created_at", since);
    if (error || !Array.isArray(data) || data.length === 0) return null;
    const row = data.reduce((a, b) => (String(b.created_at) > String(a.created_at) ? b : a));
    const rest = String(row.key).slice(mintPrefix(hash).length);
    return { ip: rest.startsWith(":") ? rest.slice(1) : `legacy:${hash}`, at: String(row.created_at) };
  } catch {
    return null;
  }
}

/**
 * Trim the unproven class to MAX_UNPROVEN, oldest first, but never drop the
 * entry just added, and leave alone a token that has a live emailed code or is
 * the NEWEST mint from its IP in the last 10 minutes: otherwise a stranger
 * minting tokens for a reader's address pushes the reader's pending token out
 * before they ask for a code, or between "email me the code" and typing it, and
 * the reader gets 409 token_gone. Only the newest mint per IP is protected (the
 * entry just added is the newest from `addedIp`), so a stranger's older mints
 * from the same connection drop to unprotected and go first: one stranger IP
 * holds at most one recency-protected slot. A protected token is never dropped
 * to make room: when the class would still be above the ceiling
 * MAX_UNPROVEN_HARD once every unprotected entry above MAX_UNPROVEN is gone (so
 * every remaining one has a live code or is the newest mint of a distinct IP),
 * the new mint is REFUSED instead (returns null, issueToken throws and its
 * callers hand out no token). A flood still cannot grow the array.
 *
 * @returns {Promise<string[]|null>} the trimmed array, or null to refuse the mint.
 */
async function capUnproven(db, hashes, justAdded, addedIp) {
  const idx = [];
  hashes.forEach((h, i) => { if (isUnproven(h)) idx.push(i); });
  if (idx.length <= MAX_UNPROVEN) return hashes;
  // 0 = unprotected, 1 = newest recent mint from its IP, 2 = live code. The
  // entry just added has no tier and is never dropped.
  const tier = new Map();
  const mints = new Map(); // index -> { ip, at } for recency-only candidates
  for (const i of idx) {
    if (hashes[i] === justAdded) continue;
    const h = hashes[i].slice(UNPROVEN_PREFIX.length);
    if (await hasLiveCode(db, h)) { tier.set(i, 2); continue; }
    const m = await recentMint(db, h);
    tier.set(i, m ? 1 : 0);
    if (m) mints.set(i, m);
  }
  // Only the newest mint per IP keeps its grace; the entry just added is the
  // newest from its own IP. Ties go to the later position in the array.
  const newest = new Map(); // ip -> index
  for (const [i, m] of mints) {
    if (m.ip === addedIp) { tier.set(i, 0); continue; }
    const j = newest.get(m.ip);
    if (j === undefined) { newest.set(m.ip, i); continue; }
    const mj = mints.get(j);
    const iNewer = m.at > mj.at || (m.at === mj.at && i > j);
    tier.set(iNewer ? j : i, 0);
    if (iNewer) newest.set(m.ip, i);
  }
  const drop = new Set();
  let remaining = idx.length;
  const dropTier = (t, floor) => {
    for (const i of idx) {
      if (remaining <= floor) return;
      if (tier.get(i) === t && !drop.has(i)) { drop.add(i); remaining--; }
    }
  };
  dropTier(0, MAX_UNPROVEN);
  if (remaining > MAX_UNPROVEN_HARD) return null;
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
 * (a token with a live emailed code, or the newest one minted from its IP in
 * the last 10 minutes, is not evicted; when every slot up to 5 is held by such
 * a token the new unproven mint throws, see capUnproven). `ip` is the minting
 * caller's address (reduced to its rate-limit key, so an IPv6 /64), recorded
 * with an unproven mint; callers that serve a request pass it. The
 * classes never evict each other. Defaults to UNPROVEN: a caller has to say so
 * to hand out a trusted token.
 *
 * @returns {string} The raw token (to send to the frontend).
 */
async function issueToken(db, email, { proven = false, first = false, ip = "unknown" } = {}) {
  const { raw, hash } = generateToken();
  const mintIp = rateLimitKeyIp(ip);

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
    // Decided on every (re-)read: a first-device token only exists while nobody
    // has proved the address. If a proven token landed meanwhile (the owner
    // signed in, or typed a code, between our read and write), this request is
    // no longer the first device and gets an UNPROVEN token instead.
    const isFirstDevice = first && !(prev || []).some(isPlain);
    const entry = isFirstDevice ? FIRST_PREFIX + hash : proven ? hash : UNPROVEN_PREFIX + hash;
    let hashes = prev ? [...prev] : [];
    // A proven token means the person has been proved (today: a staff password
    // sign-in through intake sync_token). Like promoteToken, that ends every
    // "r:" token for the address: they were handed out with no proof, and one
    // may belong to someone who registered the address before its owner did.
    if (proven && !first) hashes = hashes.filter((h) => !isFirst(h));
    hashes.push(entry);
    if (isFirstDevice) hashes = capClass(hashes, isFirst, MAX_FIRST);
    else if (proven) hashes = capClass(hashes, isPlain, MAX_PROVEN);
    else {
      hashes = await capUnproven(db, hashes, entry, mintIp);
      // Every unproven slot is held by a token with a live code or the newest
      // recent mint of another IP: no token, rather than pushing out a reader's own.
      if (!hashes) throw new Error("Cannot issue token: unproven tokens at their ceiling");
    }

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
      // The guarded update itself failed (not a CAS miss). Fail closed, as
      // promoteToken does: there is NO unguarded fallback write. `hashes` was
      // built from a read that may now be stale, and writing it blind could
      // bring back an "r:" token that a proof revoked in the meantime (a
      // squatter's, which would then read the owner's journal) and drop the
      // owner's freshly proven token. Every caller already catches this.
      console.error("issueToken CAS update error:", updateErr.message);
      throw new Error("Failed to store token");
    }
    if (updated && updated.length > 0) {
      if (isUnproven(entry)) {
        // Best effort: the mint record only buys this token a few minutes'
        // grace in capUnproven. A failure here just means no grace.
        try { await db.from("rate_limit_hits").insert({ key: mintKey(hash, mintIp) }); } catch { /* grace only */ }
      }
      return raw;
    }
    // Zero rows matched — a concurrent issue landed between our read and
    // write. Loop to re-read the fresh array and append onto it.
  }

  throw new Error("Failed to store token: concurrent update conflict");
}

/**
 * Staff sign-in on a device that already holds a cloud token for the staff
 * address: put a proven token in THAT token's slot instead of adding another,
 * so repeated sign-ins on one device do not fill the proven cap (5) and push
 * out the person's other devices.
 *   - the plain hash is already there: nothing to rotate (every "r:" is still
 *     removed) and the same raw token is handed back;
 *   - "u:<hash>" or "r:<hash>": ROTATED, never promoted in place. Those tokens
 *     were handed out with no proof, so someone else may hold a copy (a stranger
 *     who typed the address on a shared device, a squatter who registered it
 *     first). The old entry and every "r:" are removed and a freshly generated
 *     token is appended as the newest proven entry, as promoteToken does, so the
 *     planted copy dies and the token count stays the same;
 *   - not in this profile at all: returns null and the caller issues a new token.
 * A compare-and-swap on the array, like promoteToken. Fails closed: a database
 * error throws "Failed to store token" (sync_token answers { token: null }).
 *
 * @param {string} raw the raw token the device holds.
 * @returns {Promise<string|null>} the raw proven token the device must keep, or
 *   null when `raw` is not a token of this profile.
 */
async function claimProvenToken(db, email, raw) {
  const hash = hashToken(raw);
  for (let attempt = 0; attempt < 4; attempt++) {
    const { data, error } = await db
      .from("profiles")
      .select("session_token_hashes")
      .eq("email", email)
      .single();
    if (error || !data) throw new Error("Failed to store token");
    const prev = Array.isArray(data.session_token_hashes) ? data.session_token_hashes : [];

    let hashes;
    let result;
    if (prev.includes(hash)) {
      if (!prev.some(isFirst)) return raw;
      hashes = prev.filter((h) => !isFirst(h));
      result = raw;
    } else if (prev.includes(UNPROVEN_PREFIX + hash) || prev.includes(FIRST_PREFIX + hash)) {
      const fresh = generateToken();
      hashes = prev.filter((h) => h !== UNPROVEN_PREFIX + hash && !isFirst(h));
      hashes.push(fresh.hash);
      hashes = capClass(hashes, isPlain, MAX_PROVEN);
      result = fresh.raw;
    } else {
      return null;
    }

    const { data: updated, error: updateErr } = await db
      .from("profiles")
      .update({ session_token_hashes: hashes })
      .eq("email", email)
      .eq("session_token_hashes", JSON.stringify(prev))
      .select("email");
    if (updateErr) {
      console.error("claimProvenToken update error:", updateErr.message);
      throw new Error("Failed to store token");
    }
    if (updated && updated.length > 0) return result;
    // CAS miss — a concurrent token change landed; re-read and retry.
  }
  throw new Error("Failed to store token: concurrent update conflict");
}

/**
 * Staff sign-out on a device: remove that device's cloud token from the staff
 * address's profile, in whichever form it is stored (plain, "u:" or "r:"), so a
 * sign-in later on the same device does not mint one more proven token that
 * pushes out the person's phone (the proven cap is 5). A compare-and-swap on the
 * array, like claimProvenToken. Only `email`'s own profile is ever touched; a
 * token that is not in it changes nothing.
 *
 * @param {string} raw the raw token the device holds.
 * @returns {Promise<boolean>} true when an entry was removed.
 */
async function revokeToken(db, email, raw) {
  const hash = hashToken(raw);
  const forms = new Set([hash, UNPROVEN_PREFIX + hash, FIRST_PREFIX + hash]);
  for (let attempt = 0; attempt < 4; attempt++) {
    const { data, error } = await db
      .from("profiles")
      .select("session_token_hashes")
      .eq("email", email)
      .single();
    if (error || !data) return false;
    const prev = Array.isArray(data.session_token_hashes) ? data.session_token_hashes : [];
    if (!prev.some((h) => forms.has(h))) return false;
    const hashes = prev.filter((h) => !forms.has(h));
    const { data: updated, error: updateErr } = await db
      .from("profiles")
      .update({ session_token_hashes: hashes })
      .eq("email", email)
      .eq("session_token_hashes", JSON.stringify(prev))
      .select("email");
    if (updateErr) throw new Error("Failed to revoke token");
    if (updated && updated.length > 0) return true;
    // CAS miss — a concurrent token change landed; re-read and retry.
  }
  throw new Error("Failed to revoke token: concurrent update conflict");
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
  // Keyed on the caller's /64 for IPv6, so one host cannot rotate addresses.
  const ip = rateLimitIp(event);
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
    const token = await issueToken(db, email, { proven: false, ip });
    return { email, token, proven: false };
  } catch {
    return null;
  }
}

module.exports = {
  hashToken, generateToken, authenticateRequest, authenticateSession, issueToken,
  promoteToken, claimProvenToken, revokeToken, migrateRequest, safeCompare, checkMigrationRate, bearerHash, UNPROVEN_PREFIX, FIRST_PREFIX,
  proofCodePrefix, CODE_TTL_MS, isPlain,
};
