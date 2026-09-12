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
import { localToday, mergeReadDays } from './readDaysMerge';

export type ReadTrigger = 'complete' | 'pathway' | 'audio' | 'highlight' | 'journal';

/** Read + sanitise the stored read-days array from localStorage. */
export function getReadDays(): string[] {
  try {
    const raw = localStorage.getItem(LS.readDays);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return mergeReadDays(parsed, []);
  } catch {
    return [];
  }
}

export function getReadDayCount(): number {
  return getReadDays().length;
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
  const isNew = !current.includes(today);

  let dates = current;
  if (isNew) {
    dates = mergeReadDays(stored, [today]);
    syncMisc(LS.readDays, JSON.stringify(dates));
    track('read_day', trigger);
    window.dispatchEvent(new Event('dw-read-day'));
  }

  const streak = recordStreakToday();

  return { dates, count: dates.length, isNew, streak };
}
