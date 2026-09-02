/**
 * Pastor floor (Study & Preach plan, §4.1, 1 Sep 2026). HomeScreen is 4,500
 * lines and not unit-renderable, so these pin the source contract the way
 * home-hero-reading.test.ts does.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { PASTOR_CHAPTERS } from '../data/pastor';

const HOME = readFileSync(join(__dirname, '../screens/HomeScreen.tsx'), 'utf-8');
const SHEET = readFileSync(join(__dirname, '../components/ChoosePathSheet.tsx'), 'utf-8');

describe('pastor day-one floor', () => {
  it('pastor_leader has a hero fallback reading inside heroChapterRefs', () => {
    const start = HOME.indexOf('const heroChapterRefs = useMemo');
    expect(start).toBeGreaterThan(0);
    const memo = HOME.slice(start, HOME.indexOf('}, [', start));
    expect(memo).toMatch(/personaConfig\.persona === 'pastor_leader'/);
    expect(memo).toMatch(/PASTOR_CHAPTERS\[localDayIndex\(\) % PASTOR_CHAPTERS\.length\]/);
    // Still only when the pastor has no plan and no slots — never over a real reading.
    expect(memo).toMatch(/if \(refs\.length === 0\)/);
  });

  it('PASTOR_CHAPTERS are unique whole-chapter refs in the shape the hero resolves', () => {
    expect(PASTOR_CHAPTERS.length).toBeGreaterThanOrEqual(28);
    expect(new Set(PASTOR_CHAPTERS).size).toBe(PASTOR_CHAPTERS.length);
    for (const ref of PASTOR_CHAPTERS) expect(ref).toMatch(/^(\d )?[A-Z][a-z]+ \d+$/);
  });

  it('the March-2026 feedback poll no longer renders on Home', () => {
    expect(HOME).not.toMatch(/FeedbackPoll/);
    expect(HOME).not.toMatch(/pf\.pollBanner/);
  });

  it('the path swatch and chooser sheet are locked to the pastor sign-in and offer sign-out', () => {
    // The persona chip became the PathSwatch + ChoosePathSheet (2 Sep 2026); the
    // lock and the sign-out live there now, off the same staff-session signal.
    expect(HOME).toMatch(/<PathSwatch persona=\{personaConfig\.persona\} \/>/);
    expect(SHEET).toMatch(/const locked = useIsPastorSignedIn\(\);/);
    expect(SHEET).toMatch(/const pastorLocked = useIsPastorSignedIn\(\);/);
    expect(SHEET).toMatch(/pastor_chip_sign_out/);
    expect(SHEET).toMatch(/void clearStaffIdentity\(\)\.then/);
    // A hand-typed code must not inherit the sign-in marker (sign-out would wipe it).
    expect(HOME).toMatch(/setHandTypedPastorCode\(code\)/);
    expect(HOME).not.toMatch(/localStorage\.setItem\('dw_pastor_code'/);
  });

  it('the Campus Overview picks up a provisioned code without a remount', () => {
    expect(HOME).toMatch(/window\.addEventListener\(PASTOR_CODE_EVENT, onCode\)/);
    expect(HOME).toMatch(/useState<string>\(\(\) => getPastorCode\(\)\)/);
  });

  it('Bible AI is told which chapter "this passage" is', () => {
    expect(HOME).toMatch(/currentPassage=\{heroChapterRefs\[heroChapterIndex\] \|\| heroChapterRefs\[0\] \|\| ''\}/);
  });
});
