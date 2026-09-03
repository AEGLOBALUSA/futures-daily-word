/**
 * Weekly turnover — netlify/functions/lib/sermon-window.js (Ashley, 2 Sep 2026 night).
 * September 2026: Wednesday 2nd, Sundays 6th, 13th, 20th, 27th.
 */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const w = require('../../netlify/functions/lib/sermon-window.js');

const iso = (d: Date) => d.toISOString();

describe('sermon window — zone arithmetic', () => {
  it('reads the wall clock of an instant in each congregation zone', () => {
    const p = w.localParts(new Date('2026-09-06T14:30:00Z'), 'America/New_York');
    expect([p.year, p.month, p.day, p.hour, p.minute]).toEqual([2026, 9, 6, 10, 30]);
    const a = w.localParts(new Date('2026-09-06T14:30:00Z'), 'Australia/Adelaide');
    expect([a.year, a.month, a.day, a.hour, a.minute]).toEqual([2026, 9, 7, 0, 0]);
  });

  it('turns a local 04:00 into the right instant, across the New York DST switch', () => {
    // EDT (UTC-4) in September …
    expect(iso(w.zonedToInstant(2026, 9, 13, 4, 'America/New_York'))).toBe('2026-09-13T08:00:00.000Z');
    // … EST (UTC-5) on the morning the clocks go back (1 Nov 2026).
    expect(iso(w.zonedToInstant(2026, 11, 1, 4, 'America/New_York'))).toBe('2026-11-01T09:00:00.000Z');
    // Adelaide, ACST (UTC+9:30) before its October DST start.
    expect(iso(w.zonedToInstant(2026, 9, 13, 4, 'Australia/Adelaide'))).toBe('2026-09-12T18:30:00.000Z');
    // Adelaide, ACDT (UTC+10:30) after it (first Sunday in October, 4 Oct 2026).
    expect(iso(w.zonedToInstant(2026, 10, 11, 4, 'Australia/Adelaide'))).toBe('2026-10-10T17:30:00.000Z');
  });

  it('finds the service Sunday: today when today is Sunday, else the coming one', () => {
    expect(w.serviceSunday(2026, 9, 6)).toMatchObject({ year: 2026, month: 9, day: 6 });
    expect(w.serviceSunday(2026, 9, 2)).toMatchObject({ year: 2026, month: 9, day: 6 });
    expect(w.serviceSunday(2026, 9, 7)).toMatchObject({ year: 2026, month: 9, day: 13 });
    expect(w.serviceSunday(2026, 9, 30)).toMatchObject({ year: 2026, month: 10, day: 4 });
  });

  it('parses only a real calendar date', () => {
    expect(w.parseDateOnly('2026-09-06')).toEqual({ year: 2026, month: 9, day: 6 });
    expect(w.parseDateOnly('2026-09-06T10:00:00Z')).toEqual({ year: 2026, month: 9, day: 6 });
    expect(w.parseDateOnly('2026-02-31')).toBeNull();
    expect(w.parseDateOnly('Sunday')).toBeNull();
    expect(w.parseDateOnly('')).toBeNull();
    expect(w.parseDateOnly(undefined)).toBeNull();
  });
});

describe('sermon window — when a message stops being current', () => {
  const us = (published_at: string, date?: string) => ({
    congregation: 'futures-us', published_at, is_current: true, sermon: { id: 'x', date },
  });

  it('published midweek for this Sunday: current until 04:00 the Sunday after, New York time', () => {
    // Wed 2 Sep, 15:00 EDT → service Sunday 6 Sep → cutoff Sun 13 Sep 04:00 EDT = 08:00Z
    expect(iso(w.currentUntil(us('2026-09-02T19:00:00Z', '2026-09-06')))).toBe('2026-09-13T08:00:00.000Z');
  });

  it('published Sunday morning before the service, or Sunday evening after it: the same week', () => {
    expect(iso(w.currentUntil(us('2026-09-06T12:00:00Z', '2026-09-06')))).toBe('2026-09-13T08:00:00.000Z');
    expect(iso(w.currentUntil(us('2026-09-07T00:30:00Z', '2026-09-06')))).toBe('2026-09-13T08:00:00.000Z'); // 20:30 EDT Sunday
  });

  it('a pastor up after midnight on Saturday night is still publishing for that Sunday', () => {
    // 02:00 EDT Sunday 6 Sep = 06:00Z; local date is already Sunday the 6th
    expect(iso(w.currentUntil(us('2026-09-06T06:00:00Z', '2026-09-06')))).toBe('2026-09-13T08:00:00.000Z');
  });

  it('a stale or missing sermon date never shortens the week the publish itself earns', () => {
    // Published Thu 10 Sep for Sun 13 Sep, but the pastor left last week's date on it.
    expect(iso(w.currentUntil(us('2026-09-10T15:00:00Z', '2026-08-30')))).toBe('2026-09-20T08:00:00.000Z');
    expect(iso(w.currentUntil(us('2026-09-10T15:00:00Z')))).toBe('2026-09-20T08:00:00.000Z');
    expect(iso(w.currentUntil(us('2026-09-10T15:00:00Z', 'not a date')))).toBe('2026-09-20T08:00:00.000Z');
  });

  it('a future sermon date keeps the message up until the week after that Sunday', () => {
    expect(iso(w.currentUntil(us('2026-09-02T19:00:00Z', '2026-09-20')))).toBe('2026-09-27T08:00:00.000Z');
  });

  it('Australia turns over on Adelaide time, not Atlanta time', () => {
    const au = { congregation: 'futures-au', published_at: '2026-09-02T19:00:00Z', is_current: true, sermon: { id: 'x-au', date: '2026-09-06' } };
    // Sun 13 Sep 04:00 ACST = Sat 12 Sep 18:30Z — nine and a half hours before the US row's cutoff.
    expect(iso(w.currentUntil(au))).toBe('2026-09-12T18:30:00.000Z');
  });

  it('Futuros shares the Georgia clock; an unknown congregation falls back to it', () => {
    expect(w.congregationTimeZone('futuros-us')).toBe('America/New_York');
    expect(w.congregationTimeZone('somewhere-else')).toBe('America/New_York');
  });

  it('an unparseable published_at counts as now, so the row still has a week', () => {
    const now = new Date('2026-09-02T19:00:00Z');
    expect(iso(w.currentUntil({ congregation: 'futures-us', published_at: 'garbage', sermon: {} }, now))).toBe('2026-09-13T08:00:00.000Z');
  });

  it('isCurrentAt: the database flag AND inside the week', () => {
    const row = us('2026-09-02T19:00:00Z', '2026-09-06');
    expect(w.isCurrentAt(row, new Date('2026-09-09T12:00:00Z'))).toBe(true);   // Wednesday after
    expect(w.isCurrentAt(row, new Date('2026-09-13T07:59:59Z'))).toBe(true);   // 03:59:59 EDT Sunday
    expect(w.isCurrentAt(row, new Date('2026-09-13T08:00:00Z'))).toBe(false);  // 04:00 EDT Sunday — over
    expect(w.isCurrentAt({ ...row, is_current: false }, new Date('2026-09-09T12:00:00Z'))).toBe(false);
    expect(w.isCurrentAt(null, new Date())).toBe(false);
  });
});
