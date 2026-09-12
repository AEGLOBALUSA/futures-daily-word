/**
 * Pure merge helpers for dw_read_days — the local en-CA date axis of "a genuine
 * reading interaction happened today". Kept dependency-free (only `LS`) so it can
 * be imported from both readDays.ts and cloudSync.ts without forming a cycle.
 */
import { LS } from './storage';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
// Retained window of dates kept verbatim in the record. Raised from 400 (~13
// months) to 1200 (~40 months) so the true count doesn't visibly freeze for
// years; still comfortably under user-sync.js's 20,000-char per-key cap
// (~13 chars/date -> ~15,600 chars at 1200).
const MAX_KEPT = 1200;

/** The on-disk / on-wire shape of dw_read_days: the retained window of dates
 *  plus a monotonic count of dates evicted from that window over time, so the
 *  true total (`dates.length + dropped`) never freezes once the window fills. */
export type ReadDaysRecord = { dates: string[]; dropped: number };

/** Today's local date on the en-CA (YYYY-MM-DD) axis — never UTC. */
export function localToday(): string {
  return new Date().toLocaleDateString('en-CA');
}

/** Normalise an untyped stored/cloud value into a ReadDaysRecord.
 *  Backward compatible: a plain array (every pre-existing record) is treated
 *  as { dates: array, dropped: 0 }. */
function normalize(input: unknown): ReadDaysRecord {
  if (Array.isArray(input)) {
    return {
      dates: input.filter((v): v is string => typeof v === 'string' && DATE_RE.test(v)),
      dropped: 0,
    };
  }
  if (input && typeof input === 'object') {
    const obj = input as { dates?: unknown; dropped?: unknown };
    const dates = Array.isArray(obj.dates)
      ? obj.dates.filter((v): v is string => typeof v === 'string' && DATE_RE.test(v))
      : [];
    const dropped = typeof obj.dropped === 'number' && Number.isFinite(obj.dropped) && obj.dropped >= 0
      ? obj.dropped
      : 0;
    return { dates, dropped };
  }
  return { dates: [], dropped: 0 };
}

/** The true total read-day count, including dates already evicted from the
 *  retained window. Use this for anything displayed on screen. */
export function readDaysTotal(record: ReadDaysRecord): number {
  return record.dates.length + record.dropped;
}

/** Union two possibly-untyped inputs (plain arrays or ReadDaysRecord shapes)
 *  into a sorted, deduped record, capped to the retained window. Evictions
 *  caused by this merge are added to the carried-forward dropped count, which
 *  itself is the MAX of the two sides (never the sum) so merging two devices
 *  can't double-count dates each side had already dropped independently. */
export function mergeReadDays(a: unknown, b: unknown): ReadDaysRecord {
  const na = normalize(a);
  const nb = normalize(b);
  const merged = new Set<string>([...na.dates, ...nb.dates]);
  const sorted = Array.from(merged).sort();
  const carriedDropped = Math.max(na.dropped, nb.dropped);
  if (sorted.length > MAX_KEPT) {
    const overflow = sorted.length - MAX_KEPT;
    return { dates: sorted.slice(overflow), dropped: carriedDropped + overflow };
  }
  return { dates: sorted, dropped: carriedDropped };
}

export const READ_DAYS_KEY = LS.readDays;
