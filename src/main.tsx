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
const SW_VERSION = 'v18';
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(`/sw.js?v=${SW_VERSION}`, { scope: '/' })
      .then((reg) => {
        console.log('SW registered:', reg.scope);
        // Force immediate update check on load
        reg.update();
        // Then check for updates every 30 minutes
        setInterval(() => reg.update(), 30 * 60 * 1000);
      })
      .catch((err) => console.warn('SW registration failed:', err));
  });
}
