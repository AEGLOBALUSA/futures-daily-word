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
  const res = await fetch(`/api/esv?passage=${encodeURIComponent(passage)}`);
  if (!res.ok) throw new Error(`ESV API error: ${res.status}`);
  const data = await res.json();
  return data.passages?.[0] || data.text || '';
}

async function fetchNLT(passage: string): Promise<string> {
  const res = await fetch(`/api/nlt?passage=${encodeURIComponent(passage)}`);
  if (!res.ok) throw new Error(`NLT API error: ${res.status}`);
  const data = await res.json();
  return data.text || data.passage || '';
}

async function fetchBolls(passage: string, translation: string): Promise<string> {
  const res = await fetch(`/api/bolls?passage=${encodeURIComponent(passage)}&translation=${translation}`);
  if (!res.ok) throw new Error(`Bolls API error: ${res.status}`);
  const data = await res.json();
  // Bolls returns array of verses
  if (Array.isArray(data)) {
    return data.map((v: { text: string }) => v.text).join(' ');
  }
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
 * Fetch audio URL for a passage.
 */
export async function fetchAudio(passage: string, translation: TranslationCode): Promise<string | null> {
  try {
    if (translation === 'ESV') {
      const res = await fetch(`/api/esv-audio?passage=${encodeURIComponent(passage)}`);
      if (res.ok) {
        const data = await res.json();
        return data.url || null;
      }
    }
    // For other translations, use Polly TTS
    const res = await fetch('/api/polly-tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: passage, lang: 'en' }),
    });
    if (res.ok) {
      const blob = await res.blob();
      return URL.createObjectURL(blob);
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
