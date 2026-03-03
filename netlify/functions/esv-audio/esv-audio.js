exports.handler = async (event) => {
  const headers = { 'Access-Control-Allow-Origin': '*' };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers };
  try {
    const q = event.queryStringParameters.q || '';
    const resp = await fetch(`https://api.esv.org/v3/passage/audio/?q=${encodeURIComponent(q)}`, {
      headers: { 'Authorization': `Token ${process.env.ESV_API_KEY}` }
    });
    if (!resp.ok) {
      return { statusCode: resp.status, headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'ESV audio error' }) };
    }
    const buffer = Buffer.from(await resp.arrayBuffer());
    return { statusCode: 200, headers: { ...headers, 'Content-Type': 'audio/mpeg' }, body: buffer.toString('base64'), isBase64Encoded: true };
  } catch (e) {
    return { statusCode: 500, headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: e.message }) };
  }
};
