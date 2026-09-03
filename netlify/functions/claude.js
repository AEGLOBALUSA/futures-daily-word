/**
 * AI Chat Proxy — Claude (Anthropic) backend
 * Proxies requests from the BibleAI frontend to the Anthropic Messages API.
 */

const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');
const { ALLOWED_ORIGINS } = require('./lib/cors');
const { isSharedRateLimited } = require('./lib/rate-limit');

// Origins that must PROVE a staff session before this endpoint spends a token.
//
// The Origin header is all that stands between this function and the org's
// Anthropic key, and any non-browser can set it to whatever it likes. For Daily
// Word's own congregation readers there is nothing better available — they are
// anonymous by design. But Pastors Sermon Prep is pastor-only end to end: every
// caller there already holds a staff session, so that origin can be held to a
// real proof and a forged header buys nothing.
//
// The token arrives in the JSON BODY as `staffToken`, not in an Authorization
// header, because this function answers preflight with
// `Access-Control-Allow-Headers: Content-Type`; a header would need the two
// repositories to deploy in lockstep. It is verified against `staff_sessions`
// exactly as intake.js does, and it is never logged and never forwarded to
// Anthropic (the outbound payload is rebuilt field by field below).
const TOKEN_REQUIRED_ORIGINS = new Set([
  'https://pastors-sermon-prep.netlify.app',
]);

let supabase = null;
function getSupabase() {
  if (!supabase) {
    supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  }
  return supabase;
}

/**
 * True when `rawToken` is a live staff session. Fails CLOSED: a malformed
 * token, an expired row, a missing row or any error answers false, so an
 * outage of the database cannot turn into free completions.
 */
async function hasLiveStaffSession(rawToken) {
  const raw = typeof rawToken === 'string' ? rawToken.trim() : '';
  if (!raw || raw.length < 32 || raw.length > 200) return false;
  try {
    const tokenHash = crypto.createHash('sha256').update(raw).digest('hex');
    const { data, error } = await getSupabase()
      .from('staff_sessions')
      .select('expires_at')
      .eq('token_hash', tokenHash)
      .maybeSingle();
    if (error || !data) return false;
    return new Date(data.expires_at).getTime() > Date.now();
  } catch {
    return false;
  }
}

// Shared (cross-instance) rate limit — this endpoint spends Anthropic tokens
const RATE_LIMIT_WINDOW = 60000;
const RATE_LIMIT_MAX = 10;

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

  // Browsers always send Origin on cross-origin and same-origin POSTs, so a
  // request with neither Origin nor Referer is not our app — no bypass for it
  // on a paid endpoint (curl satisfies "no headers" trivially).
  const referer = event.headers?.referer || event.headers?.Referer || '';
  const isAllowedOrigin = ALLOWED_ORIGINS.includes(origin);
  const isSameOrigin = !origin && ALLOWED_ORIGINS.some(o => referer === o || referer.startsWith(o + '/'));
  if (!isAllowedOrigin && !isSameOrigin) {
    return { statusCode: 403, headers: corsHeaders, body: JSON.stringify({ error: 'Forbidden' }) };
  }

  const clientIP = event.headers?.['x-forwarded-for']?.split(',')[0]?.trim() ||
                    event.headers?.['client-ip'] || 'unknown';
  if (await isSharedRateLimited('claude', clientIP, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW)) {
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

    if (body.messages.length > 42) {
      return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Too many messages (max 42)' }) };
    }

    // A pastor-only origin proves it is a pastor. Checked before the Anthropic
    // call, so a refusal costs nothing.
    if (TOKEN_REQUIRED_ORIGINS.has(origin) && !(await hasLiveStaffSession(body.staffToken))) {
      console.warn('[Claude] refused: no live staff session for', origin);
      return { statusCode: 401, headers: corsHeaders, body: JSON.stringify({ error: 'Sign in required' }) };
    }

    const sanitized = {
      model: 'claude-haiku-4-5-20251001',
      max_tokens: Math.min(body.max_tokens || 600, 800),
      messages: (body.messages || []).slice(-20),
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
    if (!response.ok) {
      console.error('[Claude] API error:', response.status, JSON.stringify(data));
      return {
        statusCode: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'AI service error' })
      };
    }
    return {
      statusCode: 200,
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
