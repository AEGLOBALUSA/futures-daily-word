/**
 * Campus pastor code — ONE derivation for every function that mints or checks it.
 *
 *   code = first 8 hex of SHA-256("<campusId>:<PASTOR_SECRET>"), upper-cased
 *
 * That is the form pastor-admin `list-codes` prints (what Ashley hands out) and
 * video-upload validates. analytics-dashboard used to derive from the SHORT slug
 * ("gwinnett", not "us-gwinnett"), so a code from the admin list never opened the
 * Campus Overview. Checking accepts BOTH forms so any slug-derived code already in
 * a pastor's hands keeps working; minting is always the full-id form.
 * No I/O — vitest requires this file too. Each function takes the loaded campus
 * list (lib/campuses.js loadCampuses) as its last argument, and uses the bundled
 * list when it is not given one.
 */
const crypto = require("crypto");
const { CAMPUS_IDS, isCampusId } = require("./intake-core");
const { campusIds } = require("./campuses");

function digest(input, secret) {
  return crypto.createHash("sha256").update(input + ":" + secret).digest("hex").slice(0, 8).toUpperCase();
}

/** Constant-time equality for two short strings. */
function safeEq(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || !a || !b || a.length !== b.length) return false;
  try { return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b)); } catch { return false; }
}

/** "us-gwinnett" → "gwinnett" (the legacy analytics-dashboard derivation input).
 *  Any two-letter region prefix (a campus the owner adds, e.g. "ve-"), so the
 *  slug is the same as before for every campus that existed when codes were cut. */
function campusSlug(campusId) {
  return String(campusId || "").replace(/^[a-z]{2}-/, "");
}

/** The canonical code for a campus, or null without a secret / for an unknown campus. */
function generateCampusCode(campusId, secret, list) {
  if (!secret || !isCampusId(campusId, list)) return null;
  return digest(campusId, secret);
}

/** Does `code` open `campusId`? Accepts the canonical (full-id) and legacy (slug) forms. */
function validateCampusCode(campusId, code, secret, list) {
  if (!secret || !code || !isCampusId(campusId, list)) return false;
  const c = String(code).trim().toUpperCase();
  return safeEq(digest(campusId, secret), c) || safeEq(digest(campusSlug(campusId), secret), c);
}

/** Which campus a code opens, or null. Always walks every campus (no early exit
 *  on the first byte — the compare inside is constant-time per campus). */
function campusForCode(code, secret, list) {
  if (!secret || !code) return null;
  let found = null;
  const ids = Array.isArray(list) && list.length ? campusIds(list) : CAMPUS_IDS;
  for (const id of ids) {
    if (validateCampusCode(id, code, secret, list) && !found) found = id;
  }
  return found;
}

module.exports = { generateCampusCode, validateCampusCode, campusForCode, campusSlug, safeEq };
