import { StrictMode, lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { flushSync } from './utils/cloudSync'
import { LS } from './utils/storage'

const StaffApp = lazy(() => import('./staff/StaffApp').then(m => ({ default: m.StaffApp })));
const IS_STAFF = (() => {
  try {
    const p = window.location.pathname.replace(/\/+$/, '') || '/';
    return p === '/staff';
  } catch {
    return false;
  }
})();
if (IS_STAFF) {
  document.documentElement.classList.add('staff-route');
}

// Apply saved theme or OS preference before React renders (avoids flash).
// Must read the SAME key ThemeContext writes (dw_dark = 'true'|'false'); the old
// code read a never-written 'theme' key, so a returning user's saved theme was
// ignored on first paint and flashed the wrong theme before React corrected it.
// Reflect the saved UI language on <html lang> so screen readers announce content
// in the right language (index.html hardcodes lang="en" but the app ships es/pt/id).
try {
  const lang = localStorage.getItem(LS.lang);
  if (lang) document.documentElement.lang = lang;
} catch { /* ignore */ }

const savedDark = localStorage.getItem(LS.dark);
if (savedDark !== null) {
  document.documentElement.setAttribute('data-theme', savedDark === 'true' ? 'dark' : 'light');
} else if (window.matchMedia('(prefers-color-scheme: light)').matches) {
  document.documentElement.setAttribute('data-theme', 'light');
}

// ── Global error handler — catches errors outside React error boundaries ──
window.addEventListener('error', (event) => {
  console.error('[Global]', event.error || event.message);
});
window.addEventListener('unhandledrejection', (event) => {
  console.error('[Global] Unhandled promise rejection:', event.reason);
});

// ── Cloud sync flush — push pending data when user backgrounds or closes the app ──
// visibilitychange fires reliably on tab switch, app switch, and before beforeunload
function tryFlushSync() {
  try {
    const profile = JSON.parse(localStorage.getItem('dw_profile') || '{}');
    if (profile.email) flushSync(profile.email);
  } catch { /* silent */ }
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') tryFlushSync();
});
window.addEventListener('pagehide', tryFlushSync);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {IS_STAFF ? (
      <Suspense fallback={null}>
        <StaffApp />
      </Suspense>
    ) : (
      <App />
    )}
  </StrictMode>,
)

// Capture install prompt for PWA install banner.
// preventDefault suppresses Chrome's mini-infobar — the in-app UI
// (PWAInstall) is what actually calls __pwaInstall. Without that UI
// the prompt was captured and then never shown.
let deferredPrompt: Event | null = null;
(window as any).__pwaCanInstall = false;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  (window as any).__pwaCanInstall = true;
  window.dispatchEvent(new CustomEvent('pwa-install-available'));
});

window.addEventListener('appinstalled', () => {
  deferredPrompt = null;
  (window as any).__pwaCanInstall = false;
  window.dispatchEvent(new CustomEvent('pwa-installed'));
});

// Expose install trigger for components
(window as any).__pwaInstall = async () => {
  if (!deferredPrompt) return false;
  (deferredPrompt as any).prompt();
  const result = await (deferredPrompt as any).userChoice;
  deferredPrompt = null;
  (window as any).__pwaCanInstall = false;
  return result.outcome === 'accepted';
};

// Register service worker — version query forces cache bust on deploy.
// App-origin hosts ONLY (mirrors pushSupported() in utils/push.ts): when this
// bundle is served on the church origin (futures.church/daily-word proxy/embed),
// /sw.js resolves to the church's own kill-switch worker — registering it there
// wiped every church-origin cache (incl. the /listen offline shell) on each visit.
const SW_VERSION = 'v65';
const SW_HOSTS = ['futuresdailyword.com', 'www.futuresdailyword.com', 'futures-daily-word.netlify.app', 'localhost', '127.0.0.1'];
if ('serviceWorker' in navigator && SW_HOSTS.includes(location.hostname)) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(`/sw.js?v=${SW_VERSION}`, { scope: '/' })
      .then((reg) => {
        // If a new SW is waiting, tell it to activate immediately
        if (reg.waiting) {
          reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
        // Listen for new SW arriving and activate it immediately
        reg.addEventListener('updatefound', () => {
          const newSW = reg.installing;
          if (newSW) {
            newSW.addEventListener('statechange', () => {
              if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
                newSW.postMessage({ type: 'SKIP_WAITING' });
              }
            });
          }
        });
        // Check for updates on load, then every 30 minutes (gentle, not aggressive)
        reg.update();
        setInterval(() => reg.update(), 30 * 60 * 1000);
      })
      .catch((err) => console.warn('SW registration failed:', err));
  });

  // Listen for gentle SW_UPDATED message — reload only on next natural navigation
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data?.type === 'SW_UPDATED') {
      // New version available — will apply on next page load
    }
  });

  // When the new SW takes control, reload the page
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    window.location.reload();
  });
}
