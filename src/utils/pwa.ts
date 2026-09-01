/**
 * PWA install helpers.
 *
 * Verified gap (2026-09): main.tsx captures `beforeinstallprompt` and calls
 * preventDefault(), then exposes window.__pwaInstall — but nothing in the UI
 * ever called it. Chrome's native mini-infobar is suppressed and iOS never
 * had instructions. These helpers are the single place that answers
 * "are we installed / can we prompt / is this iOS?".
 */

export function isStandaloneDisplay(): boolean {
  try {
    if (window.matchMedia('(display-mode: standalone)').matches) return true;
    const nav = navigator as Navigator & { standalone?: boolean };
    if (nav.standalone === true) return true;
  } catch { /* private mode / no matchMedia */ }
  return false;
}

/** iPhone / iPad (incl. iPadOS desktop-UA) — no beforeinstallprompt. */
export function isIosDevice(): boolean {
  try {
    const ua = navigator.userAgent || '';
    if (/iPad|iPhone|iPod/.test(ua)) return true;
    // iPadOS 13+ reports as Macintosh + touch
    if (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) return true;
  } catch { /* ignore */ }
  return false;
}

/** Framed inside futures.church (or any iframe) — never nudge install there. */
export function isEmbeddedApp(): boolean {
  try {
    if (new URLSearchParams(window.location.search).get('embed') === '1') return true;
    return window.self !== window.top;
  } catch {
    return true;
  }
}

export function canNativeInstall(): boolean {
  try {
    return !!(window as unknown as { __pwaCanInstall?: boolean }).__pwaCanInstall;
  } catch {
    return false;
  }
}

export async function promptPwaInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  const fn = (window as unknown as { __pwaInstall?: () => Promise<boolean> }).__pwaInstall;
  if (!fn) return 'unavailable';
  try {
    const accepted = await fn();
    return accepted ? 'accepted' : 'dismissed';
  } catch {
    return 'unavailable';
  }
}

export const PWA_DISMISS_KEY = 'dw_pwa_install_dismissed';

export function isInstallDismissed(): boolean {
  try { return localStorage.getItem(PWA_DISMISS_KEY) === '1'; } catch { return false; }
}

export function dismissInstall(): void {
  try { localStorage.setItem(PWA_DISMISS_KEY, '1'); } catch { /* quota */ }
}
