/**
 * Push notification subscription management.
 * Subscribes via Web Push API and registers with /api/subscribe-push.
 */

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

    // Send subscription to server
    const res = await fetch('/api/subscribe-push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        subscription: subscription.toJSON(),
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
