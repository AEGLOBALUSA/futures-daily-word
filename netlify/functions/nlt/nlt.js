exports.handler = async (event) => {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers };
  try {
    const q = event.queryStringParameters.q || '';
    const resp = await fetch('https://api.nlt.to/api/passages?ref=' + encodeURIComponent(q) + '&version=NLT');
    const html = await resp.text();
    const verses = [];
    const verseRegex = /<verse_export[^>]*vn="(\d+)"[^>]*>([\s\S]*?)<\/verse_export>/gi;
    let match;
    while ((match = verseRegex.exec(html)) !== null) {
      const num = match[1];
      let text = match[2]
        .replace(/<sup[^>]*>[\s\S]*?<\/sup>/gi, '')
        .replace(/<h\d[^>]*>([\s\S]*?)<\/h\d>/gi, '$1\n')
        .replace(/<br\s*\/?>/gi, ' ')
        .replace(/<\/p>/gi, ' ')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&ldquo;/g, '\u201C').replace(/&rdquo;/g, '\u201D')
        .replace(/&lsquo;/g, '\u2018').replace(/&rsquo;/g, '\u2019')
        .replace(/&mdash;/g, '\u2014').replace(/&ndash;/g, '\u2013')
        .replace(/&amp;/g, '&').replace(/&[a-z]+;/gi, '')
        .replace(/\s+/g, ' ').trim();
      if (text) verses.push('[' + num + '] ' + text);
    }
    if (verses.length === 0) {
      let text = html.replace(/<sup[^>]*>(\d+)<\/sup>/gi, '[$1] ').replace(/<[^>]+>/g, '').replace(/&[a-z]+;/gi, '').replace(/\s+/g, ' ').trim();
      const bodyStart = text.indexOf('[');
      if (bodyStart > -1) text = text.slice(bodyStart);
      return { statusCode: 200, headers, body: JSON.stringify({ canonical: q, passages: [text] }) };
    }
    return { statusCode: 200, headers, body: JSON.stringify({ canonical: q, passages: [verses.join(' ')] }) };
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};
