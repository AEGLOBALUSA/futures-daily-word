/**
 * The reader's Bible translation: which ones Daily Word offers, and the one
 * setter that changes it.
 *
 * Settings (More → Bible translation) and Bible AI's "switch to …" both read
 * offeredTranslations(), so a typed request can never choose a translation
 * Settings would not show for the reader's language. That list is the licence
 * gate: NIV is offered in English only, and no request in another language
 * can reach it (DW-P09). setReaderTranslation() checks the same list again, so
 * the gate holds even if a caller skips the matcher.
 */
import type { TranslationCode } from './api';
import { track } from './analytics';

const OFFERED: Record<string, readonly TranslationCode[]> = {
  en: ['ESV', 'NLT', 'KJV', 'NKJV', 'NIV', 'AMP', 'NASB', 'WEB'],
  es: ['RV1960', 'NVI'],
  pt: ['ARA'],
  id: ['TB'],
};

/** The translations offered for this app language (English for any other). */
export function offeredTranslations(lang: string): readonly TranslationCode[] {
  return OFFERED[lang] || OFFERED.en;
}

export function isOfferedTranslation(code: string, lang: string): code is TranslationCode {
  return (offeredTranslations(lang) as readonly string[]).includes(code);
}

export const TRANSLATION_CHANGED_EVENT = 'dw-translation-changed';

/**
 * The reader chose a translation: save it as her own choice and tell the open
 * screens. Returns false, and changes nothing, for a translation not offered
 * in her language.
 */
export function setReaderTranslation(code: TranslationCode, lang: string): boolean {
  if (!isOfferedTranslation(code, lang)) return false;
  try {
    localStorage.setItem('dw_translation', code);
    localStorage.setItem('dw_translation_manual', 'true');
  } catch {
    return false;
  }
  track('translation_switch', code);
  try { window.dispatchEvent(new Event(TRANSLATION_CHANGED_EVENT)); } catch { /* ignore */ }
  return true;
}
