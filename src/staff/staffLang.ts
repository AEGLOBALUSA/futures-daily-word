/**
 * Spanish by default for Futuros staff (readiness 7 Oct 2026, criterion H).
 *
 * A language the person CHOSE (`dw_lang`) always wins. Without one, the staff
 * side (and only the staff side: getLang reads this key only under /staff, so
 * the reader app is untouched) opens in Spanish when:
 *   - the signed-in person is Futuros staff: their campus belongs to the
 *     futuros-us congregation, or their address is @futuros.global; or
 *   - before sign-in, or for anyone else, the device itself is set to Spanish.
 * The default lives on this device only, is rewritten at every sign-in and
 * recomputed from the device at sign-out. It is never synced and never saved
 * as a choice.
 */
export const STAFF_LANG_DEFAULT_KEY = 'dw_staff_lang_default';

export type StaffLangPerson = { email?: string | null; congregation?: string | null } | null | undefined;

export function isFuturosStaff(staff: StaffLangPerson): boolean {
  if (!staff) return false;
  if (staff.congregation === 'futuros-us') return true;
  return String(staff.email || '').trim().toLowerCase().endsWith('@futuros.global');
}

export function deviceIsSpanish(nav: Pick<Navigator, 'language' | 'languages'> | undefined = typeof navigator === 'undefined' ? undefined : navigator): boolean {
  if (!nav) return false;
  const first = (nav.languages && nav.languages.length ? nav.languages[0] : nav.language) || '';
  return /^es(\b|-|_|$)/i.test(first);
}

export function staffLangDefault(staff: StaffLangPerson, nav?: Pick<Navigator, 'language' | 'languages'>): 'es' | null {
  return isFuturosStaff(staff) || deviceIsSpanish(nav) ? 'es' : null;
}

/**
 * Write (or clear) the device default for `staff` (null = signed out / not yet
 * known). Returns true when the language the staff side shows changed, and then
 * tells listeners (useTranslation) and <html lang>.
 */
export function applyStaffLangDefault(staff: StaffLangPerson, nav?: Pick<Navigator, 'language' | 'languages'>): boolean {
  try {
    const before = localStorage.getItem('dw_lang') || localStorage.getItem(STAFF_LANG_DEFAULT_KEY) || 'en';
    const next = staffLangDefault(staff, nav);
    if (next) localStorage.setItem(STAFF_LANG_DEFAULT_KEY, next);
    else localStorage.removeItem(STAFF_LANG_DEFAULT_KEY);
    const after = localStorage.getItem('dw_lang') || next || 'en';
    if (after === before) return false;
    try { document.documentElement.lang = after; } catch { /* ignore */ }
    window.dispatchEvent(new Event('dw-lang-changed'));
    return true;
  } catch {
    return false; // storage blocked: the staff side stays in its current language
  }
}

/** On opening /staff: keep a default from the last sign-in; else take the device's. */
export function initStaffLangDefault(nav?: Pick<Navigator, 'language' | 'languages'>): void {
  try {
    if (localStorage.getItem(STAFF_LANG_DEFAULT_KEY)) return;
  } catch {
    return;
  }
  applyStaffLangDefault(null, nav);
}
