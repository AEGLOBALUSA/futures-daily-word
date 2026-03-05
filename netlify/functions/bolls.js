// Bolls Bible API proxy for NKJV, AMP, and other translations
// Endpoint: https://bolls.life/get-text/<translation>/<book>/<chapter>/

const ALLOWED_ORIGINS = [
  'https://futures-daily-word.netlify.app',
  'https://www.futures-daily-word.netlify.app'
];

function getCorsHeaders(origin) {
  if (ALLOWED_ORIGINS.includes(origin)) {
    return { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'GET, OPTIONS' };
  }
  return {};
}

// Standard Protestant canon book name -> ID mapping
const BOOK_IDS = {
  'genesis':1,'exodus':2,'leviticus':3,'numbers':4,'deuteronomy':5,
  'joshua':6,'judges':7,'ruth':8,'1 samuel':9,'2 samuel':10,
  '1 kings':11,'2 kings':12,'1 chronicles':13,'2 chronicles':14,
  'ezra':15,'nehemiah':16,'esther':17,'job':18,'psalms':19,'psalm':19,
  'proverbs':20,'ecclesiastes':21,'song of solomon':22,'songs':22,'song of songs':22,
  'isaiah':23,'jeremiah':24,'lamentations':25,'ezekiel':26,'daniel':27,
  'hosea':28,'joel':29,'amos':30,'obadiah':31,'jonah':32,'micah':33,
  'nahum':34,'habakkuk':35,'zephaniah':36,'haggai':37,'zechariah':38,'malachi':39,
  'matthew':40,'mark':41,'luke':42,'john':43,'acts':44,'romans':45,
  '1 corinthians':46,'2 corinthians':47,'galatians':48,'ephesians':49,
  'philippians':50,'colossians':51,'1 thessalonians':52,'2 thessalonians':53,
  '1 timothy':54,'2 timothy':55,'titus':56,'philemon':57,'hebrews':58,
  'james':59,'1 peter':60,'2 peter':61,'1 john':62,'2 john':63,'3 john':64,
  'jude':65,'revelation':66,'revelations':66
};

function parseRef(ref) {
  ref = ref.trim();
  const m = ref.match(/^(\d?\s*\w[\w\s]*?)\s+(\d+)(?::(\d+)(?:-(\d+))?|-(\d+))?$/i);
  if (!m) return null;
  const bookName = m[1].trim().toLowerCase();
  const chapter = parseInt(m[2]);
  const startVerse = m[3] ? parseInt(m[3]) : null;
  const endVerse = m[4] ? parseInt(m[4]) : null;
  const endChapter = m[5] ? parseInt(m[5]) : null;
  const bookId = BOOK_IDS[bookName];
  if (!bookId) return null;
  return { bookId, chapter, startVerse, endVerse, endChapter };
}

function stripHtml(text) {
  return text
    .replace(/<\/?[^>]+(>|$)/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

// Fetch with timeout (8 second limit per request)
async function fetchWithTimeout(url, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetch(url, { signal: controller.signal });
    return resp;
  } finally {
    clearTimeout(timer);
  }
}

exports.handler = async (event) => {
  const origin = event.headers.origin || event.headers.Origin || '';
  const referer = event.headers.referer || event.headers.Referer || '';
  const corsHeaders = getCorsHeaders(origin);

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders, body: '' };
  }

  const isAllowedOrigin = ALLOWED_ORIGINS.includes(origin);
  const isAllowedReferer = !origin && ALLOWED_ORIGINS.some(o => referer.startsWith(o));
  const isSameOrigin = !origin && !referer;
  if (!isAllowedOrigin && !isAllowedReferer && !isSameOrigin) {
    return { statusCode: 403, headers: corsHeaders, body: JSON.stringify({ error: 'Forbidden' }) };
  }

  const params = event.queryStringParameters || {};
  const q = params.q;
  const v = (params.v || 'NKJV').toUpperCase();

  if (!q) {
    return { statusCode: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Missing q parameter' }) };
  }

  // Cap multi-chapter requests to 10 chapters max to prevent abuse
  const MAX_CHAPTERS = 10;

  const refParts = q.split(';').map(s => s.trim()).filter(Boolean);
  const parsedRefs = [];
  for (const part of refParts) {
    const p = parseRef(part);
    if (!p) {
      return { statusCode: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Could not parse reference: ' + part }) };
    }
    parsedRefs.push(p);
  }

  try {
    let allPassageTexts = [];

    for (const parsed of parsedRefs) {
      const startCh = parsed.chapter;
      const endCh = parsed.endChapter || parsed.chapter;

      if (endCh - startCh + 1 > MAX_CHAPTERS) {
        return { statusCode: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Too many chapters requested (max ' + MAX_CHAPTERS + ')' }) };
      }

      // PARALLEL fetch all chapters in the range (was sequential before)
      const chapterNums = [];
      for (let ch = startCh; ch <= endCh; ch++) chapterNums.push(ch);

      const chapterResults = await Promise.all(
        chapterNums.map(async (ch) => {
          const url = `https://bolls.life/get-text/${v}/${parsed.bookId}/${ch}/`;
          const resp = await fetchWithTimeout(url);
          if (!resp.ok) throw new Error('Bolls API error: ' + resp.status);
          let verses = await resp.json();

          // Filter to verse range if single-chapter ref with verse numbers
          if (!parsed.endChapter && parsed.startVerse) {
            const end = parsed.endVerse || parsed.startVerse;
            verses = verses.filter(v => v.verse >= parsed.startVerse && v.verse <= end);
          }
          return { chapter: ch, verses };
        })
      );

      // Format
      if (chapterResults.length === 1) {
        allPassageTexts.push(chapterResults[0].verses.map(v => `[${v.verse}] ${stripHtml(v.text)}`).join(' '));
      } else {
        allPassageTexts.push(chapterResults.map(cv =>
          cv.verses.map(v => `[${v.verse}] ${stripHtml(v.text)}`).join(' ')
        ).join('\n\n'));
      }
    }

    const passageText = allPassageTexts.join('\n\n');

    return {
      statusCode: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=3600' },
      body: JSON.stringify({ canonical: q, passages: [passageText] })
    };
  } catch (err) {
    const isTimeout = err.name === 'AbortError';
    return {
      statusCode: isTimeout ? 504 : 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: isTimeout ? 'Request timed out' : 'Server error: ' + err.message })
    };
  }
};
