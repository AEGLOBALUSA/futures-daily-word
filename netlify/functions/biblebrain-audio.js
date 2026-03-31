/**
 * Bible Brain (Faith Comes By Hearing) Audio Proxy
 * Fetches native human-read audio for KJV, NKJV, NLT and others.
 * Requires BIBLE_BRAIN_API_KEY env var.
 *
 * Usage: GET /api/biblebrain-audio?passage=Psalms+23&translation=KJV
 *
 * Fileset ID format: ENG{VERSION}{TESTAMENT}2DA
 *   e.g., ENGKJVO2DA = English, KJV, Old Testament, Drama, Audio
 *         ENGKJVN2DA = English, KJV, New Testament, Drama, Audio
 */

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

// Map our translation codes → Bible Brain fileset prefixes
// Format: ENG + VERSION + O/N (testament) + 2DA (drama audio)
// We'll try non-drama (1DA) first, then drama (2DA)
const FILESET_MAP = {
  KJV:  { id: 'ENGKJV', lang: 'ENG' },
  NKJV: { id: 'ENGNKJ', lang: 'ENG' },
  NLT:  { id: 'ENGNLT', lang: 'ENG' },
  NIV:  { id: 'ENGNIV', lang: 'ENG' },
  AMP:  { id: 'ENGAMP', lang: 'ENG' },
  NASB: { id: 'ENGNAS', lang: 'ENG' },
  ESV:  { id: 'ENGESV', lang: 'ENG' },
};

// Bible Brain book IDs — maps common names to their 3-letter USFM codes
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

const NT_BOOKS = new Set([
  'MAT','MRK','LUK','JHN','ACT','ROM','1CO','2CO','GAL','EPH','PHP','COL',
  '1TH','2TH','1TI','2TI','TIT','PHM','HEB','JAS','1PE','2PE','1JN','2JN','3JN','JUD','REV',
]);

function parsePassage(passage) {
  // "Psalms 23" → { book: "PSA", chapter: "23" }
  // "2 Timothy 3" → { book: "2TI", chapter: "3" }
  const match = passage.match(/^(.+?)\s+(\d+)$/);
  if (!match) return null;
  const bookName = match[1].toLowerCase().trim();
  const chapter = match[2];
  const bookId = BOOK_IDS[bookName];
  if (!bookId) return null;
  return { bookId, chapter, testament: NT_BOOKS.has(bookId) ? 'N' : 'O' };
}

exports.handler = async (event) => {
  const origin = event.headers?.origin || event.headers?.Origin || '';
  const corsHeaders = getCorsHeaders(origin);

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' };
  }

  const API_KEY = process.env.BIBLE_BRAIN_API_KEY;
  if (!API_KEY) {
    return {
      statusCode: 501,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Bible Brain API key not configured' })
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

  const filesetInfo = FILESET_MAP[translation];
  if (!filesetInfo) {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: `Unsupported translation: ${translation}` }) };
  }

  // Try multiple fileset variations: non-drama audio, then drama audio
  const filesetVariations = [
    `${filesetInfo.id}${parsed.testament}1DA`,  // non-drama audio
    `${filesetInfo.id}${parsed.testament}2DA`,  // drama audio
  ];

  for (const filesetId of filesetVariations) {
    try {
      // Step 1: Get the chapter audio file list
      const listUrl = `https://4.dbt.io/api/bibles/filesets/${filesetId}/${parsed.bookId}/${parsed.chapter}?key=${API_KEY}&v=4`;
      const listRes = await fetch(listUrl);

      if (!listRes.ok) continue;

      const listData = await listRes.json();
      const files = listData?.data;

      if (!files || !Array.isArray(files) || files.length === 0) continue;

      // Step 2: Get the audio URL — Bible Brain returns signed CDN URLs
      const audioFile = files[0]; // first file is the chapter audio
      const audioUrl = audioFile?.path;

      if (!audioUrl) continue;

      // Step 3: Fetch the actual audio and proxy it back
      const audioRes = await fetch(audioUrl);
      if (!audioRes.ok) continue;

      const arrayBuffer = await audioRes.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      if (buffer.length < 1000) continue; // too small, probably an error

      return {
        statusCode: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'audio/mpeg',
          'Cache-Control': 'public, max-age=604800', // cache 7 days — audio doesn't change
        },
        body: buffer.toString('base64'),
        isBase64Encoded: true,
      };
    } catch (err) {
      console.warn(`Bible Brain fileset ${filesetId} failed:`, err.message);
      continue;
    }
  }

  // None of the filesets worked
  return {
    statusCode: 404,
    headers: corsHeaders,
    body: JSON.stringify({ error: 'No audio found for this passage/translation' })
  };
};
