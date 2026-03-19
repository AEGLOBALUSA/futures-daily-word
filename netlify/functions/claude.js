/**
 * AI Chat Proxy — Google Gemini backend
 * Accepts Anthropic-format requests from the frontend, translates to Gemini,
 * and returns responses in Anthropic-compatible format so the frontend is unchanged.
 *
 * Falls back to Anthropic Claude if GEMINI_API_KEY is not set but ANTHROPIC_API_KEY is.
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

// ── Gemini API call ──
async function callGemini(apiKey, messages, systemPrompt, maxTokens) {
  // Convert Anthropic messages to Gemini format
  const geminiContents = messages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const geminiBody = {
    contents: geminiContents,
    generationConfig: {
      maxOutputTokens: maxTokens,
      temperature: 0.7,
    },
  };

  // System instruction (Gemini supports this natively)
  if (systemPrompt) {
    geminiBody.systemInstruction = {
      parts: [{ text: systemPrompt }],
    };
  }

  const model = 'gemini-2.0-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const response = await fetchWithTimeout(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(geminiBody),
  }, 55000);

  const data = await response.json();

  if (!response.ok) {
    return {
      status: response.status,
      body: {
        error: data?.error?.message || 'Gemini API error',
      },
    };
  }

  // Extract text from Gemini response
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

  // Return in Anthropic-compatible format so frontend doesn't need changes
  return {
    status: 200,
    body: {
      content: [{ type: 'text', text }],
      model,
      role: 'assistant',
      stop_reason: data?.candidates?.[0]?.finishReason === 'MAX_TOKENS' ? 'max_tokens' : 'end_turn',
    },
  };
}

// ── Anthropic Claude API call (fallback) ──
async function callClaude(apiKey, messages, systemPrompt, maxTokens) {
  const sanitized = {
    model: 'claude-sonnet-4-20250514',
    max_tokens: maxTokens,
    messages,
  };
  if (systemPrompt) sanitized.system = systemPrompt;

  const response = await fetchWithTimeout(
    'https://api.anthropic.com/v1/messages',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(sanitized),
    },
    55000
  );

  const data = await response.json();
  return { status: response.status, body: data };
}

// ── Main handler ──
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

  // Check which API key is available — prefer Gemini, fall back to Claude
  const GEMINI_KEY = process.env.GEMINI_API_KEY;
  const CLAUDE_KEY = process.env.ANTHROPIC_API_KEY;

  if (!GEMINI_KEY && !CLAUDE_KEY) {
    return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: 'No AI API key configured' }) };
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

    const maxTokens = Math.min(body.max_tokens || 1024, 2048);
    const systemPrompt = body.system || '';

    // Try Gemini first, fall back to Claude
    let result;
    if (GEMINI_KEY) {
      result = await callGemini(GEMINI_KEY, body.messages, systemPrompt, maxTokens);
    } else {
      result = await callClaude(CLAUDE_KEY, body.messages, systemPrompt, maxTokens);
    }

    return {
      statusCode: result.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify(result.body),
    };
  } catch (err) {
    const isTimeout = err.name === 'AbortError';
    return {
      statusCode: isTimeout ? 504 : 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: isTimeout ? 'AI request timed out — try a shorter question' : 'Proxy error' }),
    };
  }
};
