/**
 * Small pure helpers behind Home's one next step (B09-08): tomorrow's reading
 * for the done state, whether today's reflection is written, the More for
 * today open state (per day, this tab only) and the words that name what
 * sits inside More for today.
 */
import { chapterOf } from './heroDedupe';
import { COMFORT_CHAPTERS } from '../data/comfort';
import { PASTOR_CHAPTERS } from '../data/pastor';

export interface TomorrowInput {
  persona: string;
  isNewPath: boolean;
  /** The first scripture plan running: its passages, length and today's day number. */
  plan?: { passages: string[]; totalDays: number; dayNum: number } | null;
  /** The first reading slot: book, chapter on screen, last chapter of the book. */
  slot?: { book: string; currentChapter: number; maxChapter: number } | null;
  /** The I'm New journey: its days and the day on screen. */
  pathway?: { days: Array<{ day: number; reading?: { book: string; chapter: number } }>; displayDay: number } | null;
  /** localDayIndex() for the comfort and pastor rotations. */
  dayIndex: number;
}

/** Tomorrow's reading, in the same order the hero picks today's. Null when it cannot be known. */
export function tomorrowPassage(input: TomorrowInput): string | null {
  if (input.isNewPath) {
    const next = input.pathway?.days?.find((d) => d.day === input.pathway!.displayDay + 1)?.reading;
    return next ? `${next.book} ${next.chapter}` : null;
  }
  const plan = input.plan;
  if (plan && plan.dayNum < plan.totalDays) {
    const raw = plan.passages[plan.dayNum];
    const first = raw ? raw.split(', ')[0]?.trim() : '';
    if (first) return chapterOf(first);
  }
  if (plan) return null; // the plan finishes today; Plans offers the next one
  const slot = input.slot;
  if (slot) return slot.currentChapter < slot.maxChapter ? `${slot.book} ${slot.currentChapter + 1}` : null;
  if (input.persona === 'comfort') return COMFORT_CHAPTERS[(input.dayIndex + 1) % COMFORT_CHAPTERS.length] || null;
  if (input.persona === 'pastor_leader') return PASTOR_CHAPTERS[(input.dayIndex + 1) % PASTOR_CHAPTERS.length] || null;
  return null;
}

/** The device's local date, YYYY-MM-DD. */
export function localToday(now: Date = new Date()): string {
  return now.toLocaleDateString('en-CA');
}

/**
 * The I'm New journey day on screen is finished: finished today, or already
 * among the finished days. The last day stays on screen once it is finished
 * (currentDay never passes the end), so without the second half a graduate
 * was shown "Day 40 is ready" every day after.
 */
export function isJourneyDayDone(
  progress: { lastCompletedDate?: string; completedDays?: number[] } | null | undefined,
  displayDay: number,
  today: string = localToday(),
): boolean {
  if (!progress) return false;
  if (progress.lastCompletedDate === today) return true;
  return Array.isArray(progress.completedDays) && progress.completedDays.includes(displayDay);
}

/** True when a journal reflection was saved or edited today on this device. */
export function reflectedToday(today: string = localToday()): boolean {
  try {
    const entries = JSON.parse(localStorage.getItem('dw_journal') || '[]');
    if (!Array.isArray(entries)) return false;
    return entries.some((e) => {
      if (!e || e.deleted || e.type !== 'journal' || typeof e.updatedAt !== 'string') return false;
      const d = new Date(e.updatedAt);
      return !Number.isNaN(d.getTime()) && localToday(d) === today;
    });
  } catch {
    return false;
  }
}

/* ── More for today: open for the rest of the day once opened ─────────────── */

export const MORE_OPEN_KEY = 'dw_more_for_today_open';

/** More for today opens closed each day; once opened it stays open for the rest of that day. */
export function readMoreOpen(today: string = localToday()): boolean {
  try { return sessionStorage.getItem(MORE_OPEN_KEY) === today; } catch { return false; }
}

export function writeMoreOpen(open: boolean, today: string = localToday()): void {
  try {
    if (open) sessionStorage.setItem(MORE_OPEN_KEY, today);
    else sessionStorage.removeItem(MORE_OPEN_KEY);
  } catch { /* storage blocked: it simply opens closed next time */ }
}

export interface MoreContentsInput {
  persona: string;
  isNewPath: boolean;
  /** I'm New: the journey is the photo hero, so it is not inside More for today. */
  journeyInHero?: boolean;
  hasPlan: boolean;
  bookCards: boolean;
  campus: boolean;
  wordOfDay: boolean;
}

/**
 * The i18n keys that name what is inside More for today, most useful first,
 * at most three, so the closed row says in words what it holds.
 */
export function moreForTodayNames(input: MoreContentsInput): string[] {
  const names: string[] = [];
  if (input.persona === 'pastor_leader') names.push('more_item_preach');
  else if (!input.isNewPath) names.push('more_item_sermon_notes');
  if (input.isNewPath && !input.journeyInHero) names.push('more_item_journey');
  if (input.persona === 'comfort') names.push('more_item_comfort');
  if (input.hasPlan) names.push('more_item_plan');
  if (input.bookCards) names.push('more_item_books');
  if (input.campus) names.push('more_item_campus');
  if (input.wordOfDay) names.push('more_item_word');
  if (input.persona === 'pastor_leader') names.push('more_item_campus_overview');
  if (!input.isNewPath && input.persona !== 'comfort') names.push('more_item_for_you');
  return names.slice(0, 3);
}
