/**
 * App language — the one place a language change is applied, shared by the
 * Settings picker and the front-page LanguageSwitch (Ashley, 2 Sep 2026:
 * "a button that's obvious on the front page … similar to the futures.church
 * site which shows the language options").
 *
 * Tones mirror futures.church's "Atelier Swatch" switcher (components/i18n/
 * LanguageToggle.tsx there): every language owns a warm family colour drawn
 * from the church homepage palette, so the app reads as native to the site.
 */
import { setLangPref } from './i18n';
import { syncMisc, flushNow } from './cloudSync';
import { track } from './analytics';
import type { TranslationCode } from './api';

export type LangCode = 'en' | 'es' | 'id' | 'pt';

export interface LangOption {
  code: LangCode;
  /** Native-language name, as on futures.church. */
  label: string;
  /** Typographic monogram — identical on every platform (no emoji flags). */
  short: string;
  /** Family tone from the futures.church region palette. */
  tone: string;
}

export const LANGS: LangOption[] = [
  { code: 'en', label: 'English', short: 'EN', tone: '#B06636' },
  { code: 'es', label: 'Español', short: 'ES', tone: '#B85C3B' },
  { code: 'id', label: 'Bahasa Indonesia', short: 'ID', tone: '#C45236' },
  { code: 'pt', label: 'Português', short: 'PT', tone: '#8A5A3C' },
];

/** Default Bible translation for each language. */
export const LANG_DEFAULT_TRANSLATION: Record<string, TranslationCode> = {
  en: 'ESV',
  es: 'RV1960',
  pt: 'ARA',
  id: 'TB',
};

/**
 * Apply a language choice: persist + broadcast (dw-lang-changed), back it up
 * cross-device, and re-point the Bible translation to the language's default
 * (clearing any manual override). Screens re-translate in place via the event;
 * App remounts HomeScreen on it so mount-time copy (greeting, hero) follows.
 */
export function applyLanguage(code: string): void {
  setLangPref(code);
  syncMisc('dw_lang', code);
  const defaultTranslation = LANG_DEFAULT_TRANSLATION[code];
  if (defaultTranslation) {
    localStorage.setItem('dw_translation', defaultTranslation);
    localStorage.removeItem('dw_translation_manual');
  }
  track('language_change', code);
  flushNow();
}
