import { StrictMode, lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { flushSync } from './utils/cloudSync'
import { LS } from './utils/storage'
import { detectFirstOpenLanguage } from './utils/firstOpenLanguage'
import { consumeCampusParam } from './utils/campusGuess'
import { isStandaloneDisplay, markInstalled } from './utils/pwa'
import { applyUiFlag } from './multiplyos/uiFlag'

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
applyUiFlag({ scoped: IS_STAFF });
if (isStandaloneDisplay()) document.documentElement.setAttribute('data-mo-standalone', '');

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

// B09-07: worked out, not asked. A Spanish, Portuguese or Indonesian phone
// opens in its own language on the very first open (never over a stored
// choice, never a reload); a ?campus=<id> link or QR code becomes a device-only
// guess the Campus tab asks about, and leaves the address bar.
if (!IS_STAFF) {
  detectFirstOpenLanguage();
  consumeCampusParam();
}

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
  markInstalled();
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
const SW_VERSION = 'v66';
const SW_HOSTS = ['futuresdailyword.com', 'www.futuresdailyword.com', 'futures-daily-word.netlify.app', 'localhost', '127.0.0.1'];
if ('serviceWorker' in navigator && SW_HOSTS.includes(location.hostname)) {
  const hadController = !!navigator.serviceWorker.controller;
  let waitingWorker: ServiceWorker | null = null;
  let reloadRequested = false;
  let updateLine: HTMLDivElement | null = null;

  function showUpdate(worker: ServiceWorker | null = null) {
    waitingWorker = worker;
    if (updateLine) return;
    updateLine = document.createElement('div');
    updateLine.className = 'dw-update-line';
    const message = document.createElement('span');
    message.setAttribute('role', 'status');
    message.textContent = 'A new version is ready';
    const reload = document.createElement('button');
    reload.type = 'button';
    reload.textContent = 'Reload';
    reload.addEventListener('click', () => {
      if (reloadRequested) return;
      reloadRequested = true;
      if (waitingWorker?.state === 'installed') {
        try {
          waitingWorker.postMessage({ type: 'SKIP_WAITING' });
        } catch {
          reloadRequested = false;
          message.textContent = 'Could not update. Tap Reload to try again.';
        }
      } else {
        window.location.reload();
      }
    });
    updateLine.append(message, reload);
    document.body.append(updateLine);

    // Follow the visible bars, including taller error states, without covering them.
    let frame = 0;
    const positionLine = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        let bottom = 8;
        document.querySelectorAll('.tab-bar, .mos-phone-tabs, .mos-actionbar, .dw-reading-bar, .dw-next, .dw-plan-main').forEach((bar) => {
          const rect = bar.getBoundingClientRect();
          const style = getComputedStyle(bar);
          if (rect.width && rect.height && rect.top < innerHeight && rect.bottom > 0 &&
              style.visibility !== 'hidden' && style.position === 'fixed' && style.bottom !== 'auto') {
            bottom = Math.max(bottom, innerHeight - rect.top + 8);
          }
        });
        updateLine?.style.setProperty('--dw-update-bottom', `${bottom}px`);
      });
    };
    new MutationObserver(positionLine).observe(document.getElementById('root')!, {
      subtree: true, childList: true, attributes: true, characterData: true,
    });
    window.addEventListener('resize', positionLine);
    positionLine();
  }

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(`/sw.js?v=${SW_VERSION}`, { scope: '/' })
      .then((reg) => {
        if (reg.waiting) showUpdate(reg.waiting);
        // Installation is silent; activation waits for the reader's Reload tap.
        reg.addEventListener('updatefound', () => {
          const newSW = reg.installing;
          if (newSW) {
            newSW.addEventListener('statechange', () => {
              if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
                showUpdate(newSW);
              }
            });
          }
        });
        // Check for updates on load, then every 30 minutes (gentle, not aggressive)
        const checkForUpdate = () => {
          reg.active?.postMessage({ type: 'CHECK_KILL_SWITCH' });
          void reg.update().catch(() => { /* Offline: keep the current shell. */ });
        };
        checkForUpdate();
        setInterval(checkForUpdate, 30 * 60 * 1000);
      })
      .catch((err) => console.warn('SW registration failed:', err));
  });

  // Another tab may activate the update. This tab still waits for its own tap.
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data?.type === 'SW_UPDATED' && hadController && !reloadRequested) showUpdate();
  });

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloadRequested) window.location.reload();
    else if (hadController) showUpdate();
  });
}
