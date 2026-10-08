import { describe, it, expect, beforeEach } from 'vitest';
import { applyStaffLangDefault, deviceIsSpanish, initStaffLangDefault, isFuturosStaff, STAFF_LANG_DEFAULT_KEY } from './staffLang';
import { getLang } from '../utils/i18n';

const en = { language: 'en-US', languages: ['en-US'] };
const es = { language: 'es-MX', languages: ['es-MX', 'en'] };

describe('Spanish by default for Futuros staff (readiness H)', () => {
  beforeEach(() => { localStorage.clear(); window.history.replaceState(null, '', '/staff'); });

  it('knows Futuros staff by campus congregation or @futuros.global', () => {
    expect(isFuturosStaff({ email: 'p@futures.church', congregation: 'futuros-us' })).toBe(true);
    expect(isFuturosStaff({ email: 'alexis@futuros.global', congregation: null })).toBe(true);
    expect(isFuturosStaff({ email: 'p@futures.church', congregation: 'futures-us' })).toBe(false);
    expect(isFuturosStaff(null)).toBe(false);
  });

  it('knows a Spanish device', () => {
    expect(deviceIsSpanish(es)).toBe(true);
    expect(deviceIsSpanish({ language: 'es', languages: [] })).toBe(true);
    expect(deviceIsSpanish(en)).toBe(false);
    expect(deviceIsSpanish({ language: 'est', languages: [] })).toBe(false);
  });

  it('a Futuros pastor on an English device sees the staff side in Spanish', () => {
    expect(applyStaffLangDefault({ email: 'p@futures.church', congregation: 'futuros-us' }, en)).toBe(true);
    expect(getLang()).toBe('es');
  });

  it('a language the person chose always wins', () => {
    localStorage.setItem('dw_lang', 'en');
    applyStaffLangDefault({ email: 'alexis@futuros.global' }, en);
    expect(getLang()).toBe('en');
  });

  it('the default never reaches the reader app (only exactly /staff)', () => {
    applyStaffLangDefault({ email: 'alexis@futuros.global' }, en);
    window.history.replaceState(null, '', '/staff/');
    expect(getLang()).toBe('es');
    for (const path of ['/', '/staff/notes', '/staffing', '/?sermon=1&congregation=futuros-us']) {
      window.history.replaceState(null, '', path);
      expect(getLang()).toBe('en');
    }
  });

  it('a return visit sets <html lang> from the kept default', () => {
    document.documentElement.lang = 'en';
    localStorage.setItem(STAFF_LANG_DEFAULT_KEY, 'es');
    initStaffLangDefault(en);
    expect(document.documentElement.lang).toBe('es');
    document.documentElement.lang = 'en';
    applyStaffLangDefault({ email: 'alexis@futuros.global' }, en);
    expect(document.documentElement.lang).toBe('es');
  });

  it('sign-out recomputes from the device; another staff member on an English device gets English', () => {
    applyStaffLangDefault({ email: 'alexis@futuros.global' }, en);
    applyStaffLangDefault(null, en);
    expect(localStorage.getItem(STAFF_LANG_DEFAULT_KEY)).toBeNull();
    expect(getLang()).toBe('en');
    applyStaffLangDefault({ email: 'josh@futures.church', congregation: 'futures-us' }, es);
    expect(getLang()).toBe('es');
  });

  it('opening /staff on a Spanish device shows sign-in in Spanish, and keeps a default from the last sign-in', () => {
    initStaffLangDefault(es);
    expect(getLang()).toBe('es');
    localStorage.setItem(STAFF_LANG_DEFAULT_KEY, 'es');
    initStaffLangDefault(en);
    expect(getLang()).toBe('es');
  });
});
