/**
 * Shared CORS configuration for all Netlify functions.
 * Single source of truth for allowed origins.
 */

const ALLOWED_ORIGINS = [
  'https://futures-daily-word.netlify.app',
  'https://www.futures-daily-word.netlify.app',
  'https://futuresdailyword.com',
  'https://www.futuresdailyword.com',
  // Church site origins — for when the app is embedded/proxied through the
  // Futures Church site and makes cross-origin calls to the Daily Word backend.
  // futures.church = post-cutover canonical; futures-church.netlify.app = the
  // church site's current live origin during the cutover hold.
  'https://futures.church',
  'https://www.futures.church',
  'https://futures.global',
  'https://www.futures.global',
  'https://futures-church.netlify.app'
];

/**
 * Returns the matching CORS origin header value.
 * Falls back to the primary origin if the request origin isn't in the list.
 */
function getAllowedOrigin(origin) {
  return ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
}

/** Parse Origin (or Referer URL) into an origin string for allowlist checks. */
function parseRequestOrigin(originOrReferer) {
  if (!originOrReferer) return '';
  if (!originOrReferer.includes('://')) return originOrReferer;
  try {
    return new URL(originOrReferer).origin;
  } catch {
    return '';
  }
}

/** Exact-match allowlist check — never use startsWith (prefix bypass risk). */
function isAllowedOrigin(originOrReferer) {
  const origin = parseRequestOrigin(originOrReferer);
  return !!origin && ALLOWED_ORIGINS.includes(origin);
}

module.exports = { ALLOWED_ORIGINS, getAllowedOrigin, parseRequestOrigin, isAllowedOrigin };
