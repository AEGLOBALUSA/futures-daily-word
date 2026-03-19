/**
 * AI Chat Proxy — Claude (Anthropic) backend
 * Proxies requests from the BibleAI frontend to the Anthropic Messages API.
 */

const ALLOWED_ORIGINS = [
  'https://futures-daily-word.netlify.app',
  'https://www.futures-daily-word.netlify.app',
  'https://futuresdailyword.com',
  'https://www.futuresdailyword.com'
];

// In-memory rate limiting (per function instance)
const rateLimits = {};
const RATE_LIMIT_WINDOW = 60000;
const RATE_LIMIT_MAX = 15;

function isRateLimited(ip) {
  const now = Date.now();
  if (!rateLimits[ip]) rateLimits[ip] = [];
  rateLimits[ip] = rateLimits[ip].filter(t => now - t < RATE_LIMIT_WINDOW);
  if (rateLimits[ip].length >= RATE_LIMIT_MAX) return true;
  rateLimits[ip].push(now);
  const ipKeys = Object.keys(rateLimits);
  if (ipKeys.length > 200) {
    for (const k of ipKeys) {
      if (rateLimits[k].every(t => now - t >= RATE_LIMIT_WINDOW)) delete rateLimits[k];
    }
  }
  return false;
}

function getCorsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin'
  };
}

async function fetchWithTimeout(url, opts, timeoutMs = 55000) {
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

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: corsHeaders, body: 'Method not allowed' };
  }

  const referer = event.headers?.referer || event.headers?.Referer || '';
  const isAllowedOrigin = ALLOWED_ORIGINS.includes(origin);
  const isSameOrigin = !origin && ALLOWED_ORIGINS.some(o => referer === o || referer.startsWith(o + '/'));
  const isNoOrigin = !origin && !referer;
  if (!isAllowedOrigin && !isSameOrigin && !isNoOrigin) {
    return { statusCode: 403, headers: corsHeaders, body: JSON.stringify({ error: 'Forbidden' }) };
  }

  const clientIP = event.headers?.['x-forwarded-for']?.split(',')[0]?.trim() ||
                    event.headers?.['client-ip'] || 'unknown';
  if (isRateLimited(clientIP)) {
    return { statusCode: 429, headers: corsHeaders, body: JSON.stringify({ error: 'Too many requests. Please slow down.' }) };
  }

  const API_KEY = process.env.ANTHROPIC_API_KEY;
  if (!API_KEY) {
    return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: 'API key not configured' }) };
  }

  try {
    if (event.body && event.body.length > 100000) {
      return { statusCode: 413, headers: corsHeaders, body: JSON.stringify({ error: 'Request too large' }) };
    }
    const body = JSON.parse(event.body);

    if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
      return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Messages array required' }) };
    }

    if (body.messages.length > 20) {
      return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Too many messages (max 20)' }) };
    }

    const sanitized = {
      model: 'claude-sonnet-4-20250514',
      max_tokens: Math.min(body.max_tokens || 1024, 2048),
      messages: body.messages,
    };
    if (body.system) sanitized.system = body.system;

    const response = await fetchWithTimeout(
      'https://api.anthropic.com/v1/messages',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify(sanitized)
      },
      55000
    );

    const data = await response.json();
    return {
      statusCode: response.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    };
  } catch (err) {
    const isTimeout = err.name === 'AbortError';
    return {
      statusCode: isTimeout ? 504 : 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: isTimeout ? 'AI request timed out — try a shorter question' : 'Proxy error' })
    };
  }
};
