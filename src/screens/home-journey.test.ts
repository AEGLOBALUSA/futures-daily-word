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
const plans = readFileSync(resolve(__dirname, 'PlansScreen.tsx'), 'utf8');
const more = readFileSync(resolve(__dirname, 'MoreScreen.tsx'), 'utf8');
const series = readFileSync(resolve(__dirname, '../../books/faith-pathway.json'), 'utf8');

describe('New to Faith journey flow', () => {
  it('the journey hero renders for the new-Christian persona', () => {
    expect(home).toContain('key="hero-journey"');
    expect(home).toContain('setJourneyViewOpen(true)');
    expect(home).toContain('NewFaithCTA');
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

  it('uses the canonical New to Faith name on the series file and Day N', () => {
    expect(series).toMatch(/"title":\s*"New to Faith"/);
    expect(series).not.toMatch(/New & Returning/);
    expect(card).toContain("trans('persona_new'");
    expect(home).toContain("tI18n('persona_new'");
  });

  it('Plans keeps one NewFaithCTA on the journey card — chooser does not start Day 1', () => {
    expect(plans).toContain('dw-plan-sd-card-new');
    expect(plans).toContain('<NewFaithCTA');
    expect(plans).toContain('<PathwayPicker');
    expect(plans).not.toMatch(/<PathwayPicker[\s\S]*onBeginDay1/);
  });

  it('Settings groups Appearance, Journey, then Campus', () => {
    const appearance = more.indexOf("t('appearance'");
    const journey = more.indexOf("t(\"your_journey\"");
    const campus = more.indexOf("t(\"your_campus\"");
    expect(appearance).toBeGreaterThan(0);
    expect(journey).toBeGreaterThan(appearance);
    expect(campus).toBeGreaterThan(journey);
  });
});
