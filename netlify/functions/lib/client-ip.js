/**
 * The caller's address, for per-IP rate limits.
 *
 * Netlify sets x-nf-client-connection-ip itself at the edge, so a client cannot
 * choose it (client-ip is Netlify's older name for the same thing). The first
 * x-forwarded-for entry is whatever the client chose to send, so it is only the
 * last resort: local runs and tests, where neither Netlify header exists. A limit
 * keyed on x-forwarded-for alone lets one machine look like any number of callers.
 *
 * Kept in its own file with no dependencies so lib/auth.js (no external
 * dependencies) can use it, and so a test that replaces lib/rate-limit.js does
 * not also replace this.
 */
function clientIp(event) {
  const h = (event && event.headers) || {};
  const raw = h["x-nf-client-connection-ip"] || h["client-ip"] || h["x-forwarded-for"] || "unknown";
  return String(raw).split(",")[0].trim().slice(0, 64) || "unknown";
}

module.exports = { clientIp };
