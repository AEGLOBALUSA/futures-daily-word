import { useEffect } from 'react';
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
    const content = getMoGuideContent({ isAdmin, role });
    window.__moGuideContent = content;
    window.moGuide?.set(content);
    if (!document.querySelector(`script[src="${GUIDE_SRC}"]`)) {
      const script = document.createElement('script');
      script.defer = true;
      script.src = GUIDE_SRC;
      document.head.appendChild(script);
    }
  }, [isAdmin, role]);
  return null;
}
