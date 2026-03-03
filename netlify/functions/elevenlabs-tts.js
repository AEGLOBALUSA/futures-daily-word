const ALLOWED_ORIGINS = [
  'https://futures-daily-word.netlify.app',
  'https://www.futures-daily-word.netlify.app',
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
  const isSameOrigin = !origin && ALLOWED_ORIGINS.some(o => referer.startsWith(o));
  const isNoOrigin = !origin && !referer;
  if (!isAllowedOrigin && !isSameOrigin && !isNoOrigin) {
    return { statusCode: 403, headers: corsHeaders, body: JSON.stringify({ error: 'Forbidden' }) };
  }

  const API_KEY = process.env.ELEVENLABS_API_KEY;
  if (!API_KEY) {
    return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: 'ElevenLabs API key not configured' }) };
  }

  try {
    const { text, voiceId, modelId } = JSON.parse(event.body || '{}');
    if (!text) {
      return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Missing text' }) };
    }

    // ElevenLabs has a ~5000 char limit per request
    // For longer text, we chunk and concatenate audio
    const MAX_CHARS = 4800;
    const voice = voiceId || 'JBFqnCBsd6RMkjVDRZzb'; // George - British male
    const model = modelId || 'eleven_multilingual_v2';

    // Split text into chunks at sentence boundaries
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
        // Find last sentence break within limit
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

    // Fetch audio for each chunk
    const audioBuffers = [];
    for (const chunk of chunks) {
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}`, {
        method: 'POST',
        headers: {
          'xi-api-key': API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: chunk,
          model_id: model,
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.3,
            use_speaker_boost: true
          }
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        return {
          statusCode: response.status,
          headers: corsHeaders,
          body: JSON.stringify({ error: 'ElevenLabs API error', detail: errText })
        };
      }

      const arrayBuffer = await response.arrayBuffer();
      audioBuffers.push(Buffer.from(arrayBuffer));
    }

    // Concatenate all MP3 buffers (MP3 frames are self-contained, so simple concat works)
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
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'TTS proxy error', message: err.message })
    };
  }
};
