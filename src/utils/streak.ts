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
  lastFreezeWeek: string;
}

const DEFAULT: StreakState = { count: 0, lastDate: '', freezesAvailable: 1, lastFreezeWeek: '' };

export function getStreak(): StreakState {
  try {
    return { ...DEFAULT, ...JSON.parse(localStorage.getItem(KEY) || '{}') };
  } catch {
    return { ...DEFAULT };
  }
}

/** Mark today as an active day. Idempotent per calendar day (calling it many times
 *  a day only counts once). Returns the new count, whether it advanced, and whether
 *  it hit a milestone. Includes the one-per-week "freeze" grace for a single missed day. */
export function recordStreakToday(): { count: number; isNew: boolean; isMilestone: boolean } {
  const today = new Date().toISOString().slice(0, 10);
  const thisWeek = (() => { const d = new Date(); return `${d.getFullYear()}-W${Math.ceil(d.getDate() / 7)}`; })();
  try {
    const raw = getStreak();
    if (raw.lastDate === today) return { count: raw.count, isNew: false, isMilestone: false };

    const y = new Date(); y.setDate(y.getDate() - 1);
    const yStr = y.toISOString().slice(0, 10);
    const db = new Date(); db.setDate(db.getDate() - 2);
    const dbStr = db.toISOString().slice(0, 10);

    // Replenish one freeze at the start of a new week.
    const freezesAvailable = raw.lastFreezeWeek !== thisWeek ? 1 : (raw.freezesAvailable ?? 1);

    let newCount: number;
    let freezesLeft = freezesAvailable;
    let freezeWeek = raw.lastFreezeWeek || '';
    if (raw.lastDate === yStr) {
      newCount = (raw.count || 0) + 1;                      // consecutive day
    } else if (raw.lastDate === dbStr && freezesAvailable > 0) {
      newCount = (raw.count || 0) + 1;                      // missed one day → spend a freeze
      freezesLeft = freezesAvailable - 1;
      freezeWeek = thisWeek;
    } else {
      newCount = 1;                                         // streak broken / first day
    }

    const saved: StreakState = { count: newCount, lastDate: today, freezesAvailable: freezesLeft, lastFreezeWeek: freezeWeek };
    try { localStorage.setItem(KEY, JSON.stringify(saved)); } catch { /* quota */ }
    pushNow();
    return { count: newCount, isNew: true, isMilestone: MILESTONES.includes(newCount) };
  } catch {
    try { localStorage.setItem(KEY, JSON.stringify({ count: 1, lastDate: today, freezesAvailable: 1, lastFreezeWeek: thisWeek })); } catch { /* quota */ }
    pushNow();
    return { count: 1, isNew: true, isMilestone: false };
  }
}
