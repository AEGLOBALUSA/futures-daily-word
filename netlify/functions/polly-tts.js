const { PollyClient, SynthesizeSpeechCommand } = require('@aws-sdk/client-polly');

// In-memory TTS cache — keyed by text+voice hash. Bible passages are identical across
// users on the same day, so this prevents duplicate API calls within a warm instance.
const ttsCache = new Map();
const TTS_CACHE_MAX = 30;
const TTS_CACHE_TTL = 3600000; // 1 hour

function hashText(text) {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
  }
  return hash.toString(36);
}

const ALLOWED_ORIGINS = [
  'https://futures-daily-word.netlify.app',
  'https://www.futures-daily-word.netlify.app',
  'https://futuresdailyword.com',
  'https://www.futuresdailyword.com'
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
    // Reject oversized request bodies (max 50KB)
    if (event.body && event.body.length > 50000) {
      return { statusCode: 413, headers: corsHeaders, body: JSON.stringify({ error: 'Request too large' }) };
    }
    const { text, voiceId, engine } = JSON.parse(event.body || '{}');
    if (!text) {
      return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Missing text' }) };
    }
    if (text.length > 25000) {
      return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Text too long (max 25000 chars)' }) };
    }

    // Auto-detect language from voice ID — whitelist valid voices
    const VOICE_LANG = {
      // English voices
      'Matthew': 'en-US', 'Joanna': 'en-US', 'Amy': 'en-GB', 'Brian': 'en-GB', 'Ruth': 'en-US', 'Stephen': 'en-US', 'Gregory': 'en-US', 'Danielle': 'en-US',
      // Spanish voices
      'Lucia': 'es-ES', 'Lupe': 'es-US', 'Pedro': 'es-US', 'Mia': 'es-MX', 'Sergio': 'es-ES',
      // Portuguese voices
      'Camila': 'pt-BR', 'Vitoria': 'pt-BR', 'Thiago': 'pt-BR',
      // Indonesian voices
      'Andika': 'id-ID'
    };
    // Only allow whitelisted voices — reject unknown voiceIds
    const voice = VOICE_LANG[voiceId] ? voiceId : 'Lucia';
    const ttsEngine = engine === 'standard' ? 'standard' : 'neural';
    const langCode = VOICE_LANG[voice];

    // Check TTS cache — same passage text + voice produces identical audio
    const cacheKey = `${hashText(text)}_${voice}_${ttsEngine}`;
    const cached = ttsCache.get(cacheKey);
    if (cached && Date.now() - cached.ts < TTS_CACHE_TTL) {
      return {
        statusCode: 200,
        headers: { ...corsHeaders, 'Content-Type': 'audio/mpeg', 'Cache-Control': 'public, max-age=86400', 'X-Cache': 'HIT' },
        body: cached.body,
        isBase64Encoded: true
      };
    }

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
        LanguageCode: langCode,
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
    const base64Body = combined.toString('base64');

    // Store in TTS cache (evict oldest if full)
    if (ttsCache.size >= TTS_CACHE_MAX) {
      const oldest = ttsCache.keys().next().value;
      ttsCache.delete(oldest);
    }
    ttsCache.set(cacheKey, { body: base64Body, ts: Date.now() });

    return {
      statusCode: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=86400'
      },
      body: base64Body,
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
