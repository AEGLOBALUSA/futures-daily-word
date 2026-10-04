/**
 * Country (and, for the campus guess, town and state) from Netlify geo.
 * Headers: x-nf-country, x-country. Fallback: context.geo.country.code.
 * Town and state come from x-nf-geo (base64 JSON) or context.geo. They are
 * handed straight back to the reader's own device and never logged or stored.
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

function cleanPlace(v, max) {
  const s = String(v || '').replace(/[\u0000-\u001f<>]/g, '').trim();
  return s && s.length <= max ? s : null;
}

function parseGeoHeader(raw) {
  if (!raw) return null;
  try {
    const json = Buffer.from(raw, 'base64').toString('utf8');
    const v = JSON.parse(json);
    return v && typeof v === 'object' ? v : null;
  } catch {
    return null;
  }
}

/**
 * { city, subdivision } for the campus guess (B09-07). subdivision is the
 * state or region code ("GA", "SA") when Netlify gives one, else its name.
 * Either is null when absent. Latitude, longitude and postcode are never read.
 */
function placeFromRequest(event, context) {
  const headers = (event && event.headers) || {};
  const geo = parseGeoHeader(headerVal(headers, 'x-nf-geo')) || (context && context.geo) || {};
  const city = cleanPlace(geo.city, 80);
  const sub = geo.subdivision;
  const subdivision = cleanPlace(sub && typeof sub === 'object' ? (sub.code || sub.name) : sub, 80);
  return { city, subdivision };
}

module.exports = { countryFromRequest, placeFromRequest, headerVal };
