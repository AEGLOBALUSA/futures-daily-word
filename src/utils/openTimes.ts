/**
 * When she usually opens the app, and the one-time "Remind you then?" offer
 * (MOS-to-8 build B09-17). This device only: dw_open_times, dw_reminder_offer_shown
 * and dw_reminder_offer_done are never synced (not in cloudSync's MISC_KEYS) and
 * never sent anywhere. Nothing here reaches a model.
 *
 * dw_open_times holds the FIRST open of each local day (minutes after midnight)
 * for the last 14 days, so a morning with five opens counts once.
 *
 * The offer (a kind in nextStep.ts, after 6 and before 7) shows when:
 *   - this device has reminders on, and she is not on the Comfort path
 *     (Comfort readers get no push, design decision 8);
 *   - there are at least five days of opens;
 *   - her usual time (the median first open) rounded to the hour is a
 *     different hour from her reminder, at least 45 minutes away, and inside
 *     the Settings picker's 5 am to 10 pm;
 *   - it has not been answered, and it has not been shown on an earlier day.
 * It is offered once: shown on one day, gone after it (answered or not).
 * The reminder runs on the hour (the sender is hourly), so the offer names a
 * whole hour: "You usually read around 7:00 AM. Remind you then?"
 */
import { localToday } from './homeToday';
import { getPushHour, isPushSubscribed, updatePushTime } from './push';
import { dateLocale } from './i18n';

export const OPEN_TIMES_KEY = 'dw_open_times';
export const OFFER_SHOWN_KEY = 'dw_reminder_offer_shown';
export const OFFER_DONE_KEY = 'dw_reminder_offer_done';

/** Days of first opens kept. */
export const OPEN_TIMES_MAX = 14;
/** Days of opens before the offer can show. */
export const OFFER_MIN_OPENS = 5;
/** Her usual time must be at least this far from her reminder. */
export const OFFER_MIN_DIFF_MINUTES = 45;
/** The Settings picker's range (PushOptIn, MoreScreen): 5 am to 10 pm. */
export const OFFER_EARLIEST_HOUR = 5;
export const OFFER_LATEST_HOUR = 22;

const COMFORT = new Set(['comfort', 'difficult']);

export interface OpenTime {
  /** Local date, YYYY-MM-DD. */
  d: string;
  /** Minutes after local midnight, 0–1439. */
  m: number;
}

export interface ReminderOffer {
  /** The hour to offer (0–23). */
  hour: number;
  /** Her reminder's hour now. */
  current: number;
}

function isOpenTime(v: unknown): v is OpenTime {
  if (!v || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  return typeof o.d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(o.d)
    && typeof o.m === 'number' && Number.isInteger(o.m) && o.m >= 0 && o.m < 1440;
}

/** dw_open_times, sanitised. Blocked storage reads as no opens. */
export function readOpenTimes(): OpenTime[] {
  try {
    const raw = localStorage.getItem(OPEN_TIMES_KEY);
    const v = raw ? JSON.parse(raw) : [];
    return Array.isArray(v) ? v.filter(isOpenTime).slice(-OPEN_TIMES_MAX) : [];
  } catch {
    return [];
  }
}

/** Record this open if it is the first today. Idempotent per local day. */
export function recordOpen(now: Date = new Date()): OpenTime[] {
  const today = localToday(now);
  const times = readOpenTimes();
  if (times.some((t) => t.d === today)) return times;
  const next = [...times, { d: today, m: now.getHours() * 60 + now.getMinutes() }].slice(-OPEN_TIMES_MAX);
  try { localStorage.setItem(OPEN_TIMES_KEY, JSON.stringify(next)); } catch { /* storage blocked: nothing learned */ }
  return next;
}

/** The median first-open minute, or null with fewer than five days of opens. */
export function medianMinute(times: OpenTime[]): number | null {
  if (times.length < OFFER_MIN_OPENS) return null;
  const ms = times.map((t) => t.m).sort((a, b) => a - b);
  const mid = Math.floor(ms.length / 2);
  return ms.length % 2 ? ms[mid] : Math.round((ms[mid - 1] + ms[mid]) / 2);
}

/**
 * The hour she usually opens the app: the median first open, rounded to the
 * nearest hour. Null with fewer than five days of opens, or outside 5 am–10 pm.
 */
export function suggestedHour(times: OpenTime[]): number | null {
  const median = medianMinute(times);
  if (median === null) return null;
  const hour = Math.round(median / 60);
  if (hour < OFFER_EARLIEST_HOUR || hour > OFFER_LATEST_HOUR) return null;
  return hour;
}

export interface OfferInput {
  times: OpenTime[];
  currentHour: number;
  subscribed: boolean;
  persona: string;
  today: string;
  done: boolean;
  /** The local date the offer was first shown, if ever. */
  shownOn: string | null;
}

/** The offer, or null. Pure. */
export function reminderOffer(input: OfferInput): ReminderOffer | null {
  if (!input.subscribed || input.done || COMFORT.has(input.persona)) return null;
  if (input.shownOn && input.shownOn !== input.today) return null;
  const median = medianMinute(input.times);
  const hour = suggestedHour(input.times);
  if (median === null || hour === null || hour === input.currentHour) return null;
  if (Math.abs(median - input.currentHour * 60) < OFFER_MIN_DIFF_MINUTES) return null;
  return { hour, current: input.currentHour };
}

function readFlag(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}

/** The offer for this device today, from what it has stored. */
export function currentReminderOffer(persona: string, today: string = localToday()): ReminderOffer | null {
  return reminderOffer({
    times: readOpenTimes(),
    currentHour: getPushHour(),
    subscribed: isPushSubscribed(),
    persona,
    today,
    done: readFlag(OFFER_DONE_KEY) === '1',
    shownOn: readFlag(OFFER_SHOWN_KEY),
  });
}

/** The card showed the offer today. Only the first day is kept: it is offered once. */
export function noteOfferShown(today: string = localToday()): void {
  try {
    if (!localStorage.getItem(OFFER_SHOWN_KEY)) localStorage.setItem(OFFER_SHOWN_KEY, today);
  } catch { /* storage blocked */ }
}

/** Fired on window whenever the reminder hour this device holds may have changed. */
export const PUSH_HOUR_EVENT = 'dw-push-hour-changed';

/**
 * Move the daily reminder to `hour` and wait for the server. On failure the
 * hour this device shows goes back to what it was (updatePushTime writes it
 * first), so no screen shows an hour the reminder does not have. Either way
 * PUSH_HOUR_EVENT fires so an open Settings screen re-reads getPushHour().
 * Resolves true when the server took it.
 */
export async function saveReminderHour(hour: number): Promise<boolean> {
  const before = getPushHour();
  let ok = false;
  try { ok = await updatePushTime(hour); } catch { ok = false; }
  if (!ok) {
    try { localStorage.setItem('dw_push_hour', String(before)); } catch { /* storage blocked */ }
  }
  try { window.dispatchEvent(new Event(PUSH_HOUR_EVENT)); } catch { /* no window */ }
  return ok;
}

/**
 * Her answer. Keep closes the offer for good and changes nothing. Yes moves
 * the reminder to the offered hour (saveReminderHour) and closes the offer
 * only once the server has taken it: when the save fails, the hour goes back
 * and the offer stays, so tapping Yes again is the retry.
 * Resolves true when the reminder moved.
 */
export async function answerReminderOffer(accept: boolean, persona: string, today: string = localToday()): Promise<boolean> {
  const offer = currentReminderOffer(persona, today);
  const close = () => { try { localStorage.setItem(OFFER_DONE_KEY, '1'); } catch { /* storage blocked */ } };
  if (!accept || !offer) {
    close();
    return false;
  }
  const ok = await saveReminderHour(offer.hour);
  if (ok) close();
  return ok;
}

/** "7:00 AM" / "7:00 a. m." / "07:00" / "07.00", in the reader's language. */
export function formatReminderTime(hour: number, lang?: string): string {
  const d = new Date(2000, 0, 1, hour, 0, 0);
  try {
    return d.toLocaleTimeString(dateLocale(lang), { hour: 'numeric', minute: '2-digit' });
  } catch {
    return `${hour}:00`;
  }
}
