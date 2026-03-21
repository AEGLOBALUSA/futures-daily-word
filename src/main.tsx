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
const SW_VERSION = 'v60';
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
        // Check for updates on load, then every 30 minutes (gentle, not aggressive)
        reg.update();
        setInterval(() => reg.update(), 30 * 60 * 1000);
      })
      .catch((err) => console.warn('SW registration failed:', err));
  });

  // Listen for gentle SW_UPDATED message — reload only on next natural navigation
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data?.type === 'SW_UPDATED') {
      console.log('New version available — will apply on next page load');
    }
  });

  // When the new SW takes control, reload the page
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    window.location.reload();
  });
}
