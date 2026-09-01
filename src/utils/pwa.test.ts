import { describe, it, expect, afterEach, vi } from 'vitest';
import {
  isStandaloneDisplay,
  isIosDevice,
  isEmbeddedApp,
  canNativeInstall,
  isInstallDismissed,
  dismissInstall,
  PWA_DISMISS_KEY,
} from './pwa';

describe('pwa helpers', () => {
  const originalMatchMedia = window.matchMedia;
  const originalUA = navigator.userAgent;
  const originalStandalone = (navigator as Navigator & { standalone?: boolean }).standalone;

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
    Object.defineProperty(navigator, 'userAgent', { value: originalUA, configurable: true });
    Object.defineProperty(navigator, 'standalone', { value: originalStandalone, configurable: true });
    localStorage.removeItem(PWA_DISMISS_KEY);
    delete (window as unknown as { __pwaCanInstall?: boolean }).__pwaCanInstall;
    vi.unstubAllGlobals();
  });

  it('isStandaloneDisplay is true when display-mode is standalone', () => {
    window.matchMedia = ((q: string) => ({
      matches: q.includes('display-mode: standalone'),
      media: q,
      addEventListener: () => {},
      removeEventListener: () => {},
    })) as unknown as typeof window.matchMedia;
    expect(isStandaloneDisplay()).toBe(true);
  });

  it('isStandaloneDisplay is true for iOS navigator.standalone', () => {
    window.matchMedia = ((q: string) => ({
      matches: false,
      media: q,
      addEventListener: () => {},
      removeEventListener: () => {},
    })) as unknown as typeof window.matchMedia;
    Object.defineProperty(navigator, 'standalone', { value: true, configurable: true });
    expect(isStandaloneDisplay()).toBe(true);
  });

  it('isStandaloneDisplay is false in a normal browser tab', () => {
    window.matchMedia = ((q: string) => ({
      matches: false,
      media: q,
      addEventListener: () => {},
      removeEventListener: () => {},
    })) as unknown as typeof window.matchMedia;
    Object.defineProperty(navigator, 'standalone', { value: false, configurable: true });
    expect(isStandaloneDisplay()).toBe(false);
  });

  it('isIosDevice detects iPhone UA', () => {
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
      configurable: true,
    });
    expect(isIosDevice()).toBe(true);
  });

  it('isIosDevice is false on desktop Chrome UA', () => {
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120.0.0.0',
      configurable: true,
    });
    Object.defineProperty(navigator, 'platform', { value: 'Linux x86_64', configurable: true });
    Object.defineProperty(navigator, 'maxTouchPoints', { value: 0, configurable: true });
    expect(isIosDevice()).toBe(false);
  });

  it('isEmbeddedApp is true with ?embed=1', () => {
    vi.stubGlobal('location', { search: '?embed=1', href: 'https://futuresdailyword.com/?embed=1' });
    expect(isEmbeddedApp()).toBe(true);
  });

  it('canNativeInstall follows the window flag set by main.tsx', () => {
    expect(canNativeInstall()).toBe(false);
    (window as unknown as { __pwaCanInstall: boolean }).__pwaCanInstall = true;
    expect(canNativeInstall()).toBe(true);
  });

  it('dismissInstall persists and isInstallDismissed reads it', () => {
    expect(isInstallDismissed()).toBe(false);
    dismissInstall();
    expect(isInstallDismissed()).toBe(true);
  });
});
