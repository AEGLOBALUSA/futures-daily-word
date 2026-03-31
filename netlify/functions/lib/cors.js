/**
 * Shared CORS configuration for all Netlify functions.
 * Single source of truth for allowed origins.
 */

const ALLOWED_ORIGINS = [
  'https://futures-daily-word.netlify.app',
  'https://www.futures-daily-word.netlify.app',
  'https://futuresdailyword.com',
  'https://www.futuresdailyword.com'
];

/**
 * Returns the matching CORS origin header value.
 * Falls back to the primary origin if the request origin isn't in the list.
 */
function getAllowedOrigin(origin) {
  return ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
}

module.exports = { ALLOWED_ORIGINS, getAllowedOrigin };
