const { ALLOWED_ORIGINS } = require('./lib/cors');

function getCorsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Vary': 'Origin'
  };
}

// In-memory audio cache — keyed by passage. ESV audio is immutable, so caching is safe
// and lets a successful fetch cover later requests for the same chapter (the audit saw
// Luke 11 intermittently 502 while 1 Thess 5 succeeded — cache makes the good response stick).
const audioCache = new Map();
const CACHE_MAX = 20;            // base64 audio is large; keep the cache small
const CACHE_TTL = 86400000;      // 24h (matches the Cache-Control we already send)

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Fetch with per-attempt timeout so a hung upstream can't burn the whole function budget.
async function fetchWithTimeout(url, opts, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...opts, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
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
      body: JSON.stringify({ error: 'ESV audio API key not configured' })
    };
  }

  const passage = event.queryStringParameters?.q;
  if (!passage) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Missing passage query parameter' })
    };
  }

  // Serve from cache if we already have this chapter's audio.
  const cacheKey = passage.trim().toLowerCase();
  const cached = audioCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return {
      statusCode: 200,
      headers: { ...corsHeaders, 'Content-Type': 'audio/mpeg', 'Cache-Control': 'public, max-age=86400', 'X-Cache': 'HIT' },
      body: cached.body,
      isBase64Encoded: true
    };
  }

  const params = new URLSearchParams({ q: passage });
  const url = `https://api.esv.org/v3/passage/audio/?${params}`;
  const RETRYABLE = new Set([429, 500, 502, 503, 504]);
  const MAX_ATTEMPTS = 3;
  const BACKOFFS = [250, 600]; // ms before retry 2 and retry 3 — stays within Netlify's ~10s budget
  let lastStatus = 502;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      const response = await fetchWithTimeout(url, {
        headers: { 'Authorization': `Token ${API_KEY}` },
        redirect: 'follow'
      }, 7000);

      if (response.ok) {
        const arrayBuffer = await response.arrayBuffer();
        const base64Body = Buffer.from(arrayBuffer).toString('base64');

        if (audioCache.size >= CACHE_MAX) {
          audioCache.delete(audioCache.keys().next().value); // evict oldest
        }
        audioCache.set(cacheKey, { body: base64Body, ts: Date.now() });

        return {
          statusCode: 200,
          headers: { ...corsHeaders, 'Content-Type': 'audio/mpeg', 'Cache-Control': 'public, max-age=86400' },
          body: base64Body,
          isBase64Encoded: true
        };
      }

      lastStatus = response.status;
      if (!RETRYABLE.has(response.status)) {
        // Permanent error (e.g. 400/401/404) — don't waste retries.
        return {
          statusCode: response.status,
          headers: corsHeaders,
          body: JSON.stringify({ error: 'ESV audio API error', status: response.status })
        };
      }
    } catch (err) {
      // Network error or per-attempt timeout — treat as transient and retry.
      lastStatus = err.name === 'AbortError' ? 504 : 502;
    }

    if (attempt < MAX_ATTEMPTS - 1) {
      await sleep(BACKOFFS[attempt]);
    }
  }

  // All attempts exhausted on a transient failure.
  return {
    statusCode: 502,
    headers: corsHeaders,
    body: JSON.stringify({ error: 'ESV audio temporarily unavailable', status: lastStatus })
  };
};
