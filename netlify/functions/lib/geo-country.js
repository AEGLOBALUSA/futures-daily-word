/**
 * Country from Netlify geo headers / context.
 * Headers: x-nf-country, x-country. Fallback: context.geo.country.code.
 */

function headerVal(headers, name) {
  if (!headers) return '';
  const want = String(name).toLowerCase();
  for (const [k, v] of Object.entries(headers)) {
    if (String(k).toLowerCase() === want) {
      const raw = Array.isArray(v) ? v[0] : v;
      return String(raw || '').trim();
    }
  }
  return '';
}

function countryFromRequest(event, context) {
  const headers = (event && event.headers) || {};
  const fromHeader = (
    headerVal(headers, 'x-nf-country') ||
    headerVal(headers, 'x-country') ||
    headerVal(headers, 'x-nf-country-code')
  ).toUpperCase();
  const geo = context && context.geo;
  const fromCtx = String(
    (geo && geo.country && (geo.country.code || geo.country)) || ''
  ).toUpperCase();
  const raw = fromHeader || fromCtx;
  if (/^[A-Z]{2}$/.test(raw)) return raw;
  return null;
}

module.exports = { countryFromRequest, headerVal };
