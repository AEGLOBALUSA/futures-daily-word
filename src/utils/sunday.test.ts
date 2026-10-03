/**
 * The Sunday window on the campus clock (B09-08 step 1).
 *
 * Every instant below is written in UTC and named by its local time, so a
 * window computed by adding a fixed offset fails the daylight-saving cases:
 * South Australia moves forward on Sun 4 Oct 2026 (+9:30 → +10:30), the USA
 * moves back on Sun 1 Nov 2026 (-4 → -5).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { isSundayWindow, getSundayDate, readerTimeZone, readerSundayUntil, SUNDAY_UNTIL_DEFAULT } from './sunday';
import { __resetCampusesForTests } from '../data/campuses';

const ADL = 'Australia/Adelaide';
const NY = 'America/New_York';
const at = (iso: string) => new Date(iso);

describe('isSundayWindow: Adelaide', () => {
  it('Sunday 15:59 is in, 16:00 is out (before daylight saving, +9:30)', () => {
    expect(isSundayWindow(at('2026-09-27T06:29:00Z'), ADL, '16:00')).toBe(true);
    expect(isSundayWindow(at('2026-09-27T06:30:00Z'), ADL, '16:00')).toBe(false);
  });

  it('Saturday 23:59 is out; Sunday 00:00 is in', () => {
    expect(isSundayWindow(at('2026-09-26T14:29:00Z'), ADL, '16:00')).toBe(false);
    expect(isSundayWindow(at('2026-09-26T14:30:00Z'), ADL, '16:00')).toBe(true);
  });

  it('Sun 4 Oct 2026, the day daylight saving starts (+10:30): 15:59 in, 16:00 out', () => {
    expect(isSundayWindow(at('2026-10-04T05:29:00Z'), ADL, '16:00')).toBe(true);
    expect(isSundayWindow(at('2026-10-04T05:30:00Z'), ADL, '16:00')).toBe(false);
    // Saturday 3 Oct 23:59 is still standard time (+9:30)
    expect(isSundayWindow(at('2026-10-03T14:29:00Z'), ADL, '16:00')).toBe(false);
  });

  it("a campus with a later service: until '18:30' keeps 18:29 and drops 18:30", () => {
    expect(isSundayWindow(at('2026-10-04T07:59:00Z'), ADL, '18:30')).toBe(true);
    expect(isSundayWindow(at('2026-10-04T08:00:00Z'), ADL, '18:30')).toBe(false);
  });

  it('a weekday is never in the window', () => {
    expect(isSundayWindow(at('2026-10-06T00:00:00Z'), ADL, '16:00')).toBe(false);
  });
});

describe('isSundayWindow: New York', () => {
  it('Sunday 15:59 in, 16:00 out (daylight time, -4)', () => {
    expect(isSundayWindow(at('2026-10-04T19:59:00Z'), NY, '16:00')).toBe(true);
    expect(isSundayWindow(at('2026-10-04T20:00:00Z'), NY, '16:00')).toBe(false);
  });

  it("until '18:30': 18:29 in, 18:30 out", () => {
    expect(isSundayWindow(at('2026-10-04T22:29:00Z'), NY, '18:30')).toBe(true);
    expect(isSundayWindow(at('2026-10-04T22:30:00Z'), NY, '18:30')).toBe(false);
  });

  it('Sun 1 Nov 2026, the day daylight saving ends (-5): 15:59 in, 16:00 out', () => {
    expect(isSundayWindow(at('2026-11-01T20:59:00Z'), NY, '16:00')).toBe(true);
    expect(isSundayWindow(at('2026-11-01T21:00:00Z'), NY, '16:00')).toBe(false);
    // Saturday 31 Oct 23:59 (still -4) is out; Sunday 00:30 is in
    expect(isSundayWindow(at('2026-11-01T03:59:00Z'), NY, '16:00')).toBe(false);
    expect(isSundayWindow(at('2026-11-01T04:30:00Z'), NY, '16:00')).toBe(true);
  });

  it('the same instant is Sunday morning in Adelaide and Saturday evening in New York', () => {
    const instant = at('2026-10-03T22:45:00Z'); // Sun 09:15 Adelaide, Sat 18:45 New York
    expect(isSundayWindow(instant, ADL, '16:00')).toBe(true);
    expect(isSundayWindow(instant, NY, '16:00')).toBe(false);
  });
});

describe('getSundayDate', () => {
  it("returns Sunday's own date at Sunday 08:00 in Adelaide (the UTC date is still Saturday)", () => {
    expect(getSundayDate(at('2026-10-03T21:30:00Z'), ADL)).toBe('2026-10-04');
  });

  it('returns the New York date for the same instant', () => {
    expect(getSundayDate(at('2026-10-03T21:30:00Z'), NY)).toBe('2026-10-03');
  });
});

describe("the reader's campus clock", () => {
  beforeEach(() => { localStorage.clear(); __resetCampusesForTests(); });

  it("reads the campus's zone and closing time from the one campus list", () => {
    localStorage.setItem('dw_profile', JSON.stringify({ campus: 'au-paradise' }));
    expect(readerTimeZone()).toBe(ADL);
    expect(readerSundayUntil()).toBe('16:00');
  });

  it('a campus with a later close in the list moves the window without a code change', () => {
    localStorage.setItem('dw_campuses_cache', JSON.stringify([
      { id: 'au-paradise', name: 'Futures Paradise', timeZone: ADL, sundayUntil: '18:30', sortOrder: 10 },
    ]));
    localStorage.setItem('dw_profile', JSON.stringify({ campus: 'au-paradise' }));
    expect(readerSundayUntil()).toBe('18:30');
    expect(isSundayWindow(at('2026-10-04T07:59:00Z'))).toBe(true);
    expect(isSundayWindow(at('2026-10-04T08:00:00Z'))).toBe(false);
  });

  it('no campus: the device zone and 16:00', () => {
    expect(readerTimeZone()).toBe(Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
    expect(readerSundayUntil()).toBe(SUNDAY_UNTIL_DEFAULT);
  });

  it('a broken profile or blocked storage still answers', () => {
    localStorage.setItem('dw_profile', '{not json');
    expect(() => isSundayWindow()).not.toThrow();
  });
});
