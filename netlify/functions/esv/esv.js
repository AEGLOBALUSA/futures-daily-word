exports.handler = async (event) => {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers };
  try {
    const q = event.queryStringParameters.q || '';
    const resp = await fetch(`https://api.esv.org/v3/passage/text/?q=${encodeURIComponent(q)}&include-headings=false&include-footnotes=false&include-verse-numbers=true&include-short-copyright=false&include-passage-references=false`, {
      headers: { 'Authorization': `Token ${process.env.ESV_API_KEY}` }
    });
    const data = await resp.text();
    return { statusCode: resp.status, headers, body: data };
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};
