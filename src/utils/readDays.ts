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

const SEEDED_FLAG = 'dw_read_days_seeded';
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const SYNTHESIS_CAP = 1200; // matches readDaysMerge's MAX_KEPT window

/** One-shot backfill for dw_read_days.
 *
 * Wave 0 introduced this key with no backfill, so on deploy every existing
 * reader's on-screen count would drop to zero and rebuild from their next
 * genuine read. Ashley approved seeding it once, on-device, from material
 * that already exists there (the streak run, journal dates, behavior event
 * dates) so nobody sees zero.
 *
 * HONEST CAVEAT: the pre-wave streak (dw_streak_v2) counted app-opens, not
 * only genuine reads. This one-time seed therefore treats prior engagement
 * (opens plus reads) as read-days; only genuine reads count from here on.
 * That's deliberate — the alternative Ashley rejected is every reader
 * dropping to zero on deploy.
 *
 * Runs its computation exactly once, ever, per device (dw_read_days_seeded).
 * Never overwrites an existing dw_read_days record (returning reader, or a
 * value already merged down from the cloud). Best-effort only — never
 * throws into a caller.
 */
function seedReadDaysIfNeeded(): void {
  try {
    if (localStorage.getItem(SEEDED_FLAG)) return;

    if (localStorage.getItem(LS.readDays)) {
      localStorage.setItem(SEEDED_FLAG, '1');
      return;
    }

    const dates = new Set<string>();

    // 1. The streak's consecutive run.
    try {
      const raw = localStorage.getItem(LS.streak);
      if (raw) {
        const parsed = JSON.parse(raw) as { count?: unknown; lastDate?: unknown };
        const count = typeof parsed.count === 'number' ? parsed.count : 0;
        const lastDate = typeof parsed.lastDate === 'string' ? parsed.lastDate : '';
        if (DATE_RE.test(lastDate) && count >= 1) {
          const [y, m, d] = lastDate.split('-').map(Number);
          const base = new Date(y, m - 1, d);
          const iterations = Math.min(count, SYNTHESIS_CAP);
          for (let i = 0; i < iterations; i++) {
            const day = new Date(base.getFullYear(), base.getMonth(), base.getDate() - i);
            dates.add(day.toLocaleDateString('en-CA'));
          }
        }
      }
    } catch {
      // one corrupt key can't abort the whole seed
    }

    // 2. Journal entry dates.
    try {
      const raw = localStorage.getItem(LS.journal);
      if (raw) {
        const entries = JSON.parse(raw) as unknown;
        if (Array.isArray(entries)) {
          for (const entry of entries) {
            const value = entry && typeof entry === 'object' ? (entry as { date?: unknown }).date : undefined;
            if (typeof value !== 'string') continue;
            if (DATE_RE.test(value)) {
              dates.add(value);
            } else {
              const parsedDate = new Date(value);
              if (!Number.isNaN(parsedDate.getTime())) {
                dates.add(parsedDate.toLocaleDateString('en-CA'));
              }
            }
          }
        }
      }
    } catch {
      // one corrupt key can't abort the whole seed
    }

    // 3. Behavior event dates.
    try {
      const raw = localStorage.getItem('dw_behavior_v1');
      if (raw) {
        const events = JSON.parse(raw) as unknown;
        if (Array.isArray(events)) {
          for (const event of events) {
            const value = event && typeof event === 'object' ? (event as { date?: unknown }).date : undefined;
            if (typeof value === 'string' && DATE_RE.test(value)) {
              dates.add(value);
            }
          }
        }
      }
    } catch {
      // one corrupt key can't abort the whole seed
    }

    if (dates.size > 0) {
      const record = mergeReadDays(Array.from(dates), []);
      localStorage.setItem(LS.readDays, JSON.stringify(record));
    }

    localStorage.setItem(SEEDED_FLAG, '1');
  } catch {
    // seeding is best-effort and must never throw into a caller
  }
}

/** Read + sanitise the stored read-days array from localStorage (the retained
 *  window only — use getReadDayCount() for the true total). */
export function getReadDays(): string[] {
  seedReadDaysIfNeeded();
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
  seedReadDaysIfNeeded();
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
  seedReadDaysIfNeeded();
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
