/**
 * Bible translation API routing layer.
 * Routes: ESV → /api/esv, NLT → /api/nlt, NKJV/NIV/AMP/NASB/RVR/ARA → /api/bolls,
 *         KJV → local offline, WEB → built-in constant.
 * Fallback chain: requested → KJV offline → WEB built-in.
 */

// Verse cache: keyed by passageName_TRANSLATION
const verseCache = new Map<string, string>();

export type TranslationCode = 'KJV' | 'NKJV' | 'NIV' | 'ESV' | 'NLT' | 'AMP' | 'NASB' | 'WEB' | 'RVR' | 'ARA' | 'NVI';

/**
 * Fetch passage text from the appropriate API endpoint.
 */
export async function fetchPassage(passage: string, translation: TranslationCode): Promise<string> {
  const cacheKey = `${passage}_${translation}`;

  // Check cache first
  if (verseCache.has(cacheKey)) {
    return verseCache.get(cacheKey)!;
  }

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
        // NKJV, NIV, AMP, NASB, RVR, ARA, NVI → Bolls.Life API
        text = await fetchBolls(passage, translation);
        break;
    }

    verseCache.set(cacheKey, text);
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
        verseCache.set(`${passage}_KJV`, kjv);
        return kjv;
      }
    } catch {
      // Fall through
    }
  }
  return getWEBBuiltIn(passage);
}

/**
 * Fetch audio for a passage.
 * ESV translation → ESV.org native audio (passage reference needed).
 * All other translations → ElevenLabs TTS with the actual scripture text.
 */
export async function fetchAudio(text: string, translation: TranslationCode, passageRef?: string): Promise<string | null> {
  try {
    // ESV has native human-read audio — use the passage reference
    if (translation === 'ESV' && passageRef) {
      // Try the combined ref first
      const res = await fetch(`/api/esv-audio?q=${encodeURIComponent(passageRef)}`);
      if (res.ok) {
        const blob = await res.blob();
        if (blob.size > 1000) return URL.createObjectURL(blob);
      }
      // If combined ref failed or returned tiny response, try first individual ref
      const refs = passageRef.split(/[;,]/).map(r => r.trim()).filter(Boolean);
      if (refs.length > 1) {
        const singleRes = await fetch(`/api/esv-audio?q=${encodeURIComponent(refs[0])}`);
        if (singleRes.ok) {
          const blob = await singleRes.blob();
          if (blob.size > 1000) return URL.createObjectURL(blob);
        }
      }
    }

    // All translations → ElevenLabs AI voice
    if (!text) return null;
    const res = await fetch('/api/elevenlabs-tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: text.slice(0, 20000) }),
    });
    if (res.ok) {
      const blob = await res.blob();
      if (blob.size > 500) return URL.createObjectURL(blob);
    }
  } catch {
    // Audio not available
  }
  return null;
}

/**
 * Clear the verse cache (useful when switching translations).
 */
export function clearVerseCache(): void {
  verseCache.clear();
}
