/**
 * Global Audio Player — single-element, iOS-safe.
 *
 * Audio fetch priority: ESV.org → ElevenLabs → AWS Polly
 * (Bible Brain + API.Bible disabled until API keys are approved)
 */

type PlaybackState = 'idle' | 'loading' | 'playing';
type StateListener = (state: PlaybackState, passage?: string) => void;

let audioEl: HTMLAudioElement | null = null;
let unlocked = false;
let unlockVersion = 0;
let unlockPromise: Promise<void> | null = null;
let currentPassage: string | null = null;
let state: PlaybackState = 'idle';
const listeners = new Set<StateListener>();

function setState(s: PlaybackState, passage?: string | null) {
  state = s;
  currentPassage = passage ?? null;
  listeners.forEach(fn => {
    try { fn(state, currentPassage ?? undefined); } catch {}
  });
}

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

function getAudio(): HTMLAudioElement {
  if (!audioEl) {
    audioEl = new Audio();
    audioEl.preload = 'auto';
    audioEl.addEventListener('ended', () => {
      if (state === 'playing') setState('idle');
    });
  }
  return audioEl;
}
function generateSilenceBlob(): Blob {
  const numSamples = 441;
  const dataSize = numSamples * 2;
  const fileSize = 36 + dataSize;
  const buf = new ArrayBuffer(44 + dataSize);
  const v = new DataView(buf);
  v.setUint32(0, 0x52494646, false);
  v.setUint32(4, fileSize, true);
  v.setUint32(8, 0x57415645, false);
  v.setUint32(12, 0x666d7420, false);
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, 44100, true);
  v.setUint32(28, 88200, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  v.setUint32(36, 0x64617461, false);
  v.setUint32(40, dataSize, true);
  return new Blob([buf], { type: 'audio/wav' });
}

export function unlock(): void {
  if (unlocked) return;
  const v = ++unlockVersion;
  const audio = getAudio();
  const silenceUrl = URL.createObjectURL(generateSilenceBlob());
  audio.src = silenceUrl;
  const p = audio.play();
  if (p && p.then) {
    unlockPromise = p.then(() => {
      unlocked = true;
      if (unlockVersion === v && state !== 'loading' && state !== 'playing') {
        audio.pause();
      }
      URL.revokeObjectURL(silenceUrl);
    }).catch(() => {
      URL.revokeObjectURL(silenceUrl);
    }).finally(() => {
      unlockPromise = null;
    });
  }
}

export function stop(): void {
  const audio = getAudio();
  try { audio.pause(); } catch {}
  setState('idle');
}
// ── Fetch audio src as blob URL ──
// Chain: ESV.org native → ElevenLabs AI → AWS Polly
export async function fetchAudioSrc(
  text: string,
  translation: string,
  passageRef?: string
): Promise<string | null> {
  const cleanText = text.replace(/\[\d+\]\s*/g, '');

  // ── 1. ESV native human-read audio ──
  if (translation === 'ESV' && passageRef) {
    try {
      const res = await fetch(`/api/esv-audio?q=${encodeURIComponent(passageRef)}`);
      if (res.ok) {
        const blob = await res.blob();
        if (blob.size > 1000) return URL.createObjectURL(blob);
      }
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

  // ── 2. ElevenLabs AI voice ──
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

  // ── 3. AWS Polly neural voice ──
  try {
    const lang = localStorage.getItem('dw_lang') || 'en';
    const voiceId =
      lang === 'es' ? 'Lucia' :
      lang === 'pt' ? 'Camila' :
      lang === 'id' ? 'Andika' : 'Matthew';
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
  // Wait for any pending unlock to finish before touching the audio element
  if (unlockPromise) {
    try { await unlockPromise; } catch {}
  }

  const audio = getAudio();

  if (state === 'playing' && currentPassage === key) { stop(); return; }
  if (state !== 'idle') stop();

  setState('loading', key);
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
      const timer = setTimeout(onReady, 3000);
    });
    if (currentPassage !== key) return;
    await audio.play();
    unlocked = true;
    setState('playing', key);
  } catch (err) {
    console.error('[AudioPlayer]', err);
    setState('idle');
  }
}
