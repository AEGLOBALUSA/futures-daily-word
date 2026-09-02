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
 * No I/O — vitest requires this file too.
 */
const crypto = require("crypto");
const { CAMPUS_IDS, isCampusId } = require("./intake-core");

function digest(input, secret) {
  return crypto.createHash("sha256").update(input + ":" + secret).digest("hex").slice(0, 8).toUpperCase();
}

/** Constant-time equality for two short strings. */
function safeEq(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || !a || !b || a.length !== b.length) return false;
  try { return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b)); } catch { return false; }
}

/** "us-gwinnett" → "gwinnett" (the legacy analytics-dashboard derivation input). */
function campusSlug(campusId) {
  return String(campusId || "").replace(/^(au|us|id|br)-/, "");
}

/** The canonical code for a campus, or null without a secret / for an unknown campus. */
function generateCampusCode(campusId, secret) {
  if (!secret || !isCampusId(campusId)) return null;
  return digest(campusId, secret);
}

/** Does `code` open `campusId`? Accepts the canonical (full-id) and legacy (slug) forms. */
function validateCampusCode(campusId, code, secret) {
  if (!secret || !code || !isCampusId(campusId)) return false;
  const c = String(code).trim().toUpperCase();
  return safeEq(digest(campusId, secret), c) || safeEq(digest(campusSlug(campusId), secret), c);
}

/** Which campus a code opens, or null. Always walks every campus (no early exit
 *  on the first byte — the compare inside is constant-time per campus). */
function campusForCode(code, secret) {
  if (!secret || !code) return null;
  let found = null;
  for (const id of CAMPUS_IDS) {
    if (validateCampusCode(id, code, secret) && !found) found = id;
  }
  return found;
}

module.exports = { generateCampusCode, validateCampusCode, campusForCode, campusSlug, safeEq };
