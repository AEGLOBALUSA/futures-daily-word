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

/** The eight 16-bit groups of an IPv6 address, or null when it does not parse. */
function ipv6Groups(addr) {
  let s = String(addr).trim();
  if (s.startsWith("[") && s.includes("]")) s = s.slice(1, s.indexOf("]"));
  const zone = s.indexOf("%");
  if (zone >= 0) s = s.slice(0, zone);
  s = s.toLowerCase();
  // An embedded IPv4 tail (::ffff:192.0.2.1) becomes its two groups.
  const v4 = s.match(/^(.*:)(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) {
    const o = v4.slice(2).map(Number);
    if (o.some((n) => n > 255)) return null;
    s = `${v4[1]}${((o[0] << 8) | o[1]).toString(16)}:${((o[2] << 8) | o[3]).toString(16)}`;
  }
  const halves = s.split("::");
  if (halves.length > 2) return null;
  const part = (p) => (p ? p.split(":") : []);
  const head = part(halves[0]);
  const tail = halves.length === 2 ? part(halves[1]) : [];
  const fill = 8 - head.length - tail.length;
  if (halves.length === 2 ? fill < 1 : fill !== 0) return null;
  const groups = [...head, ...Array(halves.length === 2 ? fill : 0).fill("0"), ...tail];
  if (groups.length !== 8 || !groups.every((g) => /^[0-9a-f]{1,4}$/.test(g))) return null;
  return groups.map((g) => parseInt(g, 16));
}

/**
 * The key a per-IP rate limit should use for `ip`. IPv4 stays as it is. An IPv6
 * address becomes its /64 ("2001:db8:abcd:12::/64"): one host or home router is
 * handed a whole /64 and can pick any address in it, so a limit keyed on the
 * full address lets one machine look like any number of callers. An IPv4-mapped
 * IPv6 address (::ffff:192.0.2.1) is keyed as the IPv4 address. Anything that
 * does not parse is returned unchanged.
 */
function rateLimitKeyIp(ip) {
  const s = String(ip == null ? "unknown" : ip).trim() || "unknown";
  if (!s.includes(":")) return s;
  const g = ipv6Groups(s);
  if (!g) return s;
  if (g.slice(0, 5).every((n) => n === 0) && g[5] === 0xffff) {
    return [g[6] >> 8, g[6] & 255, g[7] >> 8, g[7] & 255].join(".");
  }
  return `${g.slice(0, 4).map((n) => n.toString(16)).join(":")}::/64`;
}

/** The caller's address as a per-IP rate-limit key: clientIp, with IPv6 reduced to its /64. */
function rateLimitIp(event) {
  return rateLimitKeyIp(clientIp(event));
}

module.exports = { clientIp, rateLimitIp, rateLimitKeyIp };
