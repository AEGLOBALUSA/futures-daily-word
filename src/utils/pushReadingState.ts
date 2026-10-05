/**
 * What the daily reminder may know about her reading (MOS-to-8 build B09-17).
 *
 * This device tells its OWN push row (push-subscribe `update` with `state`):
 * her path, the plan or journey day and passage due next, the date they are
 * due, and the last day she read. Never a name, an email or an account id:
 * the request carries only the push subscription (which identifies the device
 * to the push service) and the state below. The server whitelists the same
 * fields with the same caps (netlify/functions/lib/push-v2.js stateUpdates).
 *
 * It is sent only while this device has reminders on, at most once per ten
 * minutes for the same state; a change (she read, the day turned) goes at once,
 * and an app open says so (opened: true) at most once per ten minutes.
 * A Comfort reader's device sends only her path, which tells the reminder
 * never to come (design decision 8).
 *
 * Nothing here reaches a model.
 */
import { withTimeout, pushSupported, isPushSubscribed } from './push';
import { API_BASE } from './api-base';
import { addDays } from './zonedTime';
import { t, tField } from './i18n';
import { displayPassage } from '../data/translations';
import { PLAN_CATALOGUE } from '../data/plans';

export const MAX_LABEL = 80;
export const MAX_PASSAGE = 40;
/** The same state is not sent again within this long; an open is reported at most this often. */
export const STATE_DEBOUNCE_MS = 10 * 60_000;
export const STATE_SENT_KEY = 'dw_push_state_sent';
/** The I'm New journey's length (the 40-day New & Returning to Faith journey). */
const JOURNEY_DAYS = 40;

const COMFORT = new Set(['comfort', 'difficult']);

export interface PushReadingState {
  persona: string | null;
  journey_day: number | null;
  next_passage: string | null;
  next_label: string | null;
  next_for_date: string | null;
  last_read_date: string | null;
}

export interface ReadingStateInput {
  persona: string;
  isNewPath: boolean;
  /** Today's hero reading (e.g. "John 3"), when there is one. */
  passage: string | null;
  /** Tomorrow's reading, when it can be known. */
  tomorrow: string | null;
  /** Today's reading is done (Mark as read, or I'm New's day finished). */
  doneToday: boolean;
  /** I'm New: enrolled, and the journey day on screen. */
  pathwayEnrolled: boolean;
  pathwayDisplayDay: number;
  /** The first scripture plan running today. */
  plan: { planId: string; dayNum: number } | null;
  /** The device's local date, YYYY-MM-DD. */
  today: string;
  /** Her latest read day (readDays), YYYY-MM-DD. */
  lastReadDate: string | null;
  lang: string;
}

function fill(text: string, params: Record<string, string>): string {
  return text.replace(/\{(\w+)\}/g, (m, k: string) => (k in params ? params[k] : m));
}

function clipLabel(s: string): string | null {
  const v = s.trim();
  if (!v) return null;
  return v.length > MAX_LABEL ? `${v.slice(0, MAX_LABEL - 1).trimEnd()}…` : v;
}

/** The state to report, worked out from what Home already knows. Pure. */
export function readingStateOf(input: ReadingStateInput): PushReadingState {
  const persona = input.persona || null;
  const empty: PushReadingState = {
    persona, journey_day: null, next_passage: null, next_label: null, next_for_date: null, last_read_date: null,
  };
  // Comfort: the path alone, so the reminder knows never to come.
  if (persona && COMFORT.has(persona)) return empty;

  const lastRead = input.lastReadDate && /^\d{4}-\d{2}-\d{2}$/.test(input.lastReadDate) ? input.lastReadDate : null;
  const done = input.doneToday;
  const forDate = done ? addDays(input.today, 1) : input.today;
  const ref = done ? input.tomorrow : input.passage;
  const shown = ref ? displayPassage(ref, input.lang) : '';
  const nextPassage = shown && shown.length <= MAX_PASSAGE ? shown : null;

  let day: number | null = null;
  let label: string | null = null;
  if (input.isNewPath) {
    if (input.pathwayEnrolled && input.pathwayDisplayDay > 0) {
      const n = input.pathwayDisplayDay + (done ? 1 : 0);
      if (n <= JOURNEY_DAYS) {
        day = n;
        label = clipLabel(fill(t('push_day_of_journey', input.lang), { n: String(n) }));
      }
    }
  } else if (input.plan) {
    const def = PLAN_CATALOGUE.find((p) => p.id === input.plan!.planId);
    const n = input.plan.dayNum + (done ? 1 : 0);
    if (def && n >= 1 && n <= def.totalDays) {
      const title = tField(def, 'title', input.lang);
      if (title) {
        day = n;
        label = clipLabel(fill(t('push_day_of', input.lang), { n: String(n), plan: title }));
      }
    }
  }

  const anything = !!(nextPassage || label);
  return {
    persona,
    journey_day: day,
    next_passage: nextPassage,
    next_label: label,
    next_for_date: anything ? forDate : null,
    last_read_date: lastRead,
  };
}

interface SentRecord {
  /** When a state was last sent. */
  at: number;
  /** What was sent. */
  sig: string;
  /** When an open was last reported. */
  openedAt: number;
}

function readSent(): SentRecord | null {
  try {
    const raw = localStorage.getItem(STATE_SENT_KEY);
    const v = raw ? JSON.parse(raw) : null;
    if (v && typeof v.sig === 'string' && typeof v.at === 'number') {
      return { at: v.at, sig: v.sig, openedAt: typeof v.openedAt === 'number' ? v.openedAt : 0 };
    }
  } catch { /* storage blocked */ }
  return null;
}

function writeSent(rec: SentRecord): void {
  try { localStorage.setItem(STATE_SENT_KEY, JSON.stringify(rec)); } catch { /* storage blocked */ }
}

/**
 * Send now? A changed state: yes. The same state: only to report an app open,
 * and an open at most once per ten minutes. Pure.
 */
export function shouldSendState(prev: SentRecord | null, sig: string, opened: boolean, now: number): { send: boolean; reportOpen: boolean } {
  const openDue = opened && (!prev || now - prev.openedAt >= STATE_DEBOUNCE_MS);
  if (!prev || prev.sig !== sig) return { send: true, reportOpen: openDue };
  return { send: openDue, reportOpen: openDue };
}

/**
 * Tell this device's push row its reading state. No-op without reminders on
 * this device, on a host where push cannot run, or when nothing new is due.
 * Never throws. Resolves true when the server took it.
 */
export async function syncReadingState(state: PushReadingState, opened = false, now: number = Date.now()): Promise<boolean> {
  try {
    if (!isPushSubscribed() || !pushSupported()) return false;
    const sig = JSON.stringify(state);
    const prev = readSent();
    const { send, reportOpen } = shouldSendState(prev, sig, opened, now);
    if (!send) return false;
    // Written before the network call, so a burst of renders sends once.
    writeSent({ at: now, sig, openedAt: reportOpen ? now : (prev?.openedAt ?? 0) });

    const registration = await withTimeout(navigator.serviceWorker.ready, 5000, null);
    if (!registration) return false;
    const subscription = await withTimeout(registration.pushManager.getSubscription(), 8000, null);
    if (!subscription) return false;

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    try {
      const res = await fetch(`${API_BASE}/api/push-subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update',
          subscription: subscription.toJSON(),
          state: reportOpen ? { ...state, opened: true } : { ...state },
        }),
        signal: ctrl.signal,
      });
      return res.ok;
    } finally {
      clearTimeout(timer);
    }
  } catch {
    return false;
  }
}
