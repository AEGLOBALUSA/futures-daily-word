const { PollyClient, SynthesizeSpeechCommand } = require('@aws-sdk/client-polly');

exports.handler = async (event) => {
  const headers = { 'Access-Control-Allow-Origin': '*' };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers };
  try {
    const { text, voiceId, engine } = JSON.parse(event.body);
    const polly = new PollyClient({
      region: process.env.AWS_POLLY_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_POLLY_ACCESS_KEY,
        secretAccessKey: process.env.AWS_POLLY_SECRET_KEY
      }
    });
    const cmd = new SynthesizeSpeechCommand({
      Text: text,
      OutputFormat: 'mp3',
      VoiceId: voiceId || 'Joanna',
      Engine: engine || 'neural'
    });
    const result = await polly.send(cmd);
    const chunks = [];
    for await (const chunk of result.AudioStream) { chunks.push(chunk); }
    const buffer = Buffer.concat(chunks);
    return {
      statusCode: 200,
      headers: { ...headers, 'Content-Type': 'audio/mpeg' },
      body: buffer.toString('base64'),
      isBase64Encoded: true
    };
  } catch (e) {
    return { statusCode: 500, headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: e.message }) };
  }
};
