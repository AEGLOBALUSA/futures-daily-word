/**
 * Source-text guards for Wave 0 and its data-safety follow-up.
 *
 * The Read tap must not credit a plan day (completion needs an explicit action),
 * and the day-count chip reads dw_read_days, not the streak. But the streak must
 * still be KEPT ALIVE on open: Wave 0 removed the mount-time record, which let a
 * reader who reads the on-screen passage without ever tapping a completion lose
 * their streak after the freeze grace. The keepalive is restored on mount, and
 * the streak also advances from genuine reading interactions.
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

describe('the streak is kept alive on open (data-loss fix)', () => {
  it('Home records the streak in a mount-once effect', () => {
    // Wave 0 removed this and made the streak advance only from genuine reads,
    // which let an on-screen reader who never taps a completion lose their run.
    // The keepalive is restored: a bare mount effect calls recordStreakToday().
    expect(home).toMatch(/useEffect\(\(\) => \{\s*const result = recordStreakToday\(\);/);
  });

  it('the mount keepalive surfaces a milestone on open', () => {
    expect(home).toContain('if (result.isNew && result.isMilestone) {');
  });

  it('the streak ALSO advances from genuine reading interactions', () => {
    // recordReadDay rolls the streak too (idempotent per day), so a genuine read
    // keeps it alive on a day the app was never merely opened.
    expect(home).toContain("const r = recordReadDay('complete');");
    expect(home).toContain("const r = recordReadDay('pathway');");
    expect(home).toContain("const r = recordReadDay('audio');");
    const readDays = readFileSync(resolve(__dirname, '../utils/readDays.ts'), 'utf8');
    expect(readDays).toContain('const streak = recordStreakToday();');
  });

  it('the day-count chip still reads dw_read_days, not the streak', () => {
    // The honest-number change Wave 0 shipped must survive the keepalive: the
    // header count is readDayCount, and Home does not print getStreak().count
    // as the chip number.
    expect(home).toContain('readDayCount');
  });
});

describe('no decorative UI emoji glyphs remain', () => {
  it('the file contains no characters in the U+1F300-1FAFF pictograph range', () => {
    // eslint-disable-next-line no-control-regex
    const matches = home.match(/[\u{1F300}-\u{1FAFF}]/gu);
    expect(matches).toBeNull();
  });
});
