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

export async function subscribePush(email: string): Promise<boolean> {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.log('Push not supported');
      return false;
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log('Push permission denied');
      return false;
    }

    const registration = await navigator.serviceWorker.ready;

    // Check for existing subscription
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
      });
    }

    // Register with the server. The function is `push-subscribe` (NOT subscribe-push —
    // that route 404'd, which is why subscriptions silently never persisted). It needs
    // an explicit action, plus timezone + preferred hour so the daily cron can fire at
    // the right local time.
    const res = await fetch(`${API_BASE}/api/push-subscribe`, {
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

    if (res.ok) {
      localStorage.setItem('dw_push', 'subscribed');
      return true;
    }
    return false;
  } catch (err) {
    console.warn('Push subscription failed:', err);
    return false;
  }
}

export async function unsubscribePush(): Promise<void> {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      // Tell the server to stop sending BEFORE dropping the local subscription,
      // otherwise the cron keeps trying to push to a dead endpoint.
      try {
        await fetch(`${API_BASE}/api/push-subscribe`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'unsubscribe', subscription: subscription.toJSON() }),
        });
      } catch { /* best-effort */ }
      await subscription.unsubscribe();
    }
    localStorage.removeItem('dw_push');
  } catch {
    // Silent fail
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
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) return false;
    const res = await fetch(`${API_BASE}/api/push-subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'update',
        subscription: subscription.toJSON(),
        preferredHour: hour,
        timezone: getTimeZone(),
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
