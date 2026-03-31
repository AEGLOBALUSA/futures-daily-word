const { ALLOWED_ORIGINS } = require('./lib/cors');

// In-memory passage cache — shared across warm invocations of this function instance.
// Bible text is immutable, so caching is safe. Caps at 200 entries to bound memory.
const passageCache = new Map();
const CACHE_MAX = 200;
const CACHE_TTL = 3600000; // 1 hour

function getCorsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Vary': 'Origin'
  };
}

exports.handler = async (event) => {
  const origin = event.headers?.origin || event.headers?.Origin || '';
  const corsHeaders = getCorsHeaders(origin);

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers: corsHeaders, body: 'Method not allowed' };
  }

  // Origin check — block cross-origin requests not from our app
  const referer = event.headers?.referer || event.headers?.Referer || '';
  const isAllowedOrigin = ALLOWED_ORIGINS.includes(origin);
  const isSameOrigin = !origin && ALLOWED_ORIGINS.some(o => referer === o || referer.startsWith(o + '/'));
  const isNoOrigin = !origin && !referer;
  if (!isAllowedOrigin && !isSameOrigin && !isNoOrigin) {
    return {
      statusCode: 403,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Forbidden' })
    };
  }

  const API_KEY = process.env.ESV_API_KEY;

  if (!API_KEY) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'ESV API key not configured' })
    };
  }

  try {
    const passage = event.queryStringParameters?.q;
    if (!passage) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Missing passage query parameter' })
      };
    }

    // Check server-side cache first
    const cacheKey = passage.trim().toLowerCase();
    const cached = passageCache.get(cacheKey);
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      return {
        statusCode: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=3600', 'X-Cache': 'HIT' },
        body: cached.body
      };
    }

    const params = new URLSearchParams({
      q: passage,
      'include-headings': 'false',
      'include-footnotes': 'false',
      'include-verse-numbers': 'true',
      'include-short-copyright': 'false',
      'include-passage-references': 'false',
      'indent-poetry': 'false',
      'indent-paragraphs': '0',
      'indent-declares': '0'
    });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(`https://api.esv.org/v3/passage/text/?${params}`, {
      headers: {
        'Authorization': `Token ${API_KEY}`
      },
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return {
        statusCode: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'ESV API error', status: response.status })
      };
    }

    const data = await response.json();
    const responseBody = JSON.stringify(data);

    // Store in cache (evict oldest if full)
    if (passageCache.size >= CACHE_MAX) {
      const oldest = passageCache.keys().next().value;
      passageCache.delete(oldest);
    }
    passageCache.set(cacheKey, { body: responseBody, ts: Date.now() });

    return {
      statusCode: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=3600' },
      body: responseBody
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'ESV proxy error' })
    };
  }
};
