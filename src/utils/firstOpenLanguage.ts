/**
 * The app language, worked out on the very first open (B09-07): a Spanish,
 * Portuguese or Indonesian phone opens in its own language from the first
 * screen, instead of English with a switch to find.
 *
 * Only when nothing is stored: no `dw_lang`, and no real persona choice yet
 * (`dw_setup` absent, or its source is an auto-default). A stored choice is
 * never overridden. It goes through the existing setter (setLangPref: in place,
 * <html lang>, the dw-lang-changed event), never a reload, and it is NOT pushed
 * to the cloud with a timestamp, so a language the reader chose on another
 * device still wins when she signs in.
 */
import { setLangPref } from './i18n';
import { LANG_DEFAULT_TRANSLATION } from './language';

const AUTO_SOURCES = new Set(['default', 'sunday-guest']);

/** The app language a browser locale maps to, or null for English and the rest. */
export function langFromLocale(locale: string | null | undefined): 'es' | 'pt' | 'id' | null {
  const l = String(locale || '').trim().toLowerCase();
  if (/^es(\b|[-_])/.test(l) || l === 'es') return 'es';
  if (/^pt(\b|[-_])/.test(l) || l === 'pt') return 'pt';
  // 'in' is the old code some Android phones still send for Indonesian.
  if (/^(id|in)(\b|[-_])/.test(l) || l === 'id' || l === 'in') return 'id';
  return null;
}

function isFirstOpen(storage: Storage): boolean {
  if (storage.getItem('dw_lang')) return false;
  const raw = storage.getItem('dw_setup');
  if (!raw) return true;
  try {
    const setup = JSON.parse(raw) as { source?: string } | null;
    return !setup || AUTO_SOURCES.has(String(setup.source || ''));
  } catch {
    return false;
  }
}

/**
 * Set the app language from the phone on first open. Returns the language set,
 * or null when nothing changed. Never throws.
 */
export function detectFirstOpenLanguage(
  nav: Pick<Navigator, 'language'> & { languages?: readonly string[] } = navigator,
  storage: Storage = localStorage,
  apply: (lang: string) => void = setLangPref,
): string | null {
  try {
    if (!isFirstOpen(storage)) return null;
    const locale = (nav.languages && nav.languages[0]) || nav.language;
    const lang = langFromLocale(locale);
    if (!lang) return null;
    apply(lang);
    // The Bible follows the language, unless she has already picked one.
    if (!storage.getItem('dw_translation') && LANG_DEFAULT_TRANSLATION[lang]) {
      storage.setItem('dw_translation', LANG_DEFAULT_TRANSLATION[lang]);
    }
    return lang;
  } catch {
    return null;
  }
}
