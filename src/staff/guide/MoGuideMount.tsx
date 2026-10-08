import { useEffect } from 'react';
import { getLang } from '../../utils/i18n';
import { getMoGuideContent, type MoGuideContent } from './moGuide';

declare global {
  interface Window {
    __moGuideContent?: MoGuideContent;
    moGuide?: { set: (content: MoGuideContent) => void };
  }
}

const GUIDE_SRC = '/multiplyos/mo-guide.js';

/**
 * Gives the Guide panel its content for the signed-in staff screens. The same
 * index.html also serves the public reader, so the kit script is added here,
 * once, and only when someone is on the staff side.
 */
export function MoGuideMount({ isAdmin, role }: { isAdmin: boolean; role: string }) {
  useEffect(() => {
    const updateContent = () => {
      const content = getMoGuideContent({ isAdmin, role }, getLang());
      window.__moGuideContent = content;
      window.moGuide?.set(content);
    };
    updateContent();
    window.addEventListener('dw-lang-changed', updateContent);
    if (!document.querySelector(`script[src="${GUIDE_SRC}"]`)) {
      const script = document.createElement('script');
      script.defer = true;
      script.src = GUIDE_SRC;
      document.head.appendChild(script);
    }
    return () => window.removeEventListener('dw-lang-changed', updateContent);
  }, [isAdmin, role]);
  return null;
}
