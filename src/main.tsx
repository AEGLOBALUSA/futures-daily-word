import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Apply saved theme or OS preference before React renders (avoids flash)
const savedTheme = localStorage.getItem('theme');
if (savedTheme) {
  document.documentElement.setAttribute('data-theme', savedTheme);
  } else if (window.matchMedia('(prefers-color-scheme: light)').matches) {
    document.documentElement.setAttribute('data-theme', 'light');
    }

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Capture install prompt for PWA install banner
let deferredPrompt: Event | null = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  window.dispatchEvent(new CustomEvent('pwa-install-available'));
});

// Expose install trigger for components
(window as any).__pwaInstall = async () => {
  if (!deferredPrompt) return false;
  (deferredPrompt as any).prompt();
  const result = await (deferredPrompt as any).userChoice;
  deferredPrompt = null;
  return result.outcome === 'accepted';
};

// Register service worker — version query forces cache bust on deploy
const SW_VERSION = 'v65';
if ('serviceWorker' in navigator) {
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
