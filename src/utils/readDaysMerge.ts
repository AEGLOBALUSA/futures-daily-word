/**
 * Pure merge helpers for dw_read_days — the local en-CA date axis of "a genuine
 * reading interaction happened today". Kept dependency-free (only `LS`) so it can
 * be imported from both readDays.ts and cloudSync.ts without forming a cycle.
 */
import { LS } from './storage';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_KEPT = 400;

/** Today's local date on the en-CA (YYYY-MM-DD) axis — never UTC. */
export function localToday(): string {
  return new Date().toLocaleDateString('en-CA');
}

/** Union two possibly-untyped inputs into a sorted, deduped, capped date array. */
export function mergeReadDays(a: unknown, b: unknown): string[] {
  const out = new Set<string>();
  for (const src of [a, b]) {
    if (!Array.isArray(src)) continue;
    for (const v of src) {
      if (typeof v === 'string' && DATE_RE.test(v)) out.add(v);
    }
  }
  return Array.from(out).sort().slice(-MAX_KEPT);
}

export const READ_DAYS_KEY = LS.readDays;
