/**
 * API.Bible (American Bible Society) Audio Proxy
 * Fetches audio for translations available through API.Bible.
 * Requires API_BIBLE_KEY env var (free sign-up at scripture.api.bible).
 *
 * Usage: GET /api/apibible-audio?passage=Psalms+23&translation=NIV
 *
 * Supported translations vary — API.Bible has a huge catalog.
 * We map our codes to their Bible IDs and audio fileset IDs.
 */

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

// API.Bible Bible IDs — these map to specific audio Bibles
// Format: { bibleId (text), audioBibleId (audio version) }
// Audio Bible IDs found via: GET https://api.scripture.api.bible/v1/audio-bibles
const BIBLE_MAP = {
  KJV:  { audioBibleId: '105a06b6146d11e7-01' },  // KJV audio
  NIV:  { audioBibleId: null },                      // NIV audio not free on API.Bible
  NLT:  { audioBibleId: null },                      // Check availability
  NKJV: { audioBibleId: null },                      // Check availability
  AMP:  { audioBibleId: null },
  NASB: { audioBibleId: null },
  ESV:  { audioBibleId: null },
  WEB:  { audioBibleId: '9879dbb7cfe39e4d-04' },    // World English Bible audio
};

// Map book names to API.Bible book IDs (same as USFM standard)
const BOOK_IDS = {
  genesis: 'GEN', exodus: 'EXO', leviticus: 'LEV', numbers: 'NUM',
  deuteronomy: 'DEU', joshua: 'JOS', judges: 'JDG', ruth: 'RUT',
  '1 samuel': '1SA', '2 samuel': '2SA', '1 kings': '1KI', '2 kings': '2KI',
  '1 chronicles': '1CH', '2 chronicles': '2CH', ezra: 'EZR', nehemiah: 'NEH',
  esther: 'EST', job: 'JOB', psalms: 'PSA', psalm: 'PSA', proverbs: 'PRO',
  ecclesiastes: 'ECC', 'song of solomon': 'SNG', isaiah: 'ISA', jeremiah: 'JER',
  lamentations: 'LAM', ezekiel: 'EZK', daniel: 'DAN', hosea: 'HOS',
  joel: 'JOL', amos: 'AMO', obadiah: 'OBA', jonah: 'JON', micah: 'MIC',
  nahum: 'NAM', habakkuk: 'HAB', zephaniah: 'ZEP', haggai: 'HAG',
  zechariah: 'ZEC', malachi: 'MAL',
  matthew: 'MAT', mark: 'MRK', luke: 'LUK', john: 'JHN', acts: 'ACT',
  romans: 'ROM', '1 corinthians': '1CO', '2 corinthians': '2CO',
  galatians: 'GAL', ephesians: 'EPH', philippians: 'PHP', colossians: 'COL',
  '1 thessalonians': '1TH', '2 thessalonians': '2TH',
  '1 timothy': '1TI', '2 timothy': '2TI', titus: 'TIT', philemon: 'PHM',
  hebrews: 'HEB', james: 'JAS', '1 peter': '1PE', '2 peter': '2PE',
  '1 john': '1JN', '2 john': '2JN', '3 john': '3JN', jude: 'JUD',
  revelation: 'REV',
};

function parsePassage(passage) {
  const match = passage.match(/^(.+?)\s+(\d+)$/);
  if (!match) return null;
  const bookName = match[1].toLowerCase().trim();
  const chapter = match[2];
  const bookId = BOOK_IDS[bookName];
  if (!bookId) return null;
  return { bookId, chapter };
}

exports.handler = async (event) => {
  const origin = event.headers?.origin || event.headers?.Origin || '';
  const corsHeaders = getCorsHeaders(origin);

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' };
  }

  const API_KEY = process.env.API_BIBLE_KEY;
  if (!API_KEY) {
    return {
      statusCode: 501,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'API.Bible key not configured' })
    };
  }

  const passage = event.queryStringParameters?.passage;
  const translation = (event.queryStringParameters?.translation || 'KJV').toUpperCase();

  if (!passage) {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Missing passage parameter' }) };
  }

  const parsed = parsePassage(passage);
  if (!parsed) {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Could not parse passage' }) };
  }

  const bibleInfo = BIBLE_MAP[translation];
  if (!bibleInfo || !bibleInfo.audioBibleId) {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: `No audio Bible available for ${translation}` }) };
  }

  try {
    // Step 1: Get the chapter audio from API.Bible
    // Endpoint: GET /v1/audio-bibles/{audioBibleId}/chapters/{bookId}.{chapter}
    const chapterId = `${parsed.bookId}.${parsed.chapter}`;
    const url = `https://api.scripture.api.bible/v1/audio-bibles/${bibleInfo.audioBibleId}/chapters/${chapterId}`;

    const res = await fetch(url, {
      headers: { 'api-key': API_KEY }
    });

    if (!res.ok) {
      console.warn(`API.Bible returned ${res.status} for ${chapterId}`);
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'No audio found for this passage' })
      };
    }

    const data = await res.json();

    // API.Bible returns resourceUrl in the chapter data
    const audioUrl = data?.data?.resourceUrl;
    if (!audioUrl) {
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'No audio URL in response' })
      };
    }

    // Step 2: Proxy the audio back to the client
    const audioRes = await fetch(audioUrl);
    if (!audioRes.ok) {
      return {
        statusCode: 502,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Failed to fetch audio file' })
      };
    }

    const arrayBuffer = await audioRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (buffer.length < 1000) {
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Audio file too small — likely empty' })
      };
    }

    // Detect content type from response or default to mp3
    const contentType = audioRes.headers.get('content-type') || 'audio/mpeg';

    return {
      statusCode: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=604800', // 7 days
      },
      body: buffer.toString('base64'),
      isBase64Encoded: true,
    };
  } catch (err) {
    console.error('API.Bible audio error:', err.message);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Internal error fetching audio' })
    };
  }
};
