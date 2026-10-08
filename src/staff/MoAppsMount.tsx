import { useEffect } from 'react';

declare global {
  interface Window {
    // The slice of the kit contract (design/apps/README.md) this app uses.
    moApps?: {
      set: (config: { app: string; tier?: 'member' | 'pastor' | 'global'; email?: string; lang?: string } | null) => void;
      signinEmail?: () => string | null;
    };
  }
}

const APPS_SRC = '/multiplyos/mo-apps.js';
const APPS_CSS = '/multiplyos/mo-apps.css';

/**
 * Gives the MOS app switcher (mo-apps) its facts for the signed-in staff screens.
 * mo-apps.core.js is loaded first in index.html, on /staff only. The sheet
 * (mo-apps.js, mo-apps.css) is added here, once. Staff are always `member` tier:
 * Daily Word never grants the pastor or global reading. On sign-out (unmount)
 * the switcher forgets everything.
 */
export function MoAppsMount({ email, lang }: { email: string; lang: string }) {
  useEffect(() => {
    if (!document.querySelector(`link[href="${APPS_CSS}"]`)) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = APPS_CSS;
      document.head.appendChild(link);
    }
    if (!document.querySelector(`script[src="${APPS_SRC}"]`)) {
      const script = document.createElement('script');
      script.defer = true;
      script.src = APPS_SRC;
      document.head.appendChild(script);
    }
  }, []);

  useEffect(() => {
    window.moApps?.set({ app: 'dailyword', tier: 'member', email, lang });
  }, [email, lang]);

  useEffect(() => () => { window.moApps?.set(null); }, []);
  return null;
}
