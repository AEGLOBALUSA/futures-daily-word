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

// Parse a reference like "John 3:16-18" or "1 Corinthians 13" or "Psalms 23:1-6" or "Genesis 1-2" (multi-chapter)
function parseRef(ref) {
  ref = ref.trim();
  // Match: optional number prefix + book name + chapter + optional -endChapter or :startVerse-endVerse
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

// Strip HTML tags from Bolls response text
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

exports.handler = async (event) => {
  const origin = event.headers.origin || event.headers.Origin || '';
  const referer = event.headers.referer || event.headers.Referer || '';
  const corsHeaders = getCorsHeaders(origin);

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders, body: '' };
  }

  // Origin/Referer check (same as other proxy functions)
  const isAllowedOrigin = ALLOWED_ORIGINS.includes(origin);
  const isAllowedReferer = !origin && ALLOWED_ORIGINS.some(o => referer.startsWith(o));
  const isSameOrigin = !origin && !referer;
  if (!isAllowedOrigin && !isAllowedReferer && !isSameOrigin) {
    return { statusCode: 403, headers: corsHeaders, body: JSON.stringify({ error: 'Forbidden' }) };
  }

  const params = event.queryStringParameters || {};
  const q = params.q; // e.g. "John 3:1-16"
  const v = (params.v || 'NKJV').toUpperCase(); // translation code

  if (!q) {
    return { statusCode: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Missing q parameter' }) };
  }

  // Handle compound references separated by semicolons (e.g. "Obadiah 1; Jonah 1-4")
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
      let partVerses = [];

      // Fetch all chapters in the range
      for (let ch = startCh; ch <= endCh; ch++) {
        const url = `https://bolls.life/get-text/${v}/${parsed.bookId}/${ch}/`;
        const resp = await fetch(url);
        if (!resp.ok) {
          return { statusCode: resp.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Bolls API error: ' + resp.status }) };
        }
        let verses = await resp.json();

        // Filter to requested verse range if specified (only applies to single-chapter refs)
        if (!parsed.endChapter && parsed.startVerse) {
          const end = parsed.endVerse || parsed.startVerse;
          verses = verses.filter(v => v.verse >= parsed.startVerse && v.verse <= end);
        }

        partVerses.push({ chapter: ch, verses });
      }

      // Format this reference part
      if (partVerses.length === 1) {
        allPassageTexts.push(partVerses[0].verses.map(v => `[${v.verse}] ${stripHtml(v.text)}`).join(' '));
      } else {
        allPassageTexts.push(partVerses.map(cv =>
          cv.verses.map(v => `[${v.verse}] ${stripHtml(v.text)}`).join(' ')
        ).join('\n\n'));
      }
    }

    const passageText = allPassageTexts.join('\n\n');
    const canonical = q;

    return {
      statusCode: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ canonical, passages: [passageText] })
    };
  } catch (err) {
    return { statusCode: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Server error: ' + err.message }) };
  }
};
