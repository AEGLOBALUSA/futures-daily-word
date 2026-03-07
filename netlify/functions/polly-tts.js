const { PollyClient, SynthesizeSpeechCommand } = require('@aws-sdk/client-polly');

const ALLOWED_ORIGINS = [
  'https://futures-daily-word.netlify.app',
  'https://www.futures-daily-word.netlify.app',
  'https://futuresdailyword.com',
  'https://www.futuresdailyword.com',
  'http://localhost:3000'
];

function getCorsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin'
  };
}

exports.handler = async (event) => {
  const origin = event.headers?.origin || event.headers?.Origin || '';
  const corsHeaders = getCorsHeaders(origin);

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: corsHeaders, body: 'Method not allowed' };
  }

  // Origin check
  const referer = event.headers?.referer || event.headers?.Referer || '';
  const isAllowedOrigin = ALLOWED_ORIGINS.includes(origin);
  const isSameOrigin = !origin && ALLOWED_ORIGINS.some(o => referer === o || referer.startsWith(o + '/'));
  const isNoOrigin = !origin && !referer;
  if (!isAllowedOrigin && !isSameOrigin && !isNoOrigin) {
    return { statusCode: 403, headers: corsHeaders, body: JSON.stringify({ error: 'Forbidden' }) };
  }

  const accessKey = process.env.AWS_POLLY_ACCESS_KEY;
  const secretKey = process.env.AWS_POLLY_SECRET_KEY;
  const region = process.env.AWS_POLLY_REGION || 'us-east-1';

  if (!accessKey || !secretKey) {
    return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: 'AWS Polly credentials not configured' }) };
  }

  try {
    const { text, voiceId, engine } = JSON.parse(event.body || '{}');
    if (!text) {
      return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Missing text' }) };
    }

    const voice = voiceId || 'Lucia'; // Lucia = Spain Spanish female (professional)
    const ttsEngine = engine || 'neural'; // neural for best quality

    const client = new PollyClient({
      region,
      credentials: {
        accessKeyId: accessKey,
        secretAccessKey: secretKey
      }
    });

    // Polly has a 3000 char limit per request for neural voices
    // Split text at sentence boundaries if needed
    const MAX_CHARS = 2800;
    const chunks = [];
    if (text.length <= MAX_CHARS) {
      chunks.push(text);
    } else {
      let remaining = text;
      while (remaining.length > 0) {
        if (remaining.length <= MAX_CHARS) {
          chunks.push(remaining);
          break;
        }
        let cutPoint = MAX_CHARS;
        const lastPeriod = remaining.lastIndexOf('. ', cutPoint);
        const lastQuestion = remaining.lastIndexOf('? ', cutPoint);
        const lastExclaim = remaining.lastIndexOf('! ', cutPoint);
        const bestCut = Math.max(lastPeriod, lastQuestion, lastExclaim);
        if (bestCut > MAX_CHARS * 0.3) {
          cutPoint = bestCut + 1;
        }
        chunks.push(remaining.substring(0, cutPoint).trim());
        remaining = remaining.substring(cutPoint).trim();
      }
    }

    // Synthesize each chunk
    const audioBuffers = [];
    for (const chunk of chunks) {
      const command = new SynthesizeSpeechCommand({
        Text: chunk,
        OutputFormat: 'mp3',
        VoiceId: voice,
        Engine: ttsEngine,
        LanguageCode: 'es-ES',
        SampleRate: '24000'
      });

      const response = await client.send(command);

      // Read the audio stream into a buffer
      const streamToBuffer = async (stream) => {
        const chunks = [];
        for await (const chunk of stream) {
          chunks.push(chunk);
        }
        return Buffer.concat(chunks);
      };

      const buffer = await streamToBuffer(response.AudioStream);
      audioBuffers.push(buffer);
    }

    // Concatenate MP3 buffers
    const combined = Buffer.concat(audioBuffers);

    return {
      statusCode: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=86400'
      },
      body: combined.toString('base64'),
      isBase64Encoded: true
    };
  } catch (err) {
    console.error('Polly TTS error:', err);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Polly TTS error', message: err.message })
    };
  }
};
