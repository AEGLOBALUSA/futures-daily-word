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
  'https://futures-church.netlify.app',
  // Pastors Sermon Prep — the standalone pastor app (AEGLOBALUSA/pastors-sermon-prep).
  // It shares this backend's intake (staff sign-in, password change, Sunday
  // publish), pastor-admin (campus code), published-sermon and user-sync.
  'https://pastors-sermon-prep.netlify.app',
  // Futures Notes — the standalone notes app (AEGLOBALUSA/futures-notes). It
  // shares ONLY this backend's intake (staff sign-in via `login` / `me` /
  // `logout`); its notes, AI and Granola functions live on its own site.
  'https://futures-notes.netlify.app'
];

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

/** Netlify deploy-preview / branch deploys of this site only — exact host shape. */
function isDailyWordPreviewOrigin(origin) {
  return /^https:\/\/[a-z0-9-]+--futures-daily-word\.netlify\.app$/.test(origin || '');
}

/**
 * Returns the matching CORS origin header value.
 * Falls back to the primary origin if the request origin isn't in the list.
 */
function getAllowedOrigin(origin) {
  const parsed = parseRequestOrigin(origin);
  if (ALLOWED_ORIGINS.includes(parsed) || isDailyWordPreviewOrigin(parsed)) return parsed;
  return ALLOWED_ORIGINS.includes(origin) || isDailyWordPreviewOrigin(origin)
    ? origin
    : ALLOWED_ORIGINS[0];
}

/** Exact-match allowlist check — never use startsWith (prefix bypass risk). */
function isAllowedOrigin(originOrReferer) {
  const origin = parseRequestOrigin(originOrReferer);
  return !!origin && (ALLOWED_ORIGINS.includes(origin) || isDailyWordPreviewOrigin(origin));
}

module.exports = { ALLOWED_ORIGINS, getAllowedOrigin, parseRequestOrigin, isAllowedOrigin, isDailyWordPreviewOrigin };
