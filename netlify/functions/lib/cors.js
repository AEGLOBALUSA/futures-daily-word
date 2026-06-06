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
  'https://futures.church',
  'https://www.futures.church',
  'https://futures.global',
  'https://www.futures.global'
];

/**
 * Returns the matching CORS origin header value.
 * Falls back to the primary origin if the request origin isn't in the list.
 */
function getAllowedOrigin(origin) {
  return ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
}

module.exports = { ALLOWED_ORIGINS, getAllowedOrigin };
