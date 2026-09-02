/**
 * Which congregation's Sermon Notes this device reads.
 *
 * Stored in localStorage (`dw_congregation`) once a person picks from the Home
 * banner's chooser or arrives on a `?congregation=` link. Before any pick, the
 * default is derived — never asked — from what the device already tells us:
 * a Futuros campus or Spanish UI → Futuros USA; an Australian campus or
 * time zone → Futures Australia; otherwise Futures USA.
 */
import { CONGREGATIONS, DEFAULT_CONGREGATION, isCongregationId, type CongregationId } from '../data/congregations';

export const CONGREGATION_KEY = 'dw_congregation';
export const CONGREGATION_CHANGED_EVENT = 'dw-congregation-changed';
export const OPEN_CONGREGATION_EVENT = 'dw-open-congregation';

export function defaultCongregation(input: { lang?: string; campus?: string; timeZone?: string }): CongregationId {
  const campus = String(input.campus || '');
  if (campus.startsWith('us-futuros')) return 'futuros-us';
  if (campus.startsWith('au-')) return 'futures-au';
  if (campus.startsWith('us-')) return 'futures-us';
  if (String(input.lang || '').toLowerCase().startsWith('es')) return 'futuros-us';
  if (String(input.timeZone || '').startsWith('Australia/')) return 'futures-au';
  return DEFAULT_CONGREGATION;
}

function deviceDefault(): CongregationId {
  let lang = '';
  let campus = '';
  let timeZone = '';
  try { lang = localStorage.getItem('dw_lang') || document.documentElement.lang || navigator.language || ''; } catch { /* ignore */ }
  try {
    const profile = JSON.parse(localStorage.getItem('dw_profile') || 'null');
    campus = profile && typeof profile.campus === 'string' ? profile.campus : '';
  } catch { /* ignore */ }
  try { timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch { /* ignore */ }
  return defaultCongregation({ lang, campus, timeZone });
}

/** The stored choice, else the device default. */
export function getCongregation(): CongregationId {
  try {
    const v = localStorage.getItem(CONGREGATION_KEY);
    if (isCongregationId(v)) return v;
  } catch { /* ignore */ }
  return deviceDefault();
}

/** True once a person has actually chosen (or arrived on a congregation link). */
export function hasChosenCongregation(): boolean {
  try { return isCongregationId(localStorage.getItem(CONGREGATION_KEY)); } catch { return false; }
}

export function setCongregation(id: CongregationId): void {
  if (!isCongregationId(id)) return;
  try { localStorage.setItem(CONGREGATION_KEY, id); } catch { /* ignore */ }
  try { window.dispatchEvent(new CustomEvent(CONGREGATION_CHANGED_EVENT, { detail: { id } })); } catch { /* ignore */ }
}

export function congregationLabel(id: string | null | undefined): string {
  return CONGREGATIONS.find(c => c.id === id)?.name || '';
}

/** Ask the App-level chooser sheet to open. `then: 'open'` opens Sermon Notes after a pick. */
export function openCongregationChooser(then: 'open' | 'stay' = 'stay'): void {
  try { window.dispatchEvent(new CustomEvent(OPEN_CONGREGATION_EVENT, { detail: { then } })); } catch { /* ignore */ }
}

/** Subscribe to changes; returns the unsubscribe. */
export function onCongregationChange(fn: (id: CongregationId) => void): () => void {
  const h = () => fn(getCongregation());
  window.addEventListener(CONGREGATION_CHANGED_EVENT, h);
  return () => window.removeEventListener(CONGREGATION_CHANGED_EVENT, h);
}
