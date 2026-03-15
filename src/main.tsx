import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Register service worker — version query forces cache bust on deploy
const SW_VERSION = 'v28';
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(`/sw.js?v=${SW_VERSION}`, { scope: '/' })
      .then((reg) => {
        console.log('SW registered:', reg.scope);
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
        // Force immediate update check on load
        reg.update();
        // Then check for updates every 5 minutes (more aggressive)
        setInterval(() => reg.update(), 5 * 60 * 1000);
      })
      .catch((err) => console.warn('SW registration failed:', err));
  });
  // When the new SW takes control, reload the page
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    window.location.reload();
  });
}
