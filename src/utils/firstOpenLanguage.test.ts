import { describe, it, expect, beforeEach, vi } from 'vitest';
import { detectFirstOpenLanguage, langFromLocale } from './firstOpenLanguage';

beforeEach(() => { localStorage.clear(); });

const nav = (language: string, languages?: string[]) => ({ language, languages });

describe('langFromLocale', () => {
  it('maps Spanish, Portuguese and Indonesian phones; English and the rest stay null', () => {
    expect(langFromLocale('es-US')).toBe('es');
    expect(langFromLocale('es')).toBe('es');
    expect(langFromLocale('pt-BR')).toBe('pt');
    expect(langFromLocale('id-ID')).toBe('id');
    expect(langFromLocale('in-ID')).toBe('id');
    expect(langFromLocale('en-AU')).toBeNull();
    expect(langFromLocale('fr-FR')).toBeNull();
    expect(langFromLocale('')).toBeNull();
    expect(langFromLocale('estonian')).toBeNull();
  });
});

describe('detectFirstOpenLanguage', () => {
  it('a Spanish phone on first open gets Spanish through the existing setter, no reload', () => {
    const apply = vi.fn();
    const reload = vi.spyOn(window.location, 'reload').mockImplementation(() => {});
    expect(detectFirstOpenLanguage(nav('es-US'), localStorage, apply)).toBe('es');
    expect(apply).toHaveBeenCalledWith('es');
    expect(reload).not.toHaveBeenCalled();
    // The Bible follows the language when she has not picked one.
    expect(localStorage.getItem('dw_translation')).toBe('RV1960');
  });

  it('prefers the first of navigator.languages', () => {
    const apply = vi.fn();
    expect(detectFirstOpenLanguage(nav('en-US', ['pt-BR', 'en-US']), localStorage, apply)).toBe('pt');
  });

  it('never overrides a stored language', () => {
    localStorage.setItem('dw_lang', 'en');
    const apply = vi.fn();
    expect(detectFirstOpenLanguage(nav('es-MX'), localStorage, apply)).toBeNull();
    expect(apply).not.toHaveBeenCalled();
  });

  it('never runs once she has made a real path choice', () => {
    localStorage.setItem('dw_setup', JSON.stringify({ persona: 'congregation', source: 'onboarding' }));
    const apply = vi.fn();
    expect(detectFirstOpenLanguage(nav('es-MX'), localStorage, apply)).toBeNull();
    expect(apply).not.toHaveBeenCalled();
  });

  it('still counts as first open after the automatic default path', () => {
    localStorage.setItem('dw_setup', JSON.stringify({ persona: 'new_to_faith', source: 'default' }));
    const apply = vi.fn();
    expect(detectFirstOpenLanguage(nav('id-ID'), localStorage, apply)).toBe('id');
  });

  it('keeps a Bible she already picked', () => {
    localStorage.setItem('dw_translation', 'NIV');
    detectFirstOpenLanguage(nav('es-US'), localStorage, vi.fn());
    expect(localStorage.getItem('dw_translation')).toBe('NIV');
  });

  it('does nothing for an English phone', () => {
    const apply = vi.fn();
    expect(detectFirstOpenLanguage(nav('en-US'), localStorage, apply)).toBeNull();
    expect(apply).not.toHaveBeenCalled();
    expect(localStorage.getItem('dw_lang')).toBeNull();
  });

  it('the real setter switches in place and sets <html lang>', () => {
    expect(detectFirstOpenLanguage(nav('es-US'))).toBe('es');
    expect(localStorage.getItem('dw_lang')).toBe('es');
    expect(document.documentElement.lang).toBe('es');
  });
});
