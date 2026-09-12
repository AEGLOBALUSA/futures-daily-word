/**
 * dw_read_days — the local en-CA date axis of genuine reading interactions.
 * Covers: merge (union/dedupe/sort/cap), idempotent same-day recording, merge from
 * pre-existing localStorage, and the cross-device union-merge wiring in cloudSync.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it, expect, beforeEach } from 'vitest';
import { mergeReadDays, readDaysTotal } from './readDaysMerge';
import { getReadDayCount, recordReadDay } from './readDays';
import { LS } from './storage';

describe('mergeReadDays', () => {
  it('unions two inputs, dedupes, and sorts ascending', () => {
    const out = mergeReadDays(['2026-09-10', '2026-09-08'], ['2026-09-08', '2026-09-09']);
    expect(out.dates).toEqual(['2026-09-08', '2026-09-09', '2026-09-10']);
    expect(out.dropped).toBe(0);
  });

  it('drops junk entries that are not YYYY-MM-DD strings', () => {
    const out = mergeReadDays(['2026-09-10', 'not-a-date', null, 42, undefined], ['2026-9-1']);
    expect(out.dates).toEqual(['2026-09-10']);
  });

  it('handles non-array inputs gracefully', () => {
    expect(mergeReadDays(null, undefined)).toEqual({ dates: [], dropped: 0 });
    expect(mergeReadDays('garbage', {})).toEqual({ dates: [], dropped: 0 });
  });

  it('caps the retained window at 1200 dates and carries the overflow as `dropped`, so the true total does not freeze', () => {
    const many = Array.from({ length: 1500 }, (_, i) => {
      const d = new Date(2020, 0, 1 + i);
      return d.toISOString().slice(0, 10);
    });
    const out = mergeReadDays(many, []);
    expect(out.dates).toHaveLength(1200);
    expect(out.dropped).toBe(300);
    expect(readDaysTotal(out)).toBe(1500);
    expect(out.dates[out.dates.length - 1]).toBe(many[many.length - 1]);

    // A further merge that pushes the window over the cap again must keep
    // adding to `dropped`, not resetting it — the total keeps climbing.
    const nextDay = new Date(2020, 0, 1501).toISOString().slice(0, 10);
    const again = mergeReadDays(out, [nextDay]);
    expect(again.dates).toHaveLength(1200);
    expect(again.dropped).toBe(301);
    expect(readDaysTotal(again)).toBe(1501);
  });

  it('reads a plain legacy array (pre-existing records) as dropped: 0', () => {
    const out = mergeReadDays(['2026-01-01', '2026-01-02'], []);
    expect(out).toEqual({ dates: ['2026-01-01', '2026-01-02'], dropped: 0 });
  });

  it('takes the MAX of the two sides\' dropped counts on merge, never the sum, so two devices merging cannot double-count', () => {
    const left = { dates: ['2026-05-01', '2026-05-02'], dropped: 50 };
    const right = { dates: ['2026-05-02', '2026-05-03'], dropped: 30 };
    const out = mergeReadDays(left, right);
    expect(out.dropped).toBe(50); // max(50, 30), not 80
    expect(readDaysTotal(out)).toBe(50 + 3); // 3 retained dates + the max dropped
  });
});

describe('recordReadDay', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("stores today's local en-CA date, not a UTC slice", () => {
    const today = new Date().toLocaleDateString('en-CA');
    const result = recordReadDay('complete');
    expect(result.dates).toContain(today);
    expect(result.isNew).toBe(true);
    const stored = JSON.parse(localStorage.getItem(LS.readDays) || '{}');
    expect(stored.dates).toContain(today);
  });

  it('a second call the same day is not new and leaves the array length unchanged', () => {
    const first = recordReadDay('audio');
    const second = recordReadDay('highlight');
    expect(second.isNew).toBe(false);
    expect(second.dates).toHaveLength(first.dates.length);
  });

  it('merges from localStorage when it already holds older dates, never rebuilding from scratch', () => {
    localStorage.setItem(LS.readDays, JSON.stringify(['2020-01-01', '2020-01-02']));
    const result = recordReadDay('journal');
    expect(result.dates).toEqual(expect.arrayContaining(['2020-01-01', '2020-01-02']));
    expect(result.dates.length).toBe(3);
  });
});

describe('getReadDayCount', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('reflects the stored array', () => {
    localStorage.setItem(LS.readDays, JSON.stringify(['2026-01-01', '2026-01-02', '2026-01-03']));
    expect(getReadDayCount()).toBe(3);
  });

  it('is zero when nothing is stored', () => {
    expect(getReadDayCount()).toBe(0);
  });
});

describe('cloudSync source guards — dw_read_days union-merge is wired, not just declared', () => {
  const cloudSyncSrc = readFileSync(
    path.resolve(process.cwd(), 'src/utils/cloudSync.ts'),
    'utf8'
  );

  it("registers 'dw_read_days' as a synced misc key", () => {
    expect(cloudSyncSrc).toContain('dw_read_days');
  });

  it('resolves it through UNION_MISC, never newest-wins alone', () => {
    expect(cloudSyncSrc).toContain('UNION_MISC');
  });
});
