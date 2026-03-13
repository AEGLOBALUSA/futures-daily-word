/**
 * Global Audio Manager
 * Tracks all active audio elements so they can be stopped with one tap.
 * Any component that creates an Audio element should register it here.
 */

type Listener = (count: number) => void;

const activeAudios = new Set<HTMLAudioElement>();
const listeners = new Set<Listener>();

function notify() {
  const count = activeAudios.size;
  listeners.forEach(fn => fn(count));
}

/** Register an audio element — it will auto-unregister when it ends or errors */
export function registerAudio(audio: HTMLAudioElement): void {
  activeAudios.add(audio);
  const cleanup = () => {
    activeAudios.delete(audio);
    // Revoke blob URL to free memory
    if (audio.src && audio.src.startsWith('blob:')) {
      try { URL.revokeObjectURL(audio.src); } catch { /* ignore */ }
    }
    notify();
  };
  audio.addEventListener('ended', cleanup, { once: true });
  audio.addEventListener('error', cleanup, { once: true });
  audio.addEventListener('pause', cleanup, { once: true });
  notify();
}

/** Stop and unregister every active audio element */
export function stopAllAudio(): void {
  activeAudios.forEach(audio => {
    try {
      // Revoke blob URL to free memory
      if (audio.src && audio.src.startsWith('blob:')) {
        URL.revokeObjectURL(audio.src);
      }
      audio.pause();
      audio.currentTime = 0;
    } catch { /* ignore */ }
  });
  activeAudios.clear();
  notify();
}

/** Subscribe to active audio count changes. Returns unsubscribe function. */
export function onAudioCountChange(fn: Listener): () => void {
  listeners.add(fn);
  // Immediately fire with current count
  fn(activeAudios.size);
  return () => listeners.delete(fn);
}

/** Get current active audio count */
export function getActiveAudioCount(): number {
  return activeAudios.size;
}
