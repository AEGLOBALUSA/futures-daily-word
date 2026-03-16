/**
 * Global Audio Player — single-element, iOS-safe.
 *
 * Architecture:
 *   - ONE Audio element, reused for all playback.
 *   - Unlocked on first user tap via a 0.1s generated silence (PCM, no external fetch).
 *   - Audio data stored as blob: URLs (NOT data URIs — data URIs choke on large files).
 *   - play() waits for 'canplaythrough' before calling audio.play().
 *   - No audioManager; no concurrent Audio elements; no revocation races.
 *
 * Usage from a click handler:
 *   AP.unlock();                          // synchronous — MUST be first
 *   const src = await AP.fetchAudioSrc(text, 'ESV', ref);
 *   if (src) await AP.play('passage-key', src);
 */

// ── Types ──
type PlaybackState = 'idle' | 'loading' | 'playing';
type StateListener = (state: PlaybackState, passage?: string) => void;

// ── Module state ──
let audioEl: HTMLAudioElement | null = null;
let unlocked = false;
let unlockVersion = 0; // increments on each unlock call to detect stale callbacks
let currentPassage: string | null = null;
let state: PlaybackState = 'idle';
const listeners = new Set<StateListener>();

function setState(s: PlaybackState, passage?: string | null) {
  state = s;
  currentPassage = passage ?? null;
  listeners.forEach(fn => { try { fn(state, currentPassage ?? undefined); } catch {} });
}

// ── Public API: subscriptions ──

export function onStateChange(fn: StateListener): () => void {
  listeners.add(fn);
  fn(state, currentPassage ?? undefined);
  return () => listeners.delete(fn);
}

export function isPlaying(passage?: string): boolean {
  if (!passage) return state === 'playing';
  return state === 'playing' && currentPassage === passage;
}

export function isLoading(): boolean { return state === 'loading'; }
export function getCurrentPassage(): string | null { return currentPassage; }

// ── Singleton element ──

function getAudio(): HTMLAudioElement {
  if (!audioEl) {
    audioEl = new Audio();
    audioEl.preload = 'auto';
    // Persist ended/pause handlers across src changes
    audioEl.addEventListener('ended', () => {
      if (state === 'playing') setState('idle');
    });
  }
  return audioEl;
}

// ── Generate a tiny valid WAV in memory (no base64, no fetch) ──

function generateSilenceBlob(): Blob {
  // 44-byte WAV header + 882 bytes of silence (0.01s at 44100 Hz, 16-bit mono)
  const numSamples = 441; // ~10ms
  const byteRate = 88200;
  const dataSize = numSamples * 2;
  const fileSize = 36 + dataSize;
  const buf = new ArrayBuffer(44 + dataSize);
  const v = new DataView(buf);
  // RIFF header
  v.setUint32(0, 0x52494646, false); // "RIFF"
  v.setUint32(4, fileSize, true);
  v.setUint32(8, 0x57415645, false); // "WAVE"
  // fmt chunk
  v.setUint32(12, 0x666d7420, false); // "fmt "
  v.setUint32(16, 16, true); // chunk size
  v.setUint16(20, 1, true); // PCM
  v.setUint16(22, 1, true); // mono
  v.setUint32(24, 44100, true); // sample rate
  v.setUint32(28, byteRate, true);
  v.setUint16(32, 2, true); // block align
  v.setUint16(34, 16, true); // bits per sample
  // data chunk
  v.setUint32(36, 0x64617461, false); // "data"
  v.setUint32(40, dataSize, true);
  // samples are all zeros = silence
  return new Blob([buf], { type: 'audio/wav' });
}

// ── Unlock — MUST be called synchronously in a tap/click handler ──

export function unlock(): void {
  if (unlocked) return;
  const v = ++unlockVersion;
  const audio = getAudio();
  const silenceUrl = URL.createObjectURL(generateSilenceBlob());
  audio.src = silenceUrl;
  const p = audio.play();
  if (p && p.then) {
    p.then(() => {
      unlocked = true;
      // Only pause if no real playback has started since this unlock
      if (unlockVersion === v && state !== 'loading' && state !== 'playing') {
        audio.pause();
      }
      URL.revokeObjectURL(silenceUrl);
    }).catch(() => {
      URL.revokeObjectURL(silenceUrl);
    });
  }
}

// ── Stop ──

export function stop(): void {
  const audio = getAudio();
  try { audio.pause(); } catch {}
  // Don't removeAttribute('src') or load() — that fires error events.
  // Just pause is enough; play() will overwrite src.
  setState('idle');
}

// ── Fetch audio src as blob URL ──

export async function fetchAudioSrc(
  text: string,
  translation: string,
  passageRef?: string
): Promise<string | null> {
  const cleanText = text.replace(/\[\d+\]\s*/g, '');

  // ── 1. ESV native human-read audio ──
  if (translation === 'ESV' && passageRef) {
    try {
      const url = `/api/esv-audio?q=${encodeURIComponent(passageRef)}`;
      const res = await fetch(url);
      if (res.ok) {
        const blob = await res.blob();
        if (blob.size > 1000) return URL.createObjectURL(blob);
      }
      // Try first individual ref if combined ref failed
      const refs = passageRef.split(/[;,]/).map(r => r.trim()).filter(Boolean);
      if (refs.length > 1) {
        const res2 = await fetch(`/api/esv-audio?q=${encodeURIComponent(refs[0])}`);
        if (res2.ok) {
          const blob2 = await res2.blob();
          if (blob2.size > 1000) return URL.createObjectURL(blob2);
        }
      }
    } catch { /* fall through */ }
  }

  if (!cleanText) return null;

  // ── 2. ElevenLabs ──
  try {
    const res = await fetch('/api/elevenlabs-tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: cleanText.slice(0, 20000) }),
    });
    if (res.ok) {
      const blob = await res.blob();
      if (blob.size > 500) return URL.createObjectURL(blob);
    }
  } catch { /* fall through */ }

  // ── 3. AWS Polly ──
  try {
    const lang = localStorage.getItem('dw_lang') || 'en';
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
  } catch { /* */ }

  return null;
}

// ── Play ──

export async function play(key: string, blobUrl: string): Promise<void> {
  const audio = getAudio();

  // Toggle off
  if (state === 'playing' && currentPassage === key) { stop(); return; }
  // Stop anything else
  if (state !== 'idle') stop();

  setState('loading', key);

  // Set src and load
  audio.src = blobUrl;

  try {
    await new Promise<void>((resolve, reject) => {
      const onReady = () => { cleanup(); resolve(); };
      const onError = () => { cleanup(); reject(new Error('load failed')); };
      const cleanup = () => {
        audio.removeEventListener('canplaythrough', onReady);
        audio.removeEventListener('error', onError);
        clearTimeout(timer);
      };
      audio.addEventListener('canplaythrough', onReady, { once: true });
      audio.addEventListener('error', onError, { once: true });
      audio.load();
      // Safety: if canplaythrough never fires, try after 3s
      const timer = setTimeout(onReady, 3000);
    });

    // Only play if we're still the active request
    if (currentPassage !== key) return;

    await audio.play();
    unlocked = true;
    setState('playing', key);

  } catch (err) {
    console.error('[AudioPlayer]', err);
    setState('idle');
  }
}
