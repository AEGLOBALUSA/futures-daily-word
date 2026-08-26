/**
 * Sermon preparation store (decision 5 build-out, Ashley 2026-08-26).
 * Two misc-synced keys — both ride the existing per-key newest-wins misc bag
 * (whole-value replace per write), so no new sync semantics:
 *   dw_sermon_prep_focus — what the pastor is preaching through (wizard Step 13
 *   finally accepts the answer it asks for; editable in the workspace).
 *   dw_sermon_prep — captures filed from the reading surfaces (HighlightToolbar
 *   "File to sermon"), shown in the workspace's MY PREPARATION card.
 * Item removal rewrites the whole array — cross-device safe under newest-wins;
 * the tombstone rule governs the top-level journal/highlight/plan collections,
 * not values inside the misc bag.
 */
import { syncMisc } from './cloudSync';

export interface PrepItem {
  id: string;
  ref: string;      // e.g. "John 1:1-3" (may be '' for free-text captures)
  text: string;     // the captured scripture/note text
  ts: number;
}

const FOCUS_KEY = 'dw_sermon_prep_focus'; // dw_sermon_ prefix = already misc-synced
const PREP_KEY = 'dw_sermon_prep';
const MAX_ITEMS = 40;   // keeps the JSON under the server's 20KB misc per-key cap
const MAX_TEXT = 400;

export function getPreachingFocus(): string {
  try { return localStorage.getItem(FOCUS_KEY) || ''; } catch { return ''; }
}

export function setPreachingFocus(text: string): void {
  const v = text.trim().slice(0, 200);
  try { localStorage.setItem(FOCUS_KEY, v); } catch { /* quota */ }
  syncMisc(FOCUS_KEY, v);
  try { window.dispatchEvent(new Event('dw-sermon-prep-updated')); } catch { /* ignore */ }
}

export function getPrepItems(): PrepItem[] {
  try {
    const arr = JSON.parse(localStorage.getItem(PREP_KEY) || '[]');
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}

function save(items: PrepItem[]): void {
  const json = JSON.stringify(items.slice(0, MAX_ITEMS));
  try { localStorage.setItem(PREP_KEY, json); } catch { /* quota */ }
  syncMisc(PREP_KEY, json);
  try { window.dispatchEvent(new Event('dw-sermon-prep-updated')); } catch { /* ignore */ }
}

export function addPrepItem(ref: string, text: string): PrepItem {
  const item: PrepItem = {
    id: `prep_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    ref: ref.slice(0, 80),
    text: text.trim().slice(0, MAX_TEXT),
    ts: Date.now(),
  };
  save([item, ...getPrepItems()]);
  return item;
}

export function removePrepItem(id: string): void {
  save(getPrepItems().filter(i => i.id !== id));
}

/** The prep surfaces are pastor-facing only. */
export function isPastorPersona(): boolean {
  try { return JSON.parse(localStorage.getItem('dw_setup') || '{}')?.persona === 'pastor_leader'; }
  catch { return false; }
}
