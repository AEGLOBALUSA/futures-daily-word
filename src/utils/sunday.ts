/**
 * Sunday Service Window helpers.
 *
 * The window runs from Sunday 00:00 to Sunday `until` (16:00 unless the campus
 * says otherwise) on the reader's CAMPUS clock, not the device's and never
 * the server's: a reader in Adelaide sees Sunday's notes on Sunday morning in
 * Adelaide. 16:00 is the design window of c25111d9 (14 Mar, "midnight Saturday
 * to 4 PM Sunday"); the old Saturday 11:40 PM start and 2:26 PM end were
 * leftovers from a test weekend (58d0cd2a, 5ce9213b).
 *
 * The campus comes from the one campus list (B09-02, dw_campuses, kept by the
 * owner in /staff -> Settings -> Campuses): its `timeZone`, and its
 * `sundayUntil` for a campus whose last service runs later. Without a known
 * campus: this device's zone and 16:00. A later service is changed in /staff,
 * never in code.
 */

import { startGraceSeriesIfCold } from './coldStart';
import { findCampus, type CampusRow } from '../data/campuses';
import { deviceTimeZone, isValidTimeZone, parseHHMM, zonedDate, zonedParts } from './zonedTime';

/** The default end of the Sunday window, local time. */
export const SUNDAY_UNTIL_DEFAULT = '16:00';

/** The reader's campus from their saved profile, when they have chosen one. */
export function readerCampus(): CampusRow | undefined {
  try {
    const profile = JSON.parse(localStorage.getItem('dw_profile') || 'null');
    const id = profile && typeof profile.campus === 'string' ? profile.campus : '';
    return id ? findCampus(id) : undefined;
  } catch {
    return undefined;
  }
}

/** The reader's campus time zone, else this device's zone. */
export function readerTimeZone(campus: CampusRow | undefined = readerCampus()): string {
  return campus && isValidTimeZone(campus.timeZone) ? campus.timeZone : deviceTimeZone();
}

/** When Sunday's window closes for the reader's campus ("HH:MM"), else 16:00. */
export function readerSundayUntil(campus: CampusRow | undefined = readerCampus()): string {
  return campus && parseHHMM(campus.sundayUntil) !== null ? campus.sundayUntil : SUNDAY_UNTIL_DEFAULT;
}

/**
 * True from Sunday 00:00 to Sunday `until` (exclusive) in `timeZone`.
 * Pure when all three arguments are passed.
 */
export function isSundayWindow(
  now: Date = new Date(),
  timeZone: string = readerTimeZone(),
  until: string = readerSundayUntil(),
): boolean {
  const p = zonedParts(now, timeZone);
  if (p.weekday !== 0) return false;
  const end = parseHHMM(until) ?? (parseHHMM(SUNDAY_UNTIL_DEFAULT) as number);
  return p.hour * 60 + p.minute < end;
}

/** The local date (YYYY-MM-DD) in `timeZone`: Sunday's own date on a Sunday morning anywhere. */
export function getSundayDate(now: Date = new Date(), timeZone: string = readerTimeZone()): string {
  return zonedDate(now, timeZone);
}

/** Check if the user arrived via a ?sunday=1 QR/deep link */
export function isSundayDeepLink(): boolean {
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get('sunday') === '1';
  } catch {
    return false;
  }
}

/** Set up guest mode for Sunday QR visitors */
export function activateSundayGuest(): void {
  const date = getSundayDate();
  localStorage.setItem('dw_sunday_guest', date);
  // Same Day 1 as a cold futuresdailyword.com visit — Sunday church traffic
  // should land in the 40-day series, not an empty congregation home.
  // Fill-only: a real Settings/onboarding choice is left alone.
  startGraceSeriesIfCold('sunday-guest');
  if (!localStorage.getItem('dw_v7_pathway_done')) {
    localStorage.setItem('dw_v7_pathway_done', 'true');
  }
  // Clean up URL param without page reload
  try {
    const url = new URL(window.location.href);
    url.searchParams.delete('sunday');
    window.history.replaceState({}, '', url.toString());
  } catch { /* ignore */ }
}

/** Check if we're currently in Sunday guest mode (and it hasn't expired) */
export function isSundayGuest(): boolean {
  const guestDate = localStorage.getItem('dw_sunday_guest');
  if (!guestDate) return false;
  // Guest mode is valid for the Sunday window only
  if (isSundayWindow()) return true;
  // Outside window — clean up the flag
  localStorage.removeItem('dw_sunday_guest');
  return false;
}
