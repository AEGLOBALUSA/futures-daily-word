/**
 * Source-text guards for the I'm-New journey flow (Ashley, 1 Sep 2026):
 * the home screen shows the 40-day journey IMMEDIATELY as the primary object,
 * and tapping it opens the full-screen Day N reading with the verses already
 * open. These greps lock the flow's contract the way home-hero-reading.test.ts
 * locks the hero's Read-first contract.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const home = readFileSync(resolve(__dirname, 'HomeScreen.tsx'), 'utf8');
const card = readFileSync(resolve(__dirname, '../components/NewBelieverLessonCard.tsx'), 'utf8');

describe("I'm New journey flow", () => {
  it('the journey hero renders for the new-Christian persona', () => {
    // The dedicated sage journey hero branch exists…
    expect(home).toContain('key="hero-journey"');
    // …and opens the full-screen Day N surface.
    expect(home).toContain('setShowJourneyDay(true)');
  });

  it('the Day N lesson is NOT gated behind the hero Read state any more', () => {
    // The old mount required isReadingOpen(...) before the journey appeared —
    // the exact gate the owner called the bug. The card mount must not depend
    // on isReadingOpen.
    const mount = home.slice(home.indexOf('<NewBelieverLessonCard'));
    const mountBlock = mount.slice(0, mount.indexOf('/>'));
    expect(mountBlock).not.toContain('isReadingOpen');
    expect(home).toContain('showJourneyDay &&');
  });

  it('the Day N surface IS the reading — verses render on it', () => {
    expect(card).toContain('ScripturePassage');
    // Back gesture support: one history entry while open.
    expect(card).toContain('useSubView');
  });

  it('the journey surface speaks sage, not a second green', () => {
    // Only the token family may be used — no raw green hexes.
    expect(card).toContain('var(--dw-new)');
    expect(card).not.toMatch(/#(2E7D32|4CAF50|66BB6A|8BC34A)/i);
  });
});
