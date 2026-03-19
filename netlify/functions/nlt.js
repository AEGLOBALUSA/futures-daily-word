const ALLOWED_ORIGINS = [
  'https://futures-daily-word.netlify.app',
  'https://www.futures-daily-word.netlify.app',
  'https://futuresdailyword.com',
  'https://www.futuresdailyword.com'
];

function getCorsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Vary': 'Origin'
  };
}

// Strip HTML tags and extract clean verse text with verse numbers
function htmlToVerses(html) {
  // Remove everything before the body content
  let text = html.replace(/[\s\S]*?<body[^>]*>/i, '');
  text = text.replace(/<\/body>[\s\S]*/i, '');

  // Extract verse numbers - they appear as <span class="vn">16</span>
  text = text.replace(/<span[^>]*class="vn"[^>]*>(\d+)<\/span>/gi, '[$1] ');

  // Remove ALL heading tags and their content (h1-h6: passage headers, chapter numbers, section subheads)
  text = text.replace(/<h[1-6][^>]*>[\s\S]*?<\/h[1-6]>/gi, '');

  // Remove footnote anchors and entire translation note blocks (nested spans)
  text = text.replace(/<a[^>]*class="a-tn"[^>]*>[^<]*<\/a>/gi, '');
  text = text.replace(/<span[^>]*class="tn-ref"[^>]*>[^<]*<\/span>/gi, '');
  text = text.replace(/<span[^>]*class="tn"[^>]*>[\s\S]*?<\/span>/gi, '');

  // Replace paragraph and div breaks with newlines
  text = text.replace(/<\/p>/gi, '\n');
  text = text.replace(/<\/div>/gi, '\n');
  text = text.replace(/<br\s*\/?>/gi, '\n');

  // Remove all remaining HTML tags
  text = text.replace(/<[^>]+>/g, '');

  // Decode HTML entities
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, "'");
  text = text.replace(/&nbsp;/g, ' ');
  text = text.replace(/&#\d+;/g, '');

  // Remove any remaining footnote markers like *3:16 Or born from above; also in 3:7.
  text = text.replace(/\*\d+:\d+[^[\]]*?(?=\[\d+\]|$)/g, '');

  // Clean up whitespace
  text = text.replace(/[ \t]+/g, ' ');
  text = text.replace(/\n\s*\n/g, '\n');
  text = text.trim();

  return text;
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

  // Origin check
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

  try {
    const passage = event.queryStringParameters?.q;
    const version = event.queryStringParameters?.v || 'NLT';

    if (!passage) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Missing passage query parameter' })
      };
    }

    // NLT API accepts plain references like "1 Corinthians 13" or "John 3:16-17"
    const API_KEY = process.env.NLT_API_KEY || '';
    const keyParam = API_KEY ? `&key=${API_KEY}` : '';
    const url = `https://api.nlt.to/api/passages?ref=${encodeURIComponent(passage)}&version=${version}${keyParam}`;

    const response = await fetch(url);
    const html = await response.text();

    if (!response.ok) {
      return {
        statusCode: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'NLT API error', status: response.status })
      };
    }

    // Convert HTML to clean text with verse markers
    const cleanText = htmlToVerses(html);

    // Return in a format compatible with how the app expects ESV data
    return {
      statusCode: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        canonical: passage,
        passages: [cleanText]
      })
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'NLT proxy error' })
    };
  }
};
