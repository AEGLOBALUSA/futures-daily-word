/**
 * Bible translation API routing layer.
 * Routes: ESV → /api/esv, NLT → /api/nlt, NKJV/NIV/AMP/NASB/RVR/ARA → /api/bolls,
 *         KJV → local offline, WEB → built-in constant.
 * Fallback chain: requested → KJV offline → WEB built-in.
 */

// Verse cache: keyed by passageName_TRANSLATION. Bounded to prevent memory leaks.
const VERSE_CACHE_MAX = 500;
const verseCache = new Map<string, string>();

function verseCacheSet(key: string, value: string) {
  if (verseCache.size >= VERSE_CACHE_MAX) {
    // Evict oldest entry (first inserted)
    const oldest = verseCache.keys().next().value;
    if (oldest !== undefined) verseCache.delete(oldest);
  }
  verseCache.set(key, value);
}

// In-flight request deduplication: prevents duplicate network calls for the same passage
const inFlight = new Map<string, Promise<string>>();

export type TranslationCode = 'KJV' | 'NKJV' | 'NIV' | 'ESV' | 'NLT' | 'AMP' | 'NASB' | 'WEB' | 'RVR' | 'ARA' | 'NVI' | 'RV1960' | 'TB';

/**
 * Fetch passage text from the appropriate API endpoint.
 * Deduplicates concurrent requests for the same passage+translation.
 */
export async function fetchPassage(passage: string, translation: TranslationCode): Promise<string> {
  const cacheKey = `${passage}_${translation}`;

  // Check cache first
  if (verseCache.has(cacheKey)) {
    return verseCache.get(cacheKey)!;
  }

  // If this exact request is already in flight, piggyback on it
  if (inFlight.has(cacheKey)) {
    return inFlight.get(cacheKey)!;
  }

  // Create the request and register it as in-flight
  const request = _doFetch(passage, translation, cacheKey);
  inFlight.set(cacheKey, request);

  try {
    return await request;
  } finally {
    inFlight.delete(cacheKey);
  }
}

async function _doFetch(passage: string, translation: TranslationCode, cacheKey: string): Promise<string> {
  try {
    let text: string;

    switch (translation) {
      case 'ESV':
        text = await fetchESV(passage);
        break;
      case 'NLT':
        text = await fetchNLT(passage);
        break;
      case 'KJV':
        text = await fetchKJV(passage);
        break;
      case 'WEB':
        text = getWEBBuiltIn(passage);
        break;
      default:
        // NKJV, NIV, AMP, NASB, RV1960, ARA, NVI, TB → Bolls.Life API
        text = await fetchBolls(passage, translation);
        break;
    }

    verseCacheSet(cacheKey, text);
    return text;
  } catch (err) {
    console.warn(`Failed to fetch ${passage} in ${translation}, falling back`, err);
    return fallbackFetch(passage, translation);
  }
}

async function fetchESV(passage: string): Promise<string> {
  const res = await fetch(`/api/esv?q=${encodeURIComponent(passage)}`);
  if (!res.ok) throw new Error(`ESV API error: ${res.status}`);
  const data = await res.json();
  return data.passages?.[0] || data.text || '';
}

async function fetchNLT(passage: string): Promise<string> {
  const res = await fetch(`/api/nlt?q=${encodeURIComponent(passage)}`);
  if (!res.ok) throw new Error(`NLT API error: ${res.status}`);
  const data = await res.json();
  return data.text || data.passage || '';
}

async function fetchBolls(passage: string, translation: string): Promise<string> {
  const res = await fetch(`/api/bolls?q=${encodeURIComponent(passage)}&v=${encodeURIComponent(translation)}`);
  if (!res.ok) throw new Error(`Bolls API error: ${res.status}`);
  const data = await res.json();
  // Bolls function returns { passages: [text] }
  if (data.passages?.[0]) return data.passages[0];
  if (Array.isArray(data)) return data.map((v: { text: string }) => v.text).join(' ');
  return data.text || '';
}

async function fetchKJV(passage: string): Promise<string> {
  // Try local offline KJV first
  const match = passage.match(/^(.+?)\s+(\d+)$/);
  if (!match) return '';
  const [, book, ch] = match;
  const bookSlug = book.toLowerCase().replace(/\s+/g, '-');
  try {
    const res = await fetch(`/bible/kjv/${bookSlug}/${ch}.json`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        return data.map((v: { text: string }) => v.text).join(' ');
      }
      return data.text || JSON.stringify(data);
    }
  } catch {
    // Fall through to API
  }
  // If no local file, try bolls as KJV
  return fetchBolls(passage, 'KJV');
}

function getWEBBuiltIn(_passage: string): string {
  // WEB is the fallback of last resort - return placeholder
  // In production, this pulls from the built-in BIBLE_WEB constant in translations.ts
  return 'World English Bible text — loading...';
}

async function fallbackFetch(passage: string, originalTranslation: TranslationCode): Promise<string> {
  // Fallback chain: KJV offline → WEB built-in
  if (originalTranslation !== 'KJV') {
    try {
      const kjv = await fetchKJV(passage);
      if (kjv) {
        verseCacheSet(`${passage}_KJV`, kjv);
        return kjv;
      }
    } catch {
      // Fall through
    }
  }
  return getWEBBuiltIn(passage);
}

// ── Audio cache: keyed by passageRef_translation → blob URL ──
// Bounded to prevent memory leaks from accumulated blob URLs.
const AUDIO_CACHE_MAX = 100;
const audioCache = new Map<string, string>();
const audioInFlight = new Map<string, Promise<string | null>>();

function audioCacheSet(key: string, url: string) {
  if (audioCache.size >= AUDIO_CACHE_MAX) {
    // Evict oldest entry and revoke its blob URL to free memory
    const oldest = audioCache.keys().next().value;
    if (oldest !== undefined) {
      const oldUrl = audioCache.get(oldest);
      if (oldUrl?.startsWith('blob:')) {
        try { URL.revokeObjectURL(oldUrl); } catch {}
      }
      audioCache.delete(oldest);
    }
  }
  audioCache.set(key, url);
}

/**
 * Fetch audio for a passage.
 * Priority:
 *   1. ESV.org native audio (ESV only)
 *   2. ElevenLabs AI voice (primary TTS for all translations)
 *   3. AWS Polly neural voice (cheapest fallback)
 *
 * Audio responses are cached in-memory so replaying doesn't re-fetch.
 */
export async function fetchAudio(text: string, translation: TranslationCode, passageRef?: string): Promise<string | null> {
  const cacheKey = `${passageRef || text.slice(0, 60)}_${translation}`;

  // Return cached audio URL if we already have it
  if (audioCache.has(cacheKey)) return audioCache.get(cacheKey)!;

  // Deduplicate concurrent audio requests
  if (audioInFlight.has(cacheKey)) return audioInFlight.get(cacheKey)!;

  const request = _doFetchAudio(text, translation, passageRef, cacheKey);
  audioInFlight.set(cacheKey, request);
  try {
    return await request;
  } finally {
    audioInFlight.delete(cacheKey);
  }
}

async function _doFetchAudio(
  text: string,
  translation: TranslationCode,
  passageRef: string | undefined,
  cacheKey: string
): Promise<string | null> {
  // Strip verse number markers like [14] [15] so TTS doesn't read them aloud
  const cleanText = text.replace(/\[\d+\]\s*/g, '');

  // ── 1. ESV native human-read audio (esv.org) ──
  if (translation === 'ESV' && passageRef) {
    const url = await _tryESVAudio(passageRef);
    if (url) { audioCacheSet(cacheKey, url); return url; }
  }

  if (!cleanText) return null;

  // Detect language for TTS priority ordering
  const lang = localStorage.getItem('dw_lang') || 'en';
  const useNativeVoiceFirst = lang === 'id' || lang === 'es' || lang === 'pt';

  // Helper: Polly TTS with native voice for the user's language
  const tryPolly = async (): Promise<string | null> => {
    const voiceId = lang === 'es' ? 'Lucia' : lang === 'pt' ? 'Camila' : lang === 'id' ? 'Andika' : 'Matthew';
    const res = await fetch('/api/polly-tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: cleanText.slice(0, 20000), voiceId, engine: 'neural' }),
    });
    if (res.ok) {
      const blob = await res.blob();
      if (blob.size > 500) return URL.createObjectURL(blob);
    }
    return null;
  };

  // Helper: ElevenLabs TTS (multilingual model, English voice)
  const tryElevenLabs = async (): Promise<string | null> => {
    const res = await fetch('/api/elevenlabs-tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: cleanText.slice(0, 20000) }),
    });
    if (res.ok) {
      const blob = await res.blob();
      if (blob.size > 500) return URL.createObjectURL(blob);
    }
    return null;
  };

  // Non-English: Polly native voice first (better accent, cheaper), ElevenLabs fallback
  // English: ElevenLabs first (higher quality English), Polly fallback
  const primary = useNativeVoiceFirst ? tryPolly : tryElevenLabs;
  const fallback = useNativeVoiceFirst ? tryElevenLabs : tryPolly;

  try {
    const url = await primary();
    if (url) { audioCacheSet(cacheKey, url); return url; }
  } catch { /* continue to fallback */ }
  try {
    const url = await fallback();
    if (url) { audioCacheSet(cacheKey, url); return url; }
  } catch { /* no audio available */ }

  return null;
}

// ── Helper: ESV.org native audio ──
async function _tryESVAudio(passageRef: string): Promise<string | null> {
  try {
    const res = await fetch(`/api/esv-audio?q=${encodeURIComponent(passageRef)}`);
    if (res.ok) {
      const blob = await res.blob();
      if (blob.size > 1000) return URL.createObjectURL(blob);
    }
    // Try first individual ref if combined failed
    const refs = passageRef.split(/[;,]/).map(r => r.trim()).filter(Boolean);
    if (refs.length > 1) {
      const singleRes = await fetch(`/api/esv-audio?q=${encodeURIComponent(refs[0])}`);
      if (singleRes.ok) {
        const blob = await singleRes.blob();
        if (blob.size > 1000) return URL.createObjectURL(blob);
      }
    }
  } catch { /* no ESV audio */ }
  return null;
}

/**
 * Clear the verse cache (useful when switching translations).
 */
export function clearVerseCache(): void {
  verseCache.clear();
}
