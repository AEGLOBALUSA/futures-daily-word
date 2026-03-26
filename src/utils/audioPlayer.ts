/**
 * Global Audio Player — single-element, iOS-safe.
 *
 * iOS FIX: play() now calls unlock() synchronously on the tap gesture
 * BEFORE any network fetch, then swaps in real audio after fetch completes.
 * This prevents iOS Safari from expiring the user-gesture permission.
 *
 * Audio fetch priority: ESV.org → ElevenLabs → AWS Polly
 * (Bible Brain + API.Bible disabled until API keys are approved)
 */

type PlaybackState = 'idle' | 'loading' | 'playing' | 'paused';
type StateListener = (state: PlaybackState, passage?: string) => void;

let audioEl: HTMLAudioElement | null = null;
let unlocked = false;
let unlockVersion = 0;
let unlockPromise: Promise<void> | null = null;
let currentPassage: string | null = null;
let state: PlaybackState = 'idle';
const listeners = new Set<StateListener>();
let stopRequested = false;
let _currentBlobUrl: string | null = null;

/**
 * Track the current blob URL.
 * NOTE: We intentionally do NOT revoke blob URLs here because callers
 * (HomeScreen, PlansScreen, etc.) cache them in audioSrcCache Maps.
 * Revoking a cached URL causes silent playback failures when the user
 * replays a passage. Blob URLs are lightweight references — the browser
 * garbage-collects the backing data on page unload.
 */
function revokeCurrentBlob() {
  _currentBlobUrl = null;
}

/* ------------------------------------------------------------------ */
/*  State helpers                                                      */
/* ------------------------------------------------------------------ */

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

export function isPaused(passage?: string): boolean {
  if (!passage) return state === 'paused';
  return state === 'paused' && currentPassage === passage;
}

export function isLoading(): boolean { return state === 'loading'; }
export function getCurrentPassage(): string | null { return currentPassage; }
export function getState(): PlaybackState { return state; }

/* ------------------------------------------------------------------ */
/*  Audio element singleton                                            */
/* ------------------------------------------------------------------ */

function getAudio(): HTMLAudioElement {
  if (!audioEl) {
    audioEl = new Audio();
    audioEl.preload = 'auto';
    audioEl.setAttribute('playsinline', '');
    audioEl.addEventListener('ended', () => {
      if (state === 'playing' || state === 'paused') setState('idle');
    });
  }
  return audioEl;
}

/* ------------------------------------------------------------------ */
/*  Silence blob for iOS unlock                                        */
/* ------------------------------------------------------------------ */

function generateSilenceBlob(): Blob {
  const numSamples = 44100;          // 10 ms of silence at 44.1 kHz
  const dataSize = numSamples * 2;
  const fileSize = 36 + dataSize;
  const buf = new ArrayBuffer(44 + dataSize);
  const v = new DataView(buf);
  v.setUint32(0, 0x52494646, false);   // "RIFF"
  v.setUint32(4, fileSize, true);
  v.setUint32(8, 0x57415645, false);   // "WAVE"
  v.setUint32(12, 0x666d7420, false);  // "fmt "
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);            // PCM
  v.setUint16(22, 1, true);            // mono
  v.setUint32(24, 44100, true);        // sample rate
  v.setUint32(28, 88200, true);        // byte rate
  v.setUint16(32, 2, true);            // block align
  v.setUint16(34, 16, true);           // bits per sample
  v.setUint32(36, 0x64617461, false);  // "data"
  v.setUint32(40, dataSize, true);
  return new Blob([buf], { type: 'audio/wav' });
}

/* ------------------------------------------------------------------ */
/*  iOS unlock — MUST be called synchronously inside a tap handler     */
/* ------------------------------------------------------------------ */

export function unlock(): void {
  if (unlocked) return;
  ++unlockVersion;
  const audio = getAudio();
  const silenceUrl = URL.createObjectURL(generateSilenceBlob());
  audio.src = silenceUrl;
  const p = audio.play();
  if (p && p.then) {
    unlockPromise = p.then(() => {
      unlocked = true;
          // iOS FIX: Do NOT pause after unlock — the silence blob is short
          // and pausing here can revoke the audio session before playUrl fires.
      URL.revokeObjectURL(silenceUrl);
    }).catch(() => {
      URL.revokeObjectURL(silenceUrl);
    }).finally(() => {
      unlockPromise = null;
    });
  }
}

/* ------------------------------------------------------------------ */
/*  Stop                                                               */
/* ------------------------------------------------------------------ */

export function stop(): void {
  const audio = getAudio();
  stopRequested = true;
  try { audio.pause(); } catch {}
  revokeCurrentBlob();
  setState('idle');
}

export function wasStopRequested(): boolean {
  const val = stopRequested;
  stopRequested = false;
  return val;
}

/** Reset without marking as user-stop — used internally for chaining playback */
export function resetForChain(): void {
  const audio = getAudio();
  try { audio.pause(); } catch {}
  revokeCurrentBlob();
  stopRequested = false;
  setState('idle');
}

/* ------------------------------------------------------------------ */
/*  Pause / Resume — keeps position and passage key intact             */
/* ------------------------------------------------------------------ */

export function pause(): void {
  if (state !== 'playing') return;
  const audio = getAudio();
  try { audio.pause(); } catch {}
  setState('paused', currentPassage);
}

export async function resume(): Promise<void> {
  if (state !== 'paused' || !audioEl) return;
  try {
    await audioEl.play();
    setState('playing', currentPassage);
  } catch {
    // iOS retry: re-unlock then restore the original audio source and position.
    // unlock() replaces audio.src with a silence blob, so we must save/restore.
    const savedSrc = audioEl.src;
    const savedTime = audioEl.currentTime;
    unlocked = false;
    unlock();
    if (unlockPromise) { try { await unlockPromise; } catch {} }
    try {
      // Restore the original audio and seek back to where we were
      audioEl.src = savedSrc;
      audioEl.currentTime = savedTime;
      await new Promise<void>((resolve, reject) => {
        const onReady = () => { cleanup(); resolve(); };
        const onError = () => { cleanup(); reject(new Error('reload failed')); };
        const cleanup = () => {
          audioEl!.removeEventListener('canplaythrough', onReady);
          audioEl!.removeEventListener('error', onError);
          clearTimeout(timer);
        };
        audioEl!.addEventListener('canplaythrough', onReady, { once: true });
        audioEl!.addEventListener('error', onError, { once: true });
        audioEl!.load();
        const timer = setTimeout(onReady, 3000);
      });
      await audioEl.play();
      setState('playing', currentPassage);
    } catch (err) {
      console.error('[AudioPlayer] resume failed after retry', err);
      setState('idle');
    }
  }
}

/* ------------------------------------------------------------------ */
/*  Current time / duration — for progress tracking                    */
/* ------------------------------------------------------------------ */

export function getCurrentTime(): number {
  return audioEl?.currentTime ?? 0;
}

export function getDuration(): number {
  return audioEl?.duration ?? 0;
}

export function seekTo(time: number): void {
  if (audioEl) audioEl.currentTime = time;
}

/* ------------------------------------------------------------------ */
/*  Fetch audio source (unchanged API)                                 */
/* ------------------------------------------------------------------ */

export async function fetchAudioSrc(
  text: string,
  translation: string,
  passageRef?: string
): Promise<string | null> {
  const cleanText = text.replace(/\[\d+\]\s*/g, '');

  // 1) ESV native audio
  if (translation === 'ESV' && passageRef) {
    try {
      const res = await fetch(`/api/esv-audio?q=${encodeURIComponent(passageRef)}`);
      if (res.ok) {
        const blob = await res.blob();
        if (blob.size > 1000) return URL.createObjectURL(blob);
      }
      // Try first ref only if multi-ref
      const refs = passageRef.split(/[;,]/).map(r => r.trim()).filter(Boolean);
      if (refs.length > 1) {
        const res2 = await fetch(`/api/esv-audio?q=${encodeURIComponent(refs[0])}`);
        if (res2.ok) {
          const blob2 = await res2.blob();
          if (blob2.size > 1000) return URL.createObjectURL(blob2);
        }
      }
    } catch { }
  }

  if (!cleanText) return null;

  // 2) ElevenLabs TTS
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
  } catch { }

  // 3) AWS Polly fallback
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
  } catch { }

  return null;
}

/* ------------------------------------------------------------------ */
/*  play() — unified entry point for tap handlers (iOS-safe)           */
/*                                                                     */
/*  MUST be called directly from a click/tap handler so that unlock()  */
/*  runs within the user-gesture window.                               */
/* ------------------------------------------------------------------ */

export async function play(
  key: string,
  text: string,
  translation: string,
  passageRef?: string
): Promise<void> {
  // Toggle off if already playing this passage
  if (state === 'playing' && currentPassage === key) { stop(); return; }
  if (state !== 'idle') stop();

  // ── STEP 1: Unlock iOS audio SYNCHRONOUSLY within the tap gesture ──
  unlock();

  // ── STEP 2: Show loading state while we fetch ──
  setState('loading', key);

  // ── STEP 3: Fetch the real audio (network call, 1-3 s) ──
  let blobUrl: string | null = null;
  try {
    blobUrl = await fetchAudioSrc(text, translation, passageRef);
  } catch {
    setState('idle');
    return;
  }

  // Bail if cancelled during fetch (user tapped stop or another passage)
  if (currentPassage !== key) return;

  if (!blobUrl) {
    setState('idle');
    return;
  }

  // ── STEP 4: Wait for silence unlock to finish (if still in flight) ──
  if (unlockPromise) {
    try { await unlockPromise; } catch {}
  }

  // Bail again after await
  if (currentPassage !== key) { setState('idle'); return; }

  // ── STEP 5: Swap in real audio and play on the already-unlocked element ──
  const audio = getAudio();
  revokeCurrentBlob();
  _currentBlobUrl = blobUrl;
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

    // Final cancellation check
    if (currentPassage !== key) return;

    await audio.play();
    unlocked = true;
    setState('playing', key);
  } catch (err) {
    console.error('[AudioPlayer]', err);
    if (currentPassage === key) setState('idle');
  }
}

/* ------------------------------------------------------------------ */
/*  playUrl() — play a pre-fetched blob URL (backward compat)          */
/*                                                                     */
/*  If you already have a blob URL, use this. Otherwise prefer play(). */
/* ------------------------------------------------------------------ */

export async function playUrl(key: string, blobUrl: string): Promise<void> {
  // iOS FIX: ensure audio session is unlocked even when called directly
  unlock();
  if (unlockPromise) {
    try { await unlockPromise; } catch {}
  }

  const audio = getAudio();

  // If user taps the same key while playing, toggle off (user-initiated stop)
  if (state === 'playing' && currentPassage === key) { stop(); return; }
  // For any other non-idle state, reset without killing queues
  if (state !== 'idle') resetForChain();

  setState('loading', key);
  revokeCurrentBlob(); // Free previous blob before setting new one
  _currentBlobUrl = blobUrl;
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
    if (currentPassage !== key) { setState('idle'); return; }
    await audio.play();
    unlocked = true;
    setState('playing', key);
  } catch (err) {
    console.error('[AudioPlayer]', err);
    setState('idle');
  }
}
