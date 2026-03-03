const BOOKS = {
  'genesis':1,'exodus':2,'leviticus':3,'numbers':4,'deuteronomy':5,
  'joshua':6,'judges':7,'ruth':8,'1 samuel':9,'2 samuel':10,
  '1 kings':11,'2 kings':12,'1 chronicles':13,'2 chronicles':14,
  'ezra':15,'nehemiah':16,'esther':17,'job':18,'psalms':19,'psalm':19,
  'proverbs':20,'ecclesiastes':21,'song of solomon':22,'isaiah':23,
  'jeremiah':24,'lamentations':25,'ezekiel':26,'daniel':27,
  'hosea':28,'joel':29,'amos':30,'obadiah':31,'jonah':32,
  'micah':33,'nahum':34,'habakkuk':35,'zephaniah':36,'haggai':37,
  'zechariah':38,'malachi':39,
  'matthew':40,'mark':41,'luke':42,'john':43,'acts':44,
  'romans':45,'1 corinthians':46,'2 corinthians':47,
  'galatians':48,'ephesians':49,'philippians':50,'colossians':51,
  '1 thessalonians':52,'2 thessalonians':53,'1 timothy':54,'2 timothy':55,
  'titus':56,'philemon':57,'hebrews':58,'james':59,
  '1 peter':60,'2 peter':61,'1 john':62,'2 john':63,'3 john':64,
  'jude':65,'revelation':66
};

exports.handler = async (event) => {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers };
  try {
    const q = (event.queryStringParameters.q || '').trim();
    const v = event.queryStringParameters.v || 'YLT';
    
    // Parse "Genesis 1" or "John 3:16" or "John 3:16-18"
    const match = q.match(/^(.+?)\s+(\d+)(?::(\d+)(?:-(\d+))?)?$/);
    if (!match) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid query' }) };
    
    const bookName = match[1].toLowerCase();
    const chapter = parseInt(match[2]);
    const verseStart = match[3] ? parseInt(match[3]) : null;
    const verseEnd = match[4] ? parseInt(match[4]) : verseStart;
    
    const bookId = BOOKS[bookName];
    if (!bookId) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Unknown book: ' + bookName }) };
    
    const resp = await fetch(`https://bolls.life/get-text/${v}/${bookId}/${chapter}/`);
    if (!resp.ok) return { statusCode: resp.status, headers, body: JSON.stringify({ error: 'Bolls API error' }) };
    
    let verses = await resp.json();
    
    // Filter by verse range if specified
    if (verseStart) {
      verses = verses.filter(v => v.verse >= verseStart && v.verse <= (verseEnd || verseStart));
    }
    
    // Format as "[num] text [num] text..."
    const passageText = verses.map(v => `[${v.verse}] ${v.text}`).join(' ');
    
    return {
      statusCode: 200, headers,
      body: JSON.stringify({ canonical: q, passages: [passageText] })
    };
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};
