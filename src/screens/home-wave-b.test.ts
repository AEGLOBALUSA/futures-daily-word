/**
 * Source-text guards for Wave B (build/wave-b), locking six HomeScreen
 * rulings plus one on ComfortSection the same way home-hero-reading.test.ts
 * and home-journey.test.ts lock their contracts — via regex/indexOf greps
 * against the file as text, because HomeScreen is not unit-renderable.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const HOME = readFileSync(join(__dirname, '../screens/HomeScreen.tsx'), 'utf-8');
const COMFORT = readFileSync(join(__dirname, '../components/ComfortSection.tsx'), 'utf-8');

describe('Home wave-b contracts', () => {
  it('ruling: Sermon Notes is demoted below the hero reading + InlineReflection for returning personas', () => {
    const heroSermonNotes = HOME.indexOf("{isNewPath && isSundayWindow() && sermonNotesRow}");
    const inlineReflection = HOME.indexOf('<InlineReflection');
    const demotedSermonNotes = HOME.indexOf('{!isNewPath && sermonNotesRow}');
    expect(heroSermonNotes).toBeGreaterThan(-1);
    expect(inlineReflection).toBeGreaterThan(-1);
    expect(demotedSermonNotes).toBeGreaterThan(-1);
    // The demoted (returning-persona) render sits after both the hero panel
    // (represented by the isNewPath sermon-notes render inside it) and the
    // InlineReflection mount.
    expect(demotedSermonNotes).toBeGreaterThan(heroSermonNotes);
    expect(demotedSermonNotes).toBeGreaterThan(inlineReflection);
    // sermonNotesRow is rendered in exactly these two places.
    const occurrences = HOME.split('sermonNotesRow').length - 1;
    expect(occurrences).toBe(3); // 1 definition + 2 renders
    expect(HOME).toMatch(/import \{ isSundayWindow \} from '\.\.\/utils\/sunday'/);
  });

  it('ruling: one chapter surface — plan sections filter through notInHero against heroChapterRefs and title with also_today', () => {
    const notInHeroCalls = HOME.split('notInHero(').length - 1;
    expect(notInHeroCalls).toBeGreaterThanOrEqual(2);
    expect(HOME).toMatch(/notInHero\([^)]*heroChapterRefs\)/);
    expect(HOME).toMatch(/tI18n\('also_today'/);
    expect(HOME).not.toMatch(/>TODAY'S CHAPTERS</);
    expect(HOME).not.toMatch(/>TODAY'S STUDY</);
    expect(HOME).not.toMatch(/tI18n\('todays_study'/);
  });

  it('ruling: comfort never celebrates — pf.celebrations === \'full\' guards the milestone path and DoneCelebration showCount', () => {
    const markRead = HOME.slice(HOME.indexOf('const handleMarkRead ='), HOME.indexOf('const handleMarkRead =') + 800);
    expect(markRead).toMatch(/pf\.celebrations === 'full'/);
    expect(HOME).toMatch(/showMilestone !== null && pf\.celebrations === 'full'/);
    expect(HOME).toMatch(/showCount=\{pf\.celebrations === 'full'\}/);
  });

  it('ruling: Day N verse range — NewBelieverLessonCard is passed verseSpec and rangedRef derived from reading.verses/ref', () => {
    const mount = HOME.slice(HOME.indexOf('<NewBelieverLessonCard'));
    const mountBlock = mount.slice(0, mount.indexOf('/>'));
    expect(mountBlock).toMatch(/verseSpec=\{[^}]*reading\?\.verses[^}]*\}/);
    expect(mountBlock).toMatch(/rangedRef=\{[^}]*reading\?\.ref[^}]*\}/);
  });

  it('ruling: the pastor hero caption follows the current selection, no bare fallback-only label left', () => {
    expect(HOME).toMatch(/fontSize: 27,[\s\S]*?allLabels\[heroChapterIndex\] \|\| allLabels\[0\]/);
    expect(HOME).not.toMatch(/\{allLabels\[0\]\}/);
  });

  it('ruling: Greek/Hebrew stays in the hero footer control row, out of the plan gate; the old literal copy is gone', () => {
    const controlRow = HOME.slice(HOME.indexOf("{tI18n('compare_label', lang)}"), HOME.indexOf('Expanded scripture text'));
    expect(controlRow).toMatch(/tI18n\('greek_hebrew_toggle', lang\)/);
    expect(HOME).not.toMatch(/Tap for Greek\/Hebrew/);
  });

  it('ruling: comfort gets no complete moment at all — setDoneCelebration and setPlanFinish are both gated on pf.celebrations, and the plan-finish mount passes showCount too', () => {
    const markRead = HOME.slice(HOME.indexOf('const handleMarkRead ='), HOME.indexOf('const handleMarkRead =') + 1200);
    expect(markRead).toMatch(/pf\.celebrations === 'full'\) setPlanFinish\(/);
    expect(markRead).toMatch(/pf\.celebrations === 'full'\) setDoneCelebration\(/);
    // The lesson-completion and hero-listen paths that also call markPlanDayComplete
    // gate their setPlanFinish the same way.
    const lessonPath = HOME.slice(HOME.indexOf('const savePathwayProgressFromLesson ='), HOME.indexOf('const savePathwayProgressFromLesson =') + 1000);
    expect(lessonPath).toMatch(/planResult\?\.planFinished && pf\.celebrations === 'full'/);
    expect(HOME).toMatch(/done\?\.planFinished && pf\.celebrations === 'full'/);
    // Both DoneCelebration mounts (the day-done one and the plan-finish one) pass showCount.
    const planFinishMount = HOME.slice(HOME.indexOf('<DoneCelebration streakCount={0} planFinish={planFinish}'));
    const mountBlock = planFinishMount.slice(0, planFinishMount.indexOf('/>') + 2);
    expect(mountBlock).toMatch(/showCount=\{pf\.celebrations === 'full'\}/);
  });

  it('ruling: F6 — the congregation todays_thought block only renders when the panel\'s current chapter (readRef) matches the devotion\'s chapter, via chapterOf from heroDedupe', () => {
    const thoughtGate = HOME.slice(HOME.indexOf("todaysDevotion &&"), HOME.indexOf("todaysDevotion &&") + 200);
    expect(thoughtGate).toMatch(/chapterOf\(readRef\) === chapterOf\(devotionPassage\)/);
    expect(HOME).toMatch(/import \{ chapterOf, notInHero \} from '\.\.\/utils\/heroDedupe'/);
  });

  it('ruling: ComfortSection no longer asks a daily-amount question or offers a translation/Listen control', () => {
    expect(COMFORT).not.toMatch(/comfort_set_daily_q/);
    expect(COMFORT).not.toMatch(/handleTranslationChange/);
    expect(COMFORT).not.toMatch(/handleListen/);
  });
});
