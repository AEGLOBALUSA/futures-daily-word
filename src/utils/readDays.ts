/**
 * dw_read_days — the local en-CA date axis of genuine reading interactions.
 *
 * Unlike the streak (opening the app counts), this only advances on an explicit,
 * genuine reading action: 'Mark as read', Day N 'Mark Complete', audio play on a
 * passage, a highlight or journal save. Never on mount, never on the arrival seed,
 * never on the Read tap alone. Home prints THIS count where it used to print the
 * streak count, so the number on screen is true.
 */
import { LS } from './storage';
import { syncMisc } from './cloudSync';
import { track } from './analytics';
import { recordStreakToday } from './streak';
import { localToday, mergeReadDays, readDaysTotal } from './readDaysMerge';

export type ReadTrigger = 'complete' | 'pathway' | 'audio' | 'highlight' | 'journal';

/** Read + sanitise the stored read-days array from localStorage (the retained
 *  window only — use getReadDayCount() for the true total). */
export function getReadDays(): string[] {
  try {
    const raw = localStorage.getItem(LS.readDays);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return mergeReadDays(parsed, []).dates;
  } catch {
    return [];
  }
}

/** The true total read-day count — retained window plus dates already
 *  evicted from it, so this never freezes once the window fills. */
export function getReadDayCount(): number {
  try {
    const raw = localStorage.getItem(LS.readDays);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return readDaysTotal(mergeReadDays(parsed, []));
  } catch {
    return 0;
  }
}

/** Record today as a genuine read day (idempotent per calendar day) and roll the
 *  streak forward from the same genuine interaction. Always reads the CURRENT
 *  localStorage value — never React state — and merges rather than rebuilding. */
export function recordReadDay(trigger: ReadTrigger): { dates: string[]; count: number; isNew: boolean; streak: ReturnType<typeof recordStreakToday> } {
  const today = localToday();
  let stored: unknown = [];
  try {
    const raw = localStorage.getItem(LS.readDays);
    stored = raw ? JSON.parse(raw) : [];
  } catch {
    stored = [];
  }
  const current = mergeReadDays(stored, []);
  const isNew = !current.dates.includes(today);

  let record = current;
  if (isNew) {
    record = mergeReadDays(stored, [today]);
    syncMisc(LS.readDays, JSON.stringify(record));
    track('read_day', trigger);
    window.dispatchEvent(new Event('dw-read-day'));
  }

  const streak = recordStreakToday();

  return { dates: record.dates, count: readDaysTotal(record), isNew, streak };
}
