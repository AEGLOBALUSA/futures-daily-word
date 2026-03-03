exports.handler = async (event) => {
  const headers = { 'Access-Control-Allow-Origin': '*' };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers };
  try {
    const { text, voiceId } = JSON.parse(event.body);
    const voice = voiceId || 'EXAVITQu4vr4xnSDxMaL';
    const resp = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'xi-api-key': process.env.ELEVENLABS_API_KEY },
      body: JSON.stringify({ text, model_id: 'eleven_monolingual_v1', voice_settings: { stability: 0.5, similarity_boost: 0.75 } })
    });
    if (!resp.ok) {
      const err = await resp.text();
      return { statusCode: resp.status, headers: { ...headers, 'Content-Type': 'application/json' }, body: err };
    }
    const buffer = Buffer.from(await resp.arrayBuffer());
    return { statusCode: 200, headers: { ...headers, 'Content-Type': 'audio/mpeg' }, body: buffer.toString('base64'), isBase64Encoded: true };
  } catch (e) {
    return { statusCode: 500, headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: e.message }) };
  }
};
