/**
 * Native bridge — wraps Capacitor plugin calls with web fallbacks.
 * Uses runtime checks to avoid build-time dependency on Capacitor plugins.
 * When Capacitor is not present, gracefully falls back to web APIs.
 */

// Detect if running inside Capacitor native shell
export function isNative(): boolean {
  return typeof window !== 'undefined' && !!(window as unknown as Record<string, unknown>).Capacitor;
}

// Get Capacitor plugin from the global Capacitor.Plugins object
function getPlugin(name: string): Record<string, unknown> | null {
  try {
    const cap = (window as unknown as Record<string, unknown>).Capacitor as Record<string, unknown> | undefined;
    if (!cap) return null;
    const plugins = cap.Plugins as Record<string, Record<string, unknown>> | undefined;
    return plugins?.[name] || null;
  } catch {
    return null;
  }
}

/**
 * Share content using native share sheet or Web Share API.
 */
export async function nativeShare(opts: { title: string; text: string; url?: string }): Promise<void> {
  if (isNative()) {
    const share = getPlugin('Share');
    if (share?.share) {
      await (share.share as (opts: Record<string, string>) => Promise<void>)(opts as Record<string, string>);
      return;
    }
  }
  if (navigator.share) {
    await navigator.share(opts);
  } else {
    await navigator.clipboard.writeText(opts.text);
  }
}

/**
 * Trigger a light haptic tap (native only).
 */
export async function hapticTap(): Promise<void> {
  if (!isNative()) return;
  const haptics = getPlugin('Haptics');
  if (haptics?.impact) {
    await (haptics.impact as (opts: { style: string }) => Promise<void>)({ style: 'Light' });
  }
}

/**
 * Request camera access for profile photo (native), or fall back to file input.
 */
export async function takePhoto(): Promise<string | null> {
  if (isNative()) {
    const camera = getPlugin('Camera');
    if (camera?.getPhoto) {
      try {
        const photo = await (camera.getPhoto as (opts: Record<string, unknown>) => Promise<{ dataUrl?: string }>)({
          quality: 85,
          resultType: 'DataUrl',
          source: 'Prompt',
          width: 400,
          height: 400,
          allowEditing: true,
        });
        return photo.dataUrl || null;
      } catch {
        return null;
      }
    }
  }
  // Web fallback — trigger file input
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'user';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) { resolve(null); return; }
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    };
    input.click();
  });
}

/**
 * Register for native push notifications (FCM on Android, APNs on iOS).
 */
export async function registerNativePush(onToken: (token: string) => void): Promise<void> {
  if (!isNative()) return;
  const push = getPlugin('PushNotifications');
  if (!push) return;

  try {
    const reqPerms = push.requestPermissions as () => Promise<{ receive: string }>;
    const permResult = await reqPerms();
    if (permResult.receive !== 'granted') return;

    await (push.register as () => Promise<void>)();

    const addListener = push.addListener as (event: string, cb: (data: Record<string, unknown>) => void) => void;

    addListener('registration', (data) => {
      onToken(data.value as string);
    });

    addListener('registrationError', (err) => {
      console.warn('Native push registration failed:', err);
    });

    addListener('pushNotificationReceived', (notification) => {
      console.log('Push received:', notification);
    });

    addListener('pushNotificationActionPerformed', (action) => {
      console.log('Push action:', action);
      const notif = action.notification as Record<string, unknown> | undefined;
      const data = notif?.data as Record<string, string> | undefined;
      if (data?.url) window.location.href = data.url;
    });
  } catch (err) {
    console.warn('Native push setup failed:', err);
  }
}

/**
 * Set status bar style (native only).
 */
export async function setStatusBarDark(dark: boolean): Promise<void> {
  if (!isNative()) return;
  const statusBar = getPlugin('StatusBar');
  if (!statusBar) return;
  try {
    await (statusBar.setStyle as (opts: { style: string }) => Promise<void>)({ style: dark ? 'DARK' : 'LIGHT' });
    await (statusBar.setBackgroundColor as (opts: { color: string }) => Promise<void>)({ color: dark ? '#0F0F0F' : '#FAF9F7' });
  } catch {
    // Not available
  }
}

/**
 * Hide splash screen (call after app is ready).
 */
export async function hideSplash(): Promise<void> {
  if (!isNative()) return;
  const splash = getPlugin('SplashScreen');
  if (splash?.hide) {
    await (splash.hide as () => Promise<void>)();
  }
}
