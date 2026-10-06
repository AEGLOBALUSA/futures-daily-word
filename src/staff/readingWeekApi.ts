/**
 * A campus's reading week (DW-P08): the client side of intake.js `reading_week`.
 *
 * The server decides the campus (a campus pastor his own confirmed campus;
 * hub and admin any campus they name, else their own roster campus; media and
 * an unconfirmed campus pastor 403) and sends back four counts and nothing
 * else: no name, email or id. The week is the last 7 full days on the campus
 * clock (Monday morning reads Monday to Sunday).
 *
 *   getReadingWeek(campusId?)  the counts, or null when this person has no
 *                              reading week to see (403, or 400 with no campus)
 *   readingWeekLine(week)      what the one-line sentence says: which clauses
 *                              to show, and the one comparison, only when the
 *                              readers moved 15% or more from the week before
 */
import { intake } from './api';

export type ReadingWeek = {
  campusId: string;
  campusName: string;
  /** People at the campus who opened the Daily Word in the 7 days. */
  readers: number;
  /** Of them, people with no Daily Word use before the week. */
  firstTime: number;
  /** Of them, people who started Bible Basics or the I'm New journey. */
  startedJourney: number;
  /** People at the campus who opened it in the 7 days before. */
  prevReaders: number;
};

/** Readers must move by at least this share of last week before the comparison shows. */
export const COMPARE_MIN_CHANGE_PERCENT = 15;

export type ReadingWeekComparison = { direction: 'up' | 'down'; prevReaders: number };

export type ReadingWeekLineParts = {
  campusName: string;
  readers: number;
  /** null when no one read for the first time: the clause is left out. */
  firstTime: number | null;
  /** null when no one started Bible Basics or I'm New: the clause is left out. */
  startedJourney: number | null;
  /** The one comparison, or null when it moved less than 15% (or there is no last week to compare). */
  comparison: ReadingWeekComparison | null;
};

function count(v: unknown): number {
  return typeof v === 'number' && Number.isSafeInteger(v) && v >= 0 ? v : 0;
}

/** The answer, with only the keys this line uses (the server already sends only these). */
export function parseReadingWeek(raw: unknown): ReadingWeek | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.campusId !== 'string' || !r.campusId) return null;
  return {
    campusId: r.campusId,
    campusName: typeof r.campusName === 'string' && r.campusName ? r.campusName : r.campusId,
    readers: count(r.readers),
    firstTime: count(r.first_time),
    startedJourney: count(r.started_journey),
    prevReaders: count(r.prev_readers),
  };
}

/**
 * The campus's reading week, or null when there is none for this person to
 * see (403 for media or an unconfirmed campus, 400 for hub or admin with no
 * campus): the line is then simply not shown. Any other failure throws.
 */
export async function getReadingWeek(campusId?: string): Promise<ReadingWeek | null> {
  try {
    const raw = await intake('reading_week', campusId ? { campusId } : {});
    return parseReadingWeek(raw);
  } catch (err) {
    const status = (err as { status?: number } | null)?.status;
    if (status === 403 || status === 400) return null;
    throw err;
  }
}

/**
 * The comparison with the week before, only when readers moved by 15% or
 * more. No week before (0 readers then) gives no comparison: there is no
 * share to move by, and "up from 0" says nothing a pastor can use.
 */
export function readingWeekComparison(readers: number, prevReaders: number): ReadingWeekComparison | null {
  const now = count(readers);
  const prev = count(prevReaders);
  if (prev === 0 || now === prev) return null;
  if (Math.abs(now - prev) * 100 < COMPARE_MIN_CHANGE_PERCENT * prev) return null;
  return { direction: now > prev ? 'up' : 'down', prevReaders: prev };
}

/** What the line says, worked out from the counts. */
export function readingWeekLine(week: ReadingWeek): ReadingWeekLineParts {
  return {
    campusName: week.campusName,
    readers: count(week.readers),
    firstTime: count(week.firstTime) > 0 ? count(week.firstTime) : null,
    startedJourney: count(week.startedJourney) > 0 ? count(week.startedJourney) : null,
    comparison: readingWeekComparison(week.readers, week.prevReaders),
  };
}
