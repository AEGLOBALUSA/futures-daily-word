// Hand-offs to the MOS device lock (public/multiplyos/mo-lock.js). The lock is loaded on /staff only,
// so on the congregation reader these work on the device's own storage and cookie, never the kit.

/** A staff session started outside /staff (reader pastor sign-in): the kit reads this one-shot cookie on its next load. */
export function markLockSignedIn() {
  try { document.cookie = `mo-lock-signedin=${Date.now()}; max-age=60; path=/; samesite=lax`; } catch { /* no cookie */ }
}

/** A staff session ended: forget this device's Face ID record so a later signed-out /staff visit is never locked. */
export function forgetLockDevice() {
  try { window.MOLock?.clear?.(); } catch { /* kit not loaded */ }
  try {
    localStorage.removeItem('mo-lock:v1');
    localStorage.removeItem('mo-lock:seen');
  } catch { /* no storage */ }
}
