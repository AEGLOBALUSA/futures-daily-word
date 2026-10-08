/**
 * B09-08: the install ask stops counting as due once this browser installed
 * the app, so Home's one next step moves on instead of stalling on it.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { installApplies } from './setupAsks';
import { markInstalled, dismissInstall, promptPwaInstall, PWA_INSTALLED_KEY, PWA_DISMISS_KEY } from './pwa';

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toLocaleDateString('en-CA');
}

describe('installApplies', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem('dw_reading_done', '1');
    localStorage.setItem('dw_read_days', JSON.stringify({ dates: [daysAgo(3), daysAgo(1)], dropped: 0 }));
  });

  it('due after they have come back, while not installed or dismissed', () => {
    expect(installApplies()).toBe(true);
  });

  it('stays quiet on the first read-day', () => {
    localStorage.setItem('dw_read_days', JSON.stringify({ dates: [daysAgo(0)], dropped: 0 }));
    expect(installApplies()).toBe(false);
  });

  it('offers at most twice, and not again for two weeks', () => {
    localStorage.setItem('dw_pwa_install_shows', '1');
    localStorage.setItem('dw_pwa_install_last', daysAgo(0));
    expect(installApplies()).toBe(false);
    localStorage.setItem('dw_pwa_install_last', daysAgo(15));
    expect(installApplies()).toBe(true);
    localStorage.setItem('dw_pwa_install_shows', '2');
    expect(installApplies()).toBe(false);
  });

  it('a session that already showed the card keeps it up that visit', () => {
    sessionStorage.setItem('dw_pwa_install_session', '1');
    localStorage.setItem('dw_pwa_install_shows', '2');
    expect(installApplies()).toBe(true);
  });

  it('not due once the install was accepted or the browser said installed', () => {
    markInstalled();
    expect(localStorage.getItem(PWA_INSTALLED_KEY)).toBe('1');
    expect(installApplies()).toBe(false);
  });

  it('not due once dismissed', () => {
    dismissInstall();
    expect(localStorage.getItem(PWA_DISMISS_KEY)).toBe('1');
    expect(installApplies()).toBe(false);
  });

  it('the native prompt answered either way settles the ask and moves Home on', async () => {
    const heard = vi.fn();
    window.addEventListener('dw-next-refresh', heard);
    (window as unknown as { __pwaInstall?: () => Promise<boolean> }).__pwaInstall = async () => false;
    expect(await promptPwaInstall()).toBe('dismissed');
    expect(installApplies()).toBe(false);
    localStorage.removeItem(PWA_DISMISS_KEY);
    (window as unknown as { __pwaInstall?: () => Promise<boolean> }).__pwaInstall = async () => true;
    expect(await promptPwaInstall()).toBe('accepted');
    expect(installApplies()).toBe(false);
    expect(heard).toHaveBeenCalledTimes(2);
    window.removeEventListener('dw-next-refresh', heard);
    delete (window as unknown as { __pwaInstall?: unknown }).__pwaInstall;
  });
});
