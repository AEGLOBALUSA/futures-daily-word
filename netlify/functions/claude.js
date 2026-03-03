const ALLOWED_ORIGINS = [
  'https://futures-daily-word.netlify.app',
  'https://www.futures-daily-word.netlify.app'
];

// Simple in-memory rate limiting (per function instance)
const rateLimits = {};
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX = 15; // max 15 requests per minute per IP

function isRateLimited(ip) {
  const now = Date.now();
  if (!rateLimits[ip]) rateLimits[ip] = [];
  // Clean old entries
  rateLimits[ip] = rateLimits[ip].filter(t => now - t < RATE_LIMIT_WINDOW);
  if (rateLimits[ip].length >= RATE_LIMIT_MAX) return true;
  rateLimits[ip].push(now);
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

exports.handler = async (event) => {
  const origin = event.headers?.origin || event.headers?.Origin || '';
  const corsHeaders = getCorsHeaders(origin);

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: corsHeaders, body: 'Method not allowed' };
  }

  // Origin check — block cross-origin requests not from our app
  // Same-origin requests (from our own app) won't have an Origin header
  const referer = event.headers?.referer || event.headers?.Referer || '';
  const isAllowedOrigin = ALLOWED_ORIGINS.includes(origin);
  const isSameOrigin = !origin && ALLOWED_ORIGINS.some(o => referer.startsWith(o));
  const isNoOrigin = !origin && !referer; // direct serverless invocation
  if (!isAllowedOrigin && !isSameOrigin && !isNoOrigin) {
    return {
      statusCode: 403,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Forbidden' })
    };
  }

  // Rate limiting
  const clientIP = event.headers?.['x-forwarded-for']?.split(',')[0]?.trim() ||
                    event.headers?.['client-ip'] || 'unknown';
  if (isRateLimited(clientIP)) {
    return {
      statusCode: 429,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Too many requests. Please slow down.' })
    };
  }

  const API_KEY = process.env.ANTHROPIC_API_KEY;

  if (!API_KEY) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'API key not configured' })
    };
  }

  try {
    const body = JSON.parse(event.body);

    // Sanitize — only allow specific fields through, block prompt injection attempts
    const sanitized = {
      model: body.model || 'claude-sonnet-4-20250514',
      max_tokens: Math.min(body.max_tokens || 1024, 2048), // Cap max tokens
      messages: body.messages,
    };
    if (body.system) sanitized.system = body.system;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(sanitized)
    });

    const data = await response.json();

    return {
      statusCode: response.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Proxy error' })
    };
  }
};
