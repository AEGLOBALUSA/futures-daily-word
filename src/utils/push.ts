/**
 * Push notification subscription management.
 * Subscribes via Web Push API and registers with /api/subscribe-push.
 */
import { getLang } from './i18n';
import { API_BASE } from './api-base';

const VAPID_PUBLIC_KEY = 'BDqMPaClvGsMmHFaQlEenSflT6NqmOcLYBrFRrVrRJae7Py08WLdQxhfSdkzSRaWCbLqJrdKKz8TnmqT6DqF5J4';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Resolve `p`, but never wait longer than `ms` — falls back to `fallback` on timeout
 * OR rejection. The reminder flow has several calls that can hang or throw on real
 * devices: the Notification permission prompt (iOS/Safari leave the promise pending if
 * the user dismisses it without choosing), the push-service handshake
 * (getSubscription/subscribe on an offline or FCM-blocked network), and the network
 * round-trip to our server. A hung/failed reminder must never trap the UI, so every
 * such await is bounded and always settles to a usable value.
 */
export function withTimeout<T>(p: Promise<T> | T, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    Promise.resolve(p).catch(() => fallback),
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

/** fetch with a hard timeout so a stalled request can't hang the caller. Returns null on abort/error. */
async function fetchWithTimeout(url: string, init: RequestInit, ms = 8000): Promise<Response | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } catch {
    return null; // aborted or network error — treat as failure so callers fall through
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Whether native web-push can actually work here. Push requires a real,
 * controllable service worker — but the church-proxied build at
 * futures.church/daily-word deliberately ships NONE (its /sw.js is a permanent
 * kill-switch, because a root-scope app worker once hijacked the whole church
 * origin). There, `navigator.serviceWorker.ready` never resolves, so we must NOT
 * start the push flow — callers fall back to a calendar reminder instead.
 *
 * Gate on the Daily Word origin (where the real SW is served) plus local dev.
 */
export function pushSupported(): boolean {
  if (typeof navigator === 'undefined' || typeof window === 'undefined') return false;
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;
  if (typeof Notification === 'undefined') return false;
  const h = location.hostname;
  return (
    h === 'futuresdailyword.com' ||
    h === 'www.futuresdailyword.com' ||
    h === 'localhost' ||
    h === '127.0.0.1'
  );
}

export async function subscribePush(email: string): Promise<boolean> {
  try {
    if (!pushSupported()) {
      console.log('Push not supported on this host');
      return false;
    }

    // Bounded: a dismissed permission prompt can leave this promise pending forever.
    const permission = await withTimeout(
      Notification.requestPermission(),
      8000,
      'default' as NotificationPermission,
    );
    if (permission !== 'granted') {
      console.log('Push permission not granted');
      return false;
    }

    // Never await serviceWorker.ready unbounded — on a host without an activating
    // worker it hangs forever (which is exactly what stuck the reminder button).
    const registration = await Promise.race([
      navigator.serviceWorker.ready,
      new Promise<null>((res) => setTimeout(() => res(null), 5000)),
    ]);
    if (!registration) {
      console.warn('No active service worker — push unavailable');
      return false;
    }

    // Check for / create the push subscription. Both calls hit the browser's push
    // service (FCM/GCM) and can hang on an offline or FCM-blocked network — bound them
    // so no caller (Settings included, which has no outer backstop) can spin forever.
    let subscription = await withTimeout(registration.pushManager.getSubscription(), 8000, null);
    if (!subscription) {
      subscription = await withTimeout<PushSubscription | null>(
        registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
        }),
        8000,
        null,
      );
    }
    if (!subscription) {
      console.warn('Push subscribe timed out or was blocked');
      return false;
    }

    // Register with the server. The function is `push-subscribe` (NOT subscribe-push —
    // that route 404'd, which is why subscriptions silently never persisted). It needs
    // an explicit action, plus timezone + preferred hour so the daily cron can fire at
    // the right local time.
    const res = await fetchWithTimeout(`${API_BASE}/api/push-subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'subscribe',
        email,
        subscription: subscription.toJSON(),
        timezone: getTimeZone(),
        preferredHour: getPushHour(),
        lang: getLang(),
      }),
    });

    if (res && res.ok) {
      localStorage.setItem('dw_push', 'subscribed');
      return true;
    }
    return false;
  } catch (err) {
    console.warn('Push subscription failed:', err);
    return false;
  }
}

/**
 * Turn off reminders. Returns true only when we actually settled the state (revoked
 * the subscription, or confirmed there was none). Returns false WITHOUT clearing the
 * local flag if the service worker never became ready — clearing there would be a lie:
 * the endpoint is still live and the cron keeps delivering, so the UI must stay "On"
 * and let the user retry rather than silently diverge from the server.
 */
export async function unsubscribePush(): Promise<boolean> {
  try {
    const registration = await withTimeout(navigator.serviceWorker.ready, 5000, null);
    if (!registration) return false;
    const subscription = await withTimeout(registration.pushManager.getSubscription(), 8000, null);
    if (subscription) {
      // Tell the server to stop sending BEFORE dropping the local subscription,
      // otherwise the cron keeps trying to push to a dead endpoint.
      await fetchWithTimeout(`${API_BASE}/api/push-subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'unsubscribe', subscription: subscription.toJSON() }),
      });
      await subscription.unsubscribe();
    }
    localStorage.removeItem('dw_push');
    return true;
  } catch {
    return false;
  }
}

export function isPushSubscribed(): boolean {
  return localStorage.getItem('dw_push') === 'subscribed';
}

const PUSH_HOUR_KEY = 'dw_push_hour';

/** The user's preferred daily-reminder hour (0–23, local time). Defaults to 7am. */
export function getPushHour(): number {
  const h = parseInt(localStorage.getItem(PUSH_HOUR_KEY) || '7', 10);
  return Number.isFinite(h) && h >= 0 && h <= 23 ? h : 7;
}

function getTimeZone(): string {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York'; }
  catch { return 'America/New_York'; }
}

/** Change the daily-reminder hour for an existing subscription (0–23, local time). */
export async function updatePushTime(hour: number): Promise<boolean> {
  try {
    localStorage.setItem(PUSH_HOUR_KEY, String(hour));
    const registration = await Promise.race([
      navigator.serviceWorker.ready,
      new Promise<null>((res) => setTimeout(() => res(null), 5000)),
    ]);
    if (!registration) return false;
    const subscription = await withTimeout(registration.pushManager.getSubscription(), 8000, null);
    if (!subscription) return false;
    const res = await fetchWithTimeout(`${API_BASE}/api/push-subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'update',
        subscription: subscription.toJSON(),
        preferredHour: hour,
        timezone: getTimeZone(),
      }),
    });
    return !!(res && res.ok);
  } catch {
    return false;
  }
}

/**
 * Google Calendar "add event" link for a recurring DAILY reminder at `hour`
 * (local time). This is the no-service-worker fallback for reminders — used where
 * native push can't run (see pushSupported), e.g. futures.church/daily-word. The
 * event links back to wherever the app is being viewed so the tap lands on the Word.
 */
export function calendarReminderUrl(hour: number): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const now = new Date();
  const day = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
  const start = `${day}T${pad(hour)}0000`;
  const end = `${day}T${pad(hour)}1500`; // 15-min slot
  const back =
    typeof location !== 'undefined'
      ? `${location.origin}${location.pathname}`
      : 'https://futuresdailyword.com/';
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: 'Daily Word',
    details: `Your daily Bible reading from Futures Church.\n${back}`,
    dates: `${start}/${end}`,
    ctz: getTimeZone(),
    recur: 'RRULE:FREQ=DAILY',
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/** Open the recurring-daily calendar reminder in a new tab. Returns true if launched. */
export function openCalendarReminder(hour: number): boolean {
  try {
    localStorage.setItem(PUSH_HOUR_KEY, String(hour));
    window.open(calendarReminderUrl(hour), '_blank', 'noopener,noreferrer');
    return true;
  } catch {
    return false;
  }
}
