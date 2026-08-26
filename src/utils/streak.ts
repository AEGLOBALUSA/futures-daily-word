/**
 * Single source of truth for the daily engagement streak (dw_streak_v2).
 *
 * Previously HomeScreen and PlansScreen each implemented their own streak logic
 * against the same key, so the two could compute different counts. Everything now
 * goes through recordStreakToday() here — opening the app, journaling, highlighting,
 * and completing a plan day all route to one recorder, and it pushes to the cloud.
 */
import { pushNow } from './cloudSync';
import { LS } from './storage';

const KEY = LS.streak;
const MILESTONES = [7, 14, 30, 60, 100, 365];

export interface StreakState {
  count: number;
  lastDate: string;
  freezesAvailable: number;
  /** Local en-CA date the last freeze was spent (legacy records hold an old 'YYYY-Wn' label). */
  lastFreezeWeek: string;
  /** Longest run ever reached — survives a reset so the app can acknowledge it. */
  bestCount: number;
}

const DEFAULT: StreakState = { count: 0, lastDate: '', freezesAvailable: 1, lastFreezeWeek: '', bestCount: 0 };

export function getStreak(): StreakState {
  try {
    const s: StreakState = { ...DEFAULT, ...JSON.parse(localStorage.getItem(KEY) || '{}') };
    // bestCount is additive (records saved before it existed lack it) — never below the live count.
    s.bestCount = Math.max(s.bestCount || 0, s.count || 0);
    return s;
  } catch {
    return { ...DEFAULT };
  }
}

/** Mark today as an active day. Idempotent per calendar day (calling it many times
 *  a day only counts once). Returns the new count, whether it advanced, and whether
 *  it hit a milestone. Includes the one-per-week "freeze" grace for a single missed day. */
export function recordStreakToday(): { count: number; isNew: boolean; isMilestone: boolean } {
  // LOCAL calendar days (repo invariant) — never UTC toISOString slices.
  const today = new Date().toLocaleDateString('en-CA');
  try {
    const raw = getStreak();

    // One-time upgrade tolerance: records written before the local-date fix carry UTC day
    // stamps (and predate bestCount, which every save now writes). For those records only,
    // accept the UTC rendering of today/yesterday/day-before too, so no existing user's
    // streak breaks on deploy. Once re-saved here, comparisons are strictly local.
    let legacy = false;
    try { legacy = !('bestCount' in JSON.parse(localStorage.getItem(KEY) || '{}')); } catch { /* treat as new */ }
    const utcStr = (daysAgo: number) => { const d = new Date(); d.setDate(d.getDate() - daysAgo); return d.toISOString().slice(0, 10); };
    const matches = (local: string, daysAgo: number) => raw.lastDate === local || (legacy && raw.lastDate === utcStr(daysAgo));

    if (matches(today, 0)) return { count: raw.count, isNew: false, isMilestone: false };

    const y = new Date(); y.setDate(y.getDate() - 1);
    const yStr = y.toLocaleDateString('en-CA');
    const db = new Date(); db.setDate(db.getDate() - 2);
    const dbStr = db.toLocaleDateString('en-CA');

    // Replenish the freeze once 7+ days have passed since it was spent. lastFreezeWeek now
    // stores the spend date; legacy 'YYYY-Wn' labels (and '') parse as NaN → replenish.
    const spentAt = Date.parse(raw.lastFreezeWeek);
    const freezesAvailable = !Number.isFinite(spentAt) || Date.now() - spentAt >= 7 * 86400000 ? 1 : (raw.freezesAvailable ?? 1);

    let newCount: number;
    let freezesLeft = freezesAvailable;
    let freezeWeek = raw.lastFreezeWeek || '';
    if (matches(yStr, 1)) {
      newCount = (raw.count || 0) + 1;                      // consecutive day
    } else if (matches(dbStr, 2) && freezesAvailable > 0) {
      newCount = (raw.count || 0) + 1;                      // missed one day → spend a freeze
      freezesLeft = freezesAvailable - 1;
      freezeWeek = today;
    } else {
      newCount = 1;                                         // streak broken / first day
    }

    // Include raw.count so the record a just-broken streak reached is never lost.
    const bestCount = Math.max(raw.bestCount || 0, raw.count || 0, newCount);
    const saved: StreakState = { count: newCount, lastDate: today, freezesAvailable: freezesLeft, lastFreezeWeek: freezeWeek, bestCount };
    try { localStorage.setItem(KEY, JSON.stringify(saved)); } catch { /* quota */ }
    pushNow();
    // Announce on the app's CustomEvent bus — App.tsx re-times the push ask to
    // AFTER the first real engagement instead of the cold-start gate stack.
    try { window.dispatchEvent(new Event('dw-streak-recorded')); } catch { /* SSR/tests */ }
    return { count: newCount, isNew: true, isMilestone: MILESTONES.includes(newCount) };
  } catch {
    try { localStorage.setItem(KEY, JSON.stringify({ count: 1, lastDate: today, freezesAvailable: 1, lastFreezeWeek: '', bestCount: 1 })); } catch { /* quota */ }
    pushNow();
    try { window.dispatchEvent(new Event('dw-streak-recorded')); } catch { /* SSR/tests */ }
    return { count: 1, isNew: true, isMilestone: false };
  }
}
