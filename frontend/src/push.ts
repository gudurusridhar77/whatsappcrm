import apiClient from './api/client';

// Convert a base64url VAPID key to the Uint8Array the Push API expects.
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

let inFlight = false;

/**
 * Register the service worker and subscribe this device to Web Push.
 * Safe to call repeatedly — it reuses any existing subscription and no-ops
 * when push isn't supported, not configured on the backend, or not permitted.
 *
 * Note: on iOS Safari, Notification.requestPermission() requires the site to be
 * installed (Add to Home Screen) and a user gesture — call enablePushNotifications()
 * from a button there.
 */
export async function initPushNotifications(): Promise<void> {
  if (inFlight) return;
  inFlight = true;
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
      return;
    }

    // Is push configured on the backend? (also gives us the VAPID public key)
    const { data } = await apiClient.get<{ enabled: boolean; publicKey: string }>('/api/v1/push/public-key');
    if (!data?.enabled || !data?.publicKey) return;

    const registration = await navigator.serviceWorker.register('/sw.js');

    let permission = Notification.permission;
    if (permission === 'default') {
      permission = await Notification.requestPermission();
    }
    if (permission !== 'granted') return;

    await navigator.serviceWorker.ready;

    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(data.publicKey),
      });
    }

    const json: any = subscription.toJSON();
    await apiClient.post('/api/v1/push/subscribe', {
      endpoint: subscription.endpoint,
      keys: { p256dh: json.keys?.p256dh, auth: json.keys?.auth },
    });
  } catch (e) {
    // Non-fatal — the app works fine without push.
    // eslint-disable-next-line no-console
    console.warn('Push init failed', e);
  } finally {
    inFlight = false;
  }
}

// Explicit entry point for a user-gesture button (recommended for iOS).
export const enablePushNotifications = initPushNotifications;
