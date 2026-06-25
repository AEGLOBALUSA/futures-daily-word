/**
 * Lightweight haptic feedback. navigator.vibrate is supported on Android/Chrome
 * (a progressive enhancement — iOS Safari ignores it). Wrapped so callers don't
 * each repeat the guard. Native (Capacitor) builds can later route this to the
 * Haptics plugin for iOS support.
 */
export function hapticTap(ms = 8): void {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(ms);
    }
  } catch { /* ignore */ }
}
