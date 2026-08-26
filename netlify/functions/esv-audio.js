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

// In-memory redirect cache — keyed by passage. ESV audio URLs are stable, so caching is
// safe and lets a successful lookup cover later requests for the same chapter.
// We cache the audio.esv.org Location, NOT audio bytes: buffering + base64 blew
// Netlify's 6MB response cap on long chapters (Psalm 119, Luke 11, John 11 all 502'd
// with Function.ResponseSizeTooLarge), so the function now redirects instead.
const redirectCache = new Map();
const CACHE_MAX = 200;           // URL strings are tiny
const CACHE_TTL = 86400000;      // 24h (matches the Cache-Control we already send)

// Only ever redirect to ESV's own audio host — it's the origin the app CSPs
// (including the futures.church embed) allow in media-src.
const ESV_AUDIO_ORIGIN = 'https://audio.esv.org';

// Defensive cap for the rare direct-200 upstream path: Netlify rejects response
// payloads over 6,291,556 bytes AFTER the handler returns (an opaque 502), so fail
// clearly ourselves instead. Base64 inflates ~4/3, so cap the raw bytes at ~4.5MB.
const MAX_DIRECT_BODY_BYTES = 4.5 * 1024 * 1024;

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

  // `format=json` returns the audio URL as a JSON body instead of a 302. The SPA
  // uses this: a cross-origin fetch can't follow the redirect to audio.esv.org
  // (no CORS there), so it reads the URL and hands it to the <audio> element,
  // which media-src CSP allows on both futuresdailyword.com and futures.church.
  const wantsJson = event.queryStringParameters?.format === 'json';
  const respondWithLocation = (location, cacheStatus) => wantsJson
    ? {
        statusCode: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=86400', 'X-Cache': cacheStatus },
        body: JSON.stringify({ url: location })
      }
    : {
        statusCode: 302,
        headers: { ...corsHeaders, 'Location': location, 'Cache-Control': 'public, max-age=86400', 'X-Cache': cacheStatus },
        body: ''
      };

  // Serve from cache if we already resolved this chapter's audio URL.
  const cacheKey = passage.trim().toLowerCase();
  const cached = redirectCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return respondWithLocation(cached.location, 'HIT');
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
        redirect: 'manual'
      }, 7000);

      // Normal ESV behaviour: a redirect to the mp3 on audio.esv.org.
      if (response.status >= 300 && response.status < 400) {
        const rawLocation = response.headers.get('location');
        let location = null;
        try {
          const resolved = new URL(rawLocation, url);
          if (resolved.origin === ESV_AUDIO_ORIGIN) location = resolved.href;
        } catch { /* missing/invalid Location — fall through to error */ }

        if (location) {
          if (redirectCache.size >= CACHE_MAX) {
            redirectCache.delete(redirectCache.keys().next().value); // evict oldest
          }
          redirectCache.set(cacheKey, { location, ts: Date.now() });
          return respondWithLocation(location, 'MISS');
        }
        // Redirect to an unexpected origin — never pass it through.
        return {
          statusCode: 502,
          headers: corsHeaders,
          body: JSON.stringify({ error: 'ESV audio redirect target not recognised' })
        };
      }

      // Defensive: upstream returned the audio bytes directly (not observed in
      // practice — the API redirects). Proxy small bodies; refuse oversized ones
      // instead of letting the platform 502 opaquely.
      if (response.ok) {
        const arrayBuffer = await response.arrayBuffer();
        if (arrayBuffer.byteLength > MAX_DIRECT_BODY_BYTES) {
          return {
            statusCode: 502,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'ESV audio too large to proxy' })
          };
        }
        return {
          statusCode: 200,
          headers: { ...corsHeaders, 'Content-Type': 'audio/mpeg', 'Cache-Control': 'public, max-age=86400' },
          body: Buffer.from(arrayBuffer).toString('base64'),
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
