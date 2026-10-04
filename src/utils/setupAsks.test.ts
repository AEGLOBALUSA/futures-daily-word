/**
 * B09-08: the install ask stops counting as due once this browser installed
 * the app, so Home's one next step moves on instead of stalling on it.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { installApplies } from './setupAsks';
import { markInstalled, dismissInstall, promptPwaInstall, PWA_INSTALLED_KEY, PWA_DISMISS_KEY } from './pwa';

describe('installApplies', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('dw_reading_done', '1');
  });

  it('due after a reading, while not installed or dismissed', () => {
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
