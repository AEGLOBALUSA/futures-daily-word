/**
 * Source-text guards (Wave 0, step 8): the Read tap must no longer credit a
 * plan day, and the mount-time streak record must be gone — completion and
 * the streak now come only from an explicit reading interaction.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const home = readFileSync(resolve(__dirname, 'HomeScreen.tsx'), 'utf8');

describe('handleRead no longer credits a plan day', () => {
  it('the handleRead body does not call markPlanDayComplete', () => {
    const start = home.indexOf('const handleRead = (passage: string) => {');
    expect(start).toBeGreaterThan(-1);
    const body = home.slice(start, home.indexOf('const handleListen = ', start));
    expect(body).not.toContain('markPlanDayComplete');
  });

  it('the file overall still calls markPlanDayComplete (handleMarkRead keeps it)', () => {
    expect(home).toContain('markPlanDayComplete');
  });
});

describe('the mount-time streak record is gone', () => {
  it('the removed mount comment no longer appears', () => {
    expect(home).not.toContain('Record today as a reading day + handle streak freeze');
  });

  it('recordStreakToday() is no longer invoked from an unconditional mount effect', () => {
    // The removed block called recordStreakToday() unconditionally on mount;
    // assert the specific removed shape (result.isNew / setStreakCount pair
    // sitting directly under a bare `useEffect(() => {`) is gone.
    expect(home).not.toMatch(/useEffect\(\(\) => \{\s*const result = recordStreakToday\(\);/);
  });

  it('Home no longer records the streak itself', () => {
    // The mount block was the only place Home called recordStreakToday. The
    // streak is now rolled forward inside recordReadDay, so Home does not
    // reference it at all.
    expect(home).not.toContain('recordStreakToday');
  });

  it('the streak still advances, from the genuine reading interactions', () => {
    expect(home).toContain("const r = recordReadDay('complete');");
    expect(home).toContain("const r = recordReadDay('pathway');");
    expect(home).toContain("const r = recordReadDay('audio');");
    const readDays = readFileSync(resolve(__dirname, '../utils/readDays.ts'), 'utf8');
    expect(readDays).toContain('const streak = recordStreakToday();');
  });

  it('a streak milestone still raises the overlay after a genuine read', () => {
    expect(home).toContain('if (r.streak.isNew && r.streak.isMilestone) {');
  });
});

describe('no decorative UI emoji glyphs remain', () => {
  it('the file contains no characters in the U+1F300-1FAFF pictograph range', () => {
    // eslint-disable-next-line no-control-regex
    const matches = home.match(/[\u{1F300}-\u{1FAFF}]/gu);
    expect(matches).toBeNull();
  });
});
