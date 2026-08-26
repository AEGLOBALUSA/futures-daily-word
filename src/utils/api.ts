/**
 * Bible translation API routing layer.
 * Routes: ESV → /api/esv, NLT → /api/nlt, NKJV/NIV/AMP/NASB/RVR/ARA → /api/bolls,
 *         KJV → local offline, WEB → built-in constant.
 * Fallback chain: requested → KJV offline → WEB built-in.
 */
import { API_BASE } from './api-base';

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

// ── Served-translation ledger ───────────────────────────────────────────────
// When a live translation source is unreachable we fall back to the bundled
// offline KJV. That is the right behaviour — reading something beats reading
// nothing — but the UI must not keep calling it by the requested name, or we
// present KJV as ESV/NIV. Every resolved fetch records what was ACTUALLY
// served here so the reader can label itself truthfully.
const servedTranslation = new Map<string, TranslationCode>();

function recordServed(passage: string, requested: TranslationCode, actual: TranslationCode) {
  servedTranslation.set(`${passage}_${requested}`, actual);
}

/**
 * What translation is the text for `passage` actually in, given the user asked
 * for `requested`? Returns `requested` until a fetch proves otherwise, so it is
 * safe to call during render before/while the passage loads.
 */
export function getServedTranslation(passage: string, requested: TranslationCode): TranslationCode {
  return servedTranslation.get(`${passage}_${requested}`) || requested;
}

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
        text = await fetchWEB(passage);
        break;
      default:
        // NKJV, NIV, AMP, NASB, RV1960, ARA, NVI, TB → Bolls.Life API
        text = await fetchBolls(passage, translation);
        break;
    }

    // An empty/whitespace body is a failure, not a hit — don't cache it, fall back
    // and retry (e.g. a wrong-shaped upstream JSON would otherwise stick as blank).
    // The legacy offline placeholder is equally a failure: it must never be cached
    // or recorded as served, or it renders (and can be marked read) as scripture.
    if (!text || !text.trim() || text === OFFLINE_PLACEHOLDER) {
      throw new Error(`Empty result: ${passage} (${translation})`);
    }
    verseCacheSet(cacheKey, text);
    recordServed(passage, translation, translation);
    return text;
  } catch (err) {
    console.warn(`Failed to fetch ${passage} in ${translation}, falling back`, err);
    return fallbackFetch(passage, translation);
  }
}

async function fetchESV(passage: string): Promise<string> {
  const res = await fetch(`${API_BASE}/api/esv?q=${encodeURIComponent(passage)}`);
  if (!res.ok) throw new Error(`ESV API error: ${res.status}`);
  const data = await res.json();
  return data.passages?.[0] || data.text || '';
}

async function fetchNLT(passage: string): Promise<string> {
  const res = await fetch(`${API_BASE}/api/nlt?q=${encodeURIComponent(passage)}`);
  if (!res.ok) throw new Error(`NLT API error: ${res.status}`);
  const data = await res.json();
  return data.passages?.[0] || data.text || data.passage || '';
}

async function fetchBolls(passage: string, translation: string): Promise<string> {
  const res = await fetch(`${API_BASE}/api/bolls?q=${encodeURIComponent(passage)}&v=${encodeURIComponent(translation)}`);
  if (!res.ok) throw new Error(`Bolls API error: ${res.status}`);
  const data = await res.json();
  // Bolls function returns { passages: [text] }
  if (data.passages?.[0]) return data.passages[0];
  if (Array.isArray(data)) return data.map((v: { text: string }) => v.text).join(' ');
  return data.text || '';
}

/**
 * The bundled KJV marks translator-supplied words with braces — "To Timothy,
 * {my} dearly beloved son". Those braces are typesetting metadata (normally
 * rendered as italics), not scripture, and they were leaking into the reader as
 * literal characters. Keep the words, drop the markers.
 */
function stripSuppliedWordMarkers(text: string): string {
  return text.replace(/[{}]/g, '').replace(/[ \t]{2,}/g, ' ');
}

async function fetchKJV(passage: string): Promise<string> {
  // Try local offline KJV first
  const match = passage.match(/^(.+?)\s+(\d+)$/);
  if (!match) return '';
  const [, book, ch] = match;
  // Bundled KJV dirs use underscores ("1_john", "song_of_solomon") and plural "psalms".
  let bookSlug = book.toLowerCase().replace(/\s+/g, '_');
  if (bookSlug === 'psalm') bookSlug = 'psalms';
  try {
    const res = await fetch(`/bible/kjv/${bookSlug}/${ch}.json`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        return stripSuppliedWordMarkers(data.map((v: { text: string }) => v.text).join(' '));
      }
      // Bundled KJV chapter files are object-shaped: { book, chapter, verses: string[] }
      if (Array.isArray(data.verses)) {
        return stripSuppliedWordMarkers(
          data.verses
            .map((v: string | { text: string }) => (typeof v === 'string' ? v : v.text))
            .join(' ')
        );
      }
      return stripSuppliedWordMarkers(data.text || '');
    }
  } catch {
    // Fall through to API
  }
  // If no local file, try bolls as KJV
  return fetchBolls(passage, 'KJV');
}

// The old offline fallback returned this literal string as if it were passage text;
// it was then cached, rendered as scripture, and could be marked as read. It is now
// treated as a failed fetch everywhere (HomeScreen also blacklists it for audio).
const OFFLINE_PLACEHOLDER = 'World English Bible text — loading...';

// World English Bible (public domain). Fetched via Bolls, like the other non-ESV/NLT
// translations, so selecting WEB shows real text. If the source is unreachable
// (e.g. offline) this now REJECTS instead of returning a placeholder — every
// fetchPassage caller already treats a rejection as "no text yet". The bundled
// offline reader is KJV (fetchKJV); bundling WEB for offline is a separate follow-up.
async function fetchWEB(passage: string): Promise<string> {
  return fetchBolls(passage, 'WEB');
}

async function fallbackFetch(passage: string, originalTranslation: TranslationCode): Promise<string> {
  // Fallback chain: KJV offline → WEB via Bolls.
  // Each branch records what it actually served so the reader can say so.
  if (originalTranslation !== 'KJV') {
    try {
      const kjv = await fetchKJV(passage);
      if (kjv) {
        verseCacheSet(`${passage}_KJV`, kjv);
        recordServed(passage, originalTranslation, 'KJV');
        return kjv;
      }
    } catch {
      // Fall through
    }
  }
  // Terminal fallback. If this also fails (fully offline, no bundled KJV for the
  // ref) the rejection propagates: no text is better than fake text.
  const web = await fetchWEB(passage);
  if (!web || !web.trim()) throw new Error(`No text available: ${passage}`);
  recordServed(passage, originalTranslation, 'WEB');
  return web;
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
  // text.length discriminator: callers pass different slices of the same passage
  // (e.g. a short preload slice vs the full playback text). Without it they share
  // a cache entry and TTS playback serves whichever slice was fetched first —
  // long chapters were cutting off ~1/3 in when a 5,000-char preload won the race.
  const cacheKey = `${passageRef || text.slice(0, 60)}_${translation}_${text.length}`;

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
    const res = await fetch(`${API_BASE}/api/polly-tts`, {
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

  // Helper: ElevenLabs TTS — use turbo_v2_5 (multilingual) for non-English to avoid Netlify timeout
  const tryElevenLabs = async (): Promise<string | null> => {
    const body: Record<string, string> = { text: cleanText.slice(0, 20000) };
    if (useNativeVoiceFirst) body.modelId = 'eleven_turbo_v2_5';
    const res = await fetch(`${API_BASE}/api/elevenlabs-tts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
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
// The esv-audio function now 302-redirects to the mp3 on audio.esv.org instead of
// buffering it (whole-chapter base64 bodies blew Netlify's 6MB response cap — Psalm
// 119, Luke 11, John 11 all 502'd and silently degraded to TTS). We ask for the
// redirect target as JSON (a cross-origin fetch can't follow the redirect — no CORS
// on audio.esv.org) and hand that URL straight to the audio element, which media-src
// CSP allows on both futuresdailyword.com and the futures.church embed.
async function _tryESVAudioRef(ref: string): Promise<string | null> {
  const res = await fetch(`${API_BASE}/api/esv-audio?q=${encodeURIComponent(ref)}&format=json`);
  if (!res.ok) return null;
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    const data = await res.json().catch(() => null);
    const url = typeof data?.url === 'string' ? data.url : '';
    // Only ever play audio from ESV's own host — anything else won't pass CSP.
    return url.startsWith('https://audio.esv.org/') ? url : null;
  }
  // Defensive: the function may still proxy small audio bodies directly.
  const blob = await res.blob();
  if (blob.size > 1000) return URL.createObjectURL(blob);
  return null;
}

async function _tryESVAudio(passageRef: string): Promise<string | null> {
  try {
    const url = await _tryESVAudioRef(passageRef);
    if (url) return url;
    // Try first individual ref if combined failed
    const refs = passageRef.split(/[;,]/).map(r => r.trim()).filter(Boolean);
    if (refs.length > 1) {
      return await _tryESVAudioRef(refs[0]);
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

// ── AI commentary fallback ──────────────────────────────────────────────────
// The curated commentary set (data/commentary.ts) only covers ~20 chapters. For
// every other passage the Commentary tab used to dead-end on "No commentary
// available". This generates a concise pastoral commentary via the Claude
// function and caches it (in-memory + localStorage, 30-day TTL) so repeat opens
// are instant and don't re-bill.
const AI_COMMENTARY_TTL = 1000 * 60 * 60 * 24 * 30; // 30 days
const AI_COMMENTARY_MAX = 80; // cap stored entries so a heavy user can't exhaust quota
const aiCommentaryInFlight = new Map<string, Promise<string>>();

/** Evict the oldest dw_ai_commentary_* entries (and any expired ones) so the cache
 *  stays bounded — localStorage has no automatic eviction. */
function pruneAICommentaryCache() {
  try {
    const entries: Array<{ key: string; ts: number }> = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || !k.startsWith('dw_ai_commentary_')) continue;
      let ts = 0;
      try { ts = JSON.parse(localStorage.getItem(k) || '{}').ts || 0; } catch { /* treat as oldest */ }
      if (ts && Date.now() - ts >= AI_COMMENTARY_TTL) { localStorage.removeItem(k); continue; }
      entries.push({ key: k, ts });
    }
    if (entries.length >= AI_COMMENTARY_MAX) {
      entries.sort((a, b) => a.ts - b.ts); // oldest first
      const toEvict = entries.length - AI_COMMENTARY_MAX + 1; // make room for the new write
      for (let i = 0; i < toEvict; i++) localStorage.removeItem(entries[i].key);
    }
  } catch { /* ignore */ }
}

export async function fetchAICommentary(passageRef: string, lang: string = 'en'): Promise<string> {
  const ref = passageRef.trim();
  const cacheKey = `dw_ai_commentary_${ref}_${lang}`.replace(/\s+/g, '_');

  // localStorage cache (survives reloads; the real cost-saver)
  try {
    const raw = localStorage.getItem(cacheKey);
    if (raw) {
      const cached = JSON.parse(raw);
      if (cached?.text && Date.now() - cached.ts < AI_COMMENTARY_TTL) return cached.text;
    }
  } catch { /* ignore */ }

  // Deduplicate concurrent requests for the same passage
  if (aiCommentaryInFlight.has(cacheKey)) return aiCommentaryInFlight.get(cacheKey)!;

  const request = (async () => {
    const langName = lang === 'es' ? 'Spanish' : lang === 'pt' ? 'Portuguese' : lang === 'id' ? 'Indonesian' : 'English';
    const system =
      `You are a warm, trustworthy Bible commentator for Futures Church Daily Word. ` +
      `Write a concise commentary on the passage the user names: explain its context and ` +
      `meaning, surface one original-language or cross-reference insight where it helps, and ` +
      `close with a sentence of application. 2-3 short paragraphs, pastoral and clear, no ` +
      `headings or lists. Respond in ${langName}.`;
    const res = await fetch(`${API_BASE}/.netlify/functions/claude`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: `Give commentary on ${ref}.` }],
        system,
        max_tokens: 500,
      }),
    });
    if (!res.ok) throw new Error(`AI commentary error: ${res.status}`);
    const data = await res.json();
    const text: string = data?.content?.[0]?.text || '';
    if (!text) throw new Error('Empty AI commentary');
    pruneAICommentaryCache();
    try { localStorage.setItem(cacheKey, JSON.stringify({ text, ts: Date.now() })); } catch { /* quota */ }
    return text;
  })();

  aiCommentaryInFlight.set(cacheKey, request);
  try {
    return await request;
  } finally {
    aiCommentaryInFlight.delete(cacheKey);
  }
}

/** Word → Strong's numbers for a passage, from bolls' KJV S-tags (via /api/bolls
 *  strongs=1). Instant Gk/Heb lookups: tapping a word resolves locally instead of
 *  costing a Bible-AI call. ESV↔KJV wording differs, so misses are expected —
 *  callers fall back to the AI path for unmatched words. Cached per passage. */
export interface StrongsMap { byWord: Record<string, string[]>; testament: 'OT' | 'NT'; }
const strongsMapCache = new Map<string, StrongsMap>();
export async function fetchStrongsMap(passage: string): Promise<StrongsMap | null> {
  const key = passage.trim().toLowerCase();
  const hit = strongsMapCache.get(key);
  if (hit) return hit;
  try {
    const res = await fetch(`${API_BASE}/api/bolls?q=${encodeURIComponent(passage)}&strongs=1`);
    if (!res.ok) return null;
    const data = await res.json();
    const text: string = data.passages?.[0] || '';
    const testament: 'OT' | 'NT' = data.testament === 'OT' ? 'OT' : 'NT';
    if (!text) return null;
    const prefix = testament === 'OT' ? 'H' : 'G';
    const byWord: Record<string, string[]> = {};
    // Tokens look like: word{{S:1234}} — possibly several tags per word.
    const re = /([A-Za-z][A-Za-z']*)((?:\{\{S:\d+\}\})+)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const w = m[1].toLowerCase();
      const nums = Array.from(m[2].matchAll(/\{\{S:(\d+)\}\}/g), (t) => prefix + t[1]);
      if (!byWord[w]) byWord[w] = [];
      for (const n of nums) if (!byWord[w].includes(n)) byWord[w].push(n);
    }
    const map = { byWord, testament };
    strongsMapCache.set(key, map);
    return map;
  } catch { return null; }
}
