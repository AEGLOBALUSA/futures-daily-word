/**
 * Is this tab the one on screen, with the app in front? (B09-11)
 *
 * App keeps visited tabs mounted (hidden and inert), so a hidden Home or
 * Campus tab still renders. A count she has "seen" must only be marked when
 * the card is really on screen: App writes the active tab to
 * document.body.dataset.activeTab and fires 'dw-tab-changed'. Before App has
 * written it (a tab mounts while it is the active one), it reads as showing.
 */
import { useEffect, useState } from 'react';

export function tabShowing(tab: string): boolean {
  try {
    if (typeof document === 'undefined') return false;
    if (document.visibilityState && document.visibilityState !== 'visible') return false;
    const active = document.body?.dataset?.activeTab;
    return !active || active === tab;
  } catch {
    return false;
  }
}

/** Re-renders when the tab or the app's visibility changes; returns tabShowing(tab). */
export function useTabShowing(tab: string): boolean {
  const [, bump] = useState(0);
  useEffect(() => {
    const on = () => bump((n) => n + 1);
    window.addEventListener('dw-tab-changed', on);
    document.addEventListener('visibilitychange', on);
    return () => {
      window.removeEventListener('dw-tab-changed', on);
      document.removeEventListener('visibilitychange', on);
    };
  }, []);
  return tabShowing(tab);
}
