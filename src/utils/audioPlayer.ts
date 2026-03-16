/**
 * Global Audio Player — bulletproof iOS + Android + Desktop playback.
 *
 * Key design decisions:
 *   1. SINGLE reusable Audio element — iOS limits concurrent Audio instances.
 *   2. Audio element is created and .play()ed on first user tap to permanently
 *      unlock it (iOS requires play() in a user gesture).
 *   3. For GET audio (ESV), we point src directly at the URL — no blob.
 *   4. For POST audio (ElevenLabs / Polly), we convert to data URI — avoids
 *      blob: URL issues on iOS PWA/standalone mode.
 *   5. We call .load() after changing src and wait for 'canplaythrough' before
 *      calling .play() — iOS needs the data ready.
 */

type PlaybackState = 'idle' | 'loading' | 'playing';
type StateListener = (state: PlaybackState, passage?: string) => void;

let audioEl: HTMLAudioElement | null = null;
let unlocked = false;
let currentPassage: string | null = null;
let state: PlaybackState = 'idle';
const listeners = new Set<StateListener>();

function notify() {
  listeners.forEach(fn => {
    try { fn(state, currentPassage ?? undefined); } catch { /* */ }
  });
}

/** Subscribe to state changes. Returns unsubscribe function. */
export function onStateChange(fn: StateListener): () => void {
  listeners.add(fn);
  fn(state, currentPassage ?? undefined);
  return () => listeners.delete(fn);
}

/** Get or create the singleton Audio element */
function getAudio(): HTMLAudioElement {
  if (!audioEl) {
    audioEl = new Audio();
    audioEl.preload = 'auto';
  }
  return audioEl;
}

/**
 * MUST be called synchronously inside a click/tap handler.
 * Creates the Audio element and plays a tiny silent WAV to permanently
 * unlock audio on iOS Safari.
 */
export function unlock(): void {
  if (unlocked) return;
  const audio = getAudio();
  // Minimal valid WAV: 44-byte header, 0 bytes of data = silence
  audio.src = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';
  const p = audio.play();
  if (p && p.then) {
    p.then(() => {
      unlocked = true;
      audio.pause();
    }).catch(() => {
      // Could not auto-unlock; will retry on next tap
    });
  }
}

/** Stop whatever is currently playing */
export function stop(): void {
  const audio = getAudio();
  try {
    audio.pause();
    audio.removeAttribute('src');
    audio.load(); // reset
  } catch { /* */ }
  currentPassage = null;
  state = 'idle';
  notify();
  if ('mediaSession' in navigator) {
    (navigator as any).mediaSession.playbackState = 'none';
  }
}

/** Is the given passage currently playing? */
export function isPlaying(passage?: string): boolean {
  if (!passage) return state === 'playing';
  return state === 'playing' && currentPassage === passage;
}

/** Is audio currently loading? */
export function isLoading(): boolean {
  return state === 'loading';
}

/** Get the current passage key */
export function getCurrentPassage(): string | null {
  return currentPassage;
}

/**
 * Convert a POST-fetched blob to a data URI.
 * Data URIs work reliably on iOS PWA; blob: URLs don't always.
 */
async function blobToDataURI(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Fetch audio and return a URL that works as audio.src.
 * - ESV human audio: returns the GET URL directly (no blob needed).
 * - ElevenLabs / Polly: converts response to data URI.
 */
export async function fetchAudioSrc(
  text: string,
  translation: string,
  passageRef?: string
): Promise<string | null> {
  const cleanText = text.replace(/\[\d+\]\s*/g, '');

  // ── 1. ESV native human-read audio (GET — use URL directly) ──
  if (translation === 'ESV' && passageRef) {
    try {
      // Test if the endpoint returns valid audio
      const url = `/api/esv-audio?q=${encodeURIComponent(passageRef)}`;
      const res = await fetch(url);
      if (res.ok) {
        const blob = await res.blob();
        if (blob.size > 1000) {
          return await blobToDataURI(blob);
        }
      }
      // Try first ref alone if combined failed
      const refs = passageRef.split(/[;,]/).map(r => r.trim()).filter(Boolean);
      if (refs.length > 1) {
        const url2 = `/api/esv-audio?q=${encodeURIComponent(refs[0])}`;
        const res2 = await fetch(url2);
        if (res2.ok) {
          const blob2 = await res2.blob();
          if (blob2.size > 1000) {
            return await blobToDataURI(blob2);
          }
        }
      }
    } catch { /* continue */ }
  }

  if (!cleanText) return null;

  // ── 2. ElevenLabs (POST → data URI) ──
  try {
    const res = await fetch('/api/elevenlabs-tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: cleanText.slice(0, 20000) }),
    });
    if (res.ok) {
      const blob = await res.blob();
      if (blob.size > 500) {
        return await blobToDataURI(blob);
      }
    }
  } catch { /* continue */ }

  // ── 3. AWS Polly (POST → data URI) ──
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
      if (blob.size > 500) {
        return await blobToDataURI(blob);
      }
    }
  } catch { /* */ }

  return null;
}

/**
 * Play audio for a passage. Call unlock() first in the same tap handler.
 *
 * @param key      - Unique key for this passage (used for toggle detection)
 * @param audioSrc - The audio src URL/data URI (from fetchAudioSrc)
 */
export async function play(key: string, audioSrc: string): Promise<void> {
  const audio = getAudio();

  // Toggle off if same passage
  if (state === 'playing' && currentPassage === key) {
    stop();
    return;
  }

  // Stop any current playback
  if (state === 'playing' || state === 'loading') {
    stop();
  }

  currentPassage = key;
  state = 'loading';
  notify();

  audio.src = audioSrc;
  audio.load();

  return new Promise<void>((resolve) => {
    const onReady = async () => {
      cleanup();
      try {
        await audio.play();
        state = 'playing';
        unlocked = true;
        notify();
        if ('mediaSession' in navigator) {
          (navigator as any).mediaSession.playbackState = 'playing';
        }
      } catch (err) {
        console.error('[AudioPlayer] play() rejected:', err);
        state = 'idle';
        currentPassage = null;
        notify();
      }
      resolve();
    };

    const onError = () => {
      cleanup();
      console.error('[AudioPlayer] load error');
      state = 'idle';
      currentPassage = null;
      notify();
      resolve();
    };

    const cleanup = () => {
      audio.removeEventListener('canplaythrough', onReady);
      audio.removeEventListener('error', onError);
    };

    audio.addEventListener('canplaythrough', onReady, { once: true });
    audio.addEventListener('error', onError, { once: true });

    // Ended / pause handlers
    audio.onended = () => {
      state = 'idle';
      currentPassage = null;
      notify();
      if ('mediaSession' in navigator) {
        (navigator as any).mediaSession.playbackState = 'none';
      }
    };
    audio.onpause = () => {
      // Only go idle if we didn't trigger it ourselves (e.g. src swap)
      if (state === 'playing') {
        state = 'idle';
        currentPassage = null;
        notify();
      }
    };

    // Safety timeout — if canplaythrough never fires (iOS quirk), try playing after 5s
    setTimeout(() => {
      if (state === 'loading' && currentPassage === key) {
        onReady();
      }
    }, 5000);
  });
}
