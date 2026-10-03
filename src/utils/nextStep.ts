/**
 * Home's one next step (B09-08, SF-09-05 step 2). Pure: no React, no network,
 * nothing reaches a model. Home hands it what it already knows and it answers
 * with the ONE thing to do now, as a verb and an object, or `done` with
 * tomorrow's reading and no button.
 *
 * The order (first match wins):
 *   1. Comfort path, today's reading not opened → the auto-served comfort
 *      passage. No streak words, no celebration, ever.
 *   2. I'm New, Sunday window, notes published → Open today's sermon notes.
 *   3. I'm New, today's journey day not done → Read Day {n}.
 *   4. Pastor/study path with no plan set up → the existing set-up wizard.
 *      (Any path with no reading at all → Choose your plan.)
 *   5. Today's reading not marked → Read {passage}. Mark as read stays at the
 *      end of the passage, so there is never a second Mark as read button.
 *      When the passage is already open (returning paths arrive with it open)
 *      the card says "Mark as read when you finish {passage}" with no button,
 *      and the one Mark as read at the passage's end carries the pulse.
 *   6. Returning path, Sunday window, notes published, reading done → Open
 *      today's sermon notes (the 10 Sep demotion: the reading comes first).
 *   7. Read, not reflected, not quietened → Write it down.
 *   8. One set-up ask, after the reading, at most one a day: install, back-up
 *      email, then path upgrade, each only when its own component applies.
 *   9. Otherwise done: "Tomorrow: {passage}", no button, no pulse.
 *
 * Kinds 1–6 are the day's word and are never quietened. Only 7 and 8 learn:
 * one shown on three days running and never tapped rests for seven days
 * (dw_next_skips, this device only, never synced).
 *
 * Later builds add their Home cards here as kinds (after 5, before 7):
 * reminders (B09-17, "Remind you then?") and prayer counts (B09-11).
 */
import { addDays } from './zonedTime';

export type SetupAsk = 'install' | 'email' | 'upgrade';

export type NextKind =
  | 'comfort'
  | 'sunday_new'
  | 'journey_day'
  | 'plan_setup'
  | 'read'
  | 'reading'
  | 'sunday_notes'
  | 'write'
  | 'setup_ask'
  | 'done';

/** What the card's one button does. Home owns the handlers. */
export type NextAction =
  | 'open_passage'   // open today's passage in the hero (the photo plate's handler)
  | 'open_journey'   // open the full-screen Day N reading
  | 'open_notes'     // open this week's Sermon Notes for the reader's congregation
  | 'open_wizard'    // open More for today at the pastor/study set-up wizard
  | 'open_plans'     // the Plans tab
  | 'write'          // open the passage and its in-place reflection box
  | 'install' | 'email' | 'upgrade' // the set-up ask's own component, in the card
  | 'none';          // no button: the step is on the page already, or the day is done

export interface NextStepState {
  /** Persona id from setup (new_to_faith, congregation, deeper_study, pastor_leader, comfort). */
  persona: string;
  /** The I'm New path (new_to_faith and its older names). */
  isNewPath: boolean;
  /** The pathway day on screen today, when the journey is loaded. */
  journeyDay: number | null;
  /** Today's journey day is finished (lesson or reading). */
  journeyDayDone: boolean;
  /** Today's hero reading (e.g. "Luke 5"), when there is one. */
  passage: string | null;
  /** Mark as read was tapped today. */
  readDoneToday: boolean;
  /**
   * Today's passage is already open in the hero. Returning paths arrive with it
   * open (his 1 Sep ruling, "Arrival IS the reading"), so the next step is to
   * finish it: the one Mark as read at its end is the step, and the card only
   * says so in words.
   */
  passageOpen?: boolean;
  /** A reflection was saved to the journal today. */
  reflectedToday: boolean;
  /** Sunday window on the reader's campus clock. */
  sundayWindow: boolean;
  /** This week's notes for the reader's congregation: true, false, or null while unknown. */
  sermonNotesPublished: boolean | null;
  /** Pastor/study only: a plan is running or the wizard was completed. */
  planSetUp: boolean;
  /** Which one-time set-up asks their own components say apply right now, in any order. */
  setupAsks: SetupAsk[];
  /** Tomorrow's reading, for the done state. */
  tomorrow: string | null;
  /** The reader's campus name, for the Sunday why-line. */
  campusName: string | null;
  /** The device's local date, YYYY-MM-DD. */
  today: string;
  /** Device-only skip learning (dw_next_skips). */
  skips?: NextSkips;
}

export interface NextStep {
  kind: NextKind;
  /** 1–9, the place in the order above. */
  step: number;
  /** i18n key of the button label; for `done`, of the quiet line. */
  labelKey: string;
  params: Record<string, string>;
  action: NextAction;
  /** Optional one line of why, shown above or beside the button. */
  whyKey?: string;
  whyParams?: Record<string, string>;
}

const STUDY_PERSONAS = new Set(['pastor_leader', 'deeper_study']);
const SETUP_ORDER: SetupAsk[] = ['install', 'email', 'upgrade'];

/** Keys that must never reach a comfort reader (streak, celebration, count words). */
export const COMFORT_FORBIDDEN_KEY = /streak|celebrat|milestone|congrat|count/i;

function sundayWhy(state: NextStepState): Pick<NextStep, 'whyKey' | 'whyParams'> {
  return state.campusName
    ? { whyKey: 'next_why_sunday', whyParams: { campus: state.campusName } }
    : {};
}

function notesUp(state: NextStepState): boolean {
  // Unknown counts as published: a slow feed must never take Sunday's notes off
  // an I'm New reader's Home. Only a definite "none this week" holds them back.
  return state.sundayWindow && state.sermonNotesPublished !== false;
}

function done(state: NextStepState): NextStep {
  return state.tomorrow
    ? { kind: 'done', step: 9, labelKey: 'next_tomorrow', params: { passage: state.tomorrow }, action: 'none' }
    : { kind: 'done', step: 9, labelKey: 'next_done_today', params: {}, action: 'none' };
}

/** The one next step. Pure: same state, same answer. */
export function nextStep(state: NextStepState): NextStep {
  const skips = state.skips || {};
  const passage = state.passage || '';

  // 1. Comfort: the auto-served passage, nothing else competes with it.
  if (state.persona === 'comfort' && !state.readDoneToday && passage) {
    return state.passageOpen
      ? { kind: 'comfort', step: 1, labelKey: 'next_finish_passage', params: { passage }, action: 'none' }
      : { kind: 'comfort', step: 1, labelKey: 'next_read_passage', params: { passage }, action: 'open_passage' };
  }

  if (state.isNewPath) {
    // 2. I'm New on a Sunday morning at their campus: the notes lead.
    if (notesUp(state)) {
      return { kind: 'sunday_new', step: 2, labelKey: 'next_sermon_notes', params: {}, action: 'open_notes', ...sundayWhy(state) };
    }
    // 3. Today's journey day.
    if (state.journeyDay && !state.journeyDayDone) {
      return { kind: 'journey_day', step: 3, labelKey: 'next_read_day', params: { n: String(state.journeyDay) }, action: 'open_journey' };
    }
  }

  // 4. Nothing set up yet.
  if (STUDY_PERSONAS.has(state.persona) && !state.planSetUp) {
    return { kind: 'plan_setup', step: 4, labelKey: 'next_set_up_plan', params: {}, action: 'open_wizard' };
  }
  if (!passage && !state.isNewPath && state.persona !== 'comfort') {
    return { kind: 'plan_setup', step: 4, labelKey: 'next_choose_plan', params: {}, action: 'open_plans' };
  }

  // 5. Today's reading. Already open: finish it with the one Mark as read at its end.
  if (passage && !state.readDoneToday && !state.isNewPath) {
    if (state.passageOpen) {
      return { kind: 'reading', step: 5, labelKey: 'next_finish_passage', params: { passage }, action: 'none' };
    }
    return { kind: 'read', step: 5, labelKey: 'next_read_passage', params: { passage }, action: 'open_passage' };
  }

  // 6. Returning paths: Sunday's notes once the reading is done.
  if (!state.isNewPath && notesUp(state) && state.readDoneToday) {
    return { kind: 'sunday_notes', step: 6, labelKey: 'next_sermon_notes', params: {}, action: 'open_notes', ...sundayWhy(state) };
  }

  const readToday = state.readDoneToday || (state.isNewPath && state.journeyDayDone);

  // 7. Write it down, unless it has been passed over three days running.
  if (readToday && passage && !state.reflectedToday && !isQuiet(skips, 'write', state.today)) {
    return {
      kind: 'write', step: 7, labelKey: 'next_write_it_down', params: { passage }, action: 'write',
      whyKey: 'next_write_prompt', whyParams: { passage },
    };
  }

  // 8. One set-up ask, after the reading.
  if (readToday) {
    const ask = SETUP_ORDER.find((a) => state.setupAsks.includes(a) && !isQuiet(skips, a, state.today));
    if (ask) return { kind: 'setup_ask', step: 8, labelKey: `next_setup_${ask}`, params: {}, action: ask };
  }

  // 9. Done for today.
  return done(state);
}

/* ── Skip learning (dw_next_skips): device-only, never synced ─────────────── */

export const NEXT_SKIPS_KEY = 'dw_next_skips';

/** The kinds that can learn. Kinds 1–6 are the day's word and never rest. */
export type QuietableKind = 'write' | SetupAsk;
const QUIETABLE = new Set<string>(['write', 'install', 'email', 'upgrade']);

export interface SkipRecord {
  /** Local dates (YYYY-MM-DD) the step was shown and not tapped, newest last. */
  shownDays: string[];
  tappedAt?: string;
  /** Not offered before this local date. */
  quietUntil?: string;
}
export type NextSkips = Partial<Record<QuietableKind, SkipRecord>>;

/** How many untapped days running before a step rests, and for how long. */
export const SKIP_DAYS = 3;
export const QUIET_DAYS = 7;

/** Which skip key a step uses, or null when it never rests. */
export function quietKeyFor(step: Pick<NextStep, 'kind' | 'action'>): QuietableKind | null {
  if (step.kind === 'write') return 'write';
  if (step.kind === 'setup_ask' && QUIETABLE.has(step.action)) return step.action as SetupAsk;
  return null;
}

/** True when the last three untapped showings were on the three days before today. */
function threeDaysRunning(rec: SkipRecord, today: string): boolean {
  const days = new Set(rec.shownDays);
  for (let i = 1; i <= SKIP_DAYS; i++) {
    if (!days.has(addDays(today, -i))) return false;
  }
  return true;
}

/** Is this step resting today? */
export function isQuiet(skips: NextSkips, key: QuietableKind, today: string): boolean {
  const rec = skips[key];
  if (!rec) return false;
  if (rec.quietUntil && today < rec.quietUntil) return true;
  if (rec.quietUntil && today >= rec.quietUntil) return false;
  return threeDaysRunning(rec, today);
}

/** Read dw_next_skips. A private window or blocked storage reads as nothing learned. */
export function readSkips(): NextSkips {
  try {
    const raw = localStorage.getItem(NEXT_SKIPS_KEY);
    const v = raw ? JSON.parse(raw) : {};
    return v && typeof v === 'object' && !Array.isArray(v) ? (v as NextSkips) : {};
  } catch {
    return {};
  }
}

function writeSkips(skips: NextSkips): void {
  try { localStorage.setItem(NEXT_SKIPS_KEY, JSON.stringify(skips)); } catch { /* storage blocked: nothing learned */ }
}

/**
 * The card showed this step today. Idempotent per day. When the step has now
 * gone three days running untapped it starts its seven-day rest.
 */
export function noteShown(key: QuietableKind, today: string, skips: NextSkips = readSkips()): NextSkips {
  const prev = skips[key] || { shownDays: [] };
  if (prev.quietUntil && today < prev.quietUntil) return skips;
  const rec: SkipRecord = { ...prev, shownDays: [...prev.shownDays] };
  if (rec.quietUntil && today >= rec.quietUntil) { delete rec.quietUntil; rec.shownDays = []; }
  if (!rec.shownDays.includes(today)) rec.shownDays.push(today);
  rec.shownDays = rec.shownDays.filter((d) => d > addDays(today, -(SKIP_DAYS + 2))).slice(-(SKIP_DAYS + 1));
  const next = { ...skips, [key]: rec };
  writeSkips(next);
  return next;
}

/**
 * Called on the day a quietened step would have shown: starts the rest
 * (quietUntil = today + 7) so the count does not depend on her opening the
 * app on the next three days.
 */
export function noteQuiet(key: QuietableKind, today: string, skips: NextSkips = readSkips()): NextSkips {
  const prev = skips[key];
  if (!prev || prev.quietUntil) return skips;
  if (!threeDaysRunning(prev, today)) return skips;
  const next = { ...skips, [key]: { ...prev, quietUntil: addDays(today, QUIET_DAYS) } };
  writeSkips(next);
  return next;
}

/** She tapped it: the count starts again. */
export function noteTapped(key: QuietableKind, today: string, skips: NextSkips = readSkips()): NextSkips {
  const next = { ...skips, [key]: { shownDays: [], tappedAt: today } };
  writeSkips(next);
  return next;
}

/** Fill a label's {placeholders}. */
export function fillParams(text: string, params: Record<string, string> = {}): string {
  return text.replace(/\{(\w+)\}/g, (m, k: string) => (k in params ? params[k] : m));
}
