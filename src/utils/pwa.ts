import { getReadDayCount } from './readDays';

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
    // Either answer settles the ask: the browser will not show its prompt again
    // this visit, so a 'no' is remembered like the banner's own dismiss, and
    // Home's one next step moves on at once (dw-next-refresh).
    if (accepted) markInstalled();
    else dismissInstall();
    try { window.dispatchEvent(new Event('dw-next-refresh')); } catch { /* no window */ }
    return accepted ? 'accepted' : 'dismissed';
  } catch {
    return 'unavailable';
  }
}

export const PWA_DISMISS_KEY = 'dw_pwa_install_dismissed';
/** How many times the home card has been offered. Capped so regulars aren't nagged. */
export const PWA_SHOW_COUNT_KEY = 'dw_pwa_install_shows';
/** Local en-CA date of the last automatic offer. */
export const PWA_LAST_SHOWN_KEY = 'dw_pwa_install_last';
/** This browser session already has the card up — keep it up after we stamp the date. */
export const PWA_SESSION_KEY = 'dw_pwa_install_session';

const INSTALL_MIN_READ_DAYS = 2;
const INSTALL_MAX_SHOWS = 2;
const INSTALL_GAP_DAYS = 14;

function localDay(d = new Date()): string {
  return d.toLocaleDateString('en-CA');
}

function daysBetween(earlier: string, later: string): number {
  const a = Date.parse(`${earlier}T00:00:00`);
  const b = Date.parse(`${later}T00:00:00`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 999;
  return Math.round((b - a) / 86400000);
}

/**
 * Whether the automatic home card may appear.
 * A first reading is not enough — wait until they've come back (2 read-days).
 * Then at most two offers, at least two weeks apart. Settings can always install.
 * A session that already showed the card keeps it until they answer, so stamping
 * today's date doesn't hide it mid-visit.
 */
export function installOfferApplies(): boolean {
  try {
    if (sessionStorage.getItem(PWA_SESSION_KEY) === '1') return true;
  } catch { /* private mode */ }
  try {
    if (getReadDayCount() < INSTALL_MIN_READ_DAYS) return false;
    const shows = Number(localStorage.getItem(PWA_SHOW_COUNT_KEY) || '0');
    if (Number.isFinite(shows) && shows >= INSTALL_MAX_SHOWS) return false;
    const last = localStorage.getItem(PWA_LAST_SHOWN_KEY);
    if (last && daysBetween(last, localDay()) < INSTALL_GAP_DAYS) return false;
    return true;
  } catch {
    return false;
  }
}

/**
 * Call once when the card is actually on screen.
 * Returns true only the first time this session, so analytics fire once
 * even if the card remounts or the browser's install prompt arrives late.
 */
export function noteInstallPromptShown(today = localDay()): boolean {
  let firstThisSession = false;
  try {
    if (sessionStorage.getItem(PWA_SESSION_KEY) !== '1') {
      sessionStorage.setItem(PWA_SESSION_KEY, '1');
      firstThisSession = true;
    }
  } catch { /* ignore */ }
  try {
    const last = localStorage.getItem(PWA_LAST_SHOWN_KEY);
    if (last !== today) {
      const n = Number(localStorage.getItem(PWA_SHOW_COUNT_KEY) || '0');
      localStorage.setItem(PWA_SHOW_COUNT_KEY, String(Number.isFinite(n) ? n + 1 : 1));
      localStorage.setItem(PWA_LAST_SHOWN_KEY, today);
    }
  } catch { /* quota */ }
  return firstThisSession;
}

export function isInstallDismissed(): boolean {
  try { return localStorage.getItem(PWA_DISMISS_KEY) === '1'; } catch { return false; }
}

export function dismissInstall(): void {
  try { localStorage.setItem(PWA_DISMISS_KEY, '1'); } catch { /* quota */ }
}

/**
 * Installed from this browser (the prompt was accepted, or the browser said
 * appinstalled). The page itself is still not standalone, so without this the
 * install ask would still count as due and Home's next step would stall on it.
 */
export const PWA_INSTALLED_KEY = 'dw_pwa_installed';

export function markInstalled(): void {
  try { localStorage.setItem(PWA_INSTALLED_KEY, '1'); } catch { /* quota */ }
}

export function isInstallMarked(): boolean {
  try { return localStorage.getItem(PWA_INSTALLED_KEY) === '1'; } catch { return false; }
}
