/**
 * Source-contract guards for Wave B2 (build/wave-b2), locking six rulings
 * from docs/DESIGN-EXPERIENCE-2026-09-10.md move 7 the same way
 * home-wave-b.test.ts locks its contracts — via regex/indexOf greps against
 * the files as text, because HomeScreen is not unit-renderable.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const HOME = readFileSync(join(__dirname, '../screens/HomeScreen.tsx'), 'utf-8');
const COMMENTARY_CARD = readFileSync(join(__dirname, '../components/study/CommentaryCard.tsx'), 'utf-8');
const STUDY_SOURCES_SHEET = readFileSync(join(__dirname, '../components/study/StudySourcesSheet.tsx'), 'utf-8');
const API = readFileSync(join(__dirname, '../utils/api.ts'), 'utf-8');
const BIBLE_AI = readFileSync(join(__dirname, '../components/BibleAI.tsx'), 'utf-8');

describe('Home wave-b2 contracts', () => {
  it('ruling: HomeScreen mounts CommentaryCard, CrossRefsCard and StudySourcesSheet', () => {
    expect(HOME).toMatch(/<CommentaryCard\b/);
    expect(HOME).toMatch(/<CrossRefsCard\b/);
    expect(HOME).toMatch(/<StudySourcesSheet\b/);
  });

  it('ruling: StudySourcesSheet is mounted with a live open= prop, outside any conditional render', () => {
    const mountIdx = HOME.indexOf('<StudySourcesSheet');
    expect(mountIdx).toBeGreaterThan(-1);
    const mount = HOME.slice(mountIdx, HOME.indexOf('/>', mountIdx) + 2);
    expect(mount).toMatch(/open=\{showStudySources\}/);
    // Not gated behind a `{cond && (` immediately preceding the mount — the
    // sheet owns its own open/close via the prop, not a conditional render.
    const before = HOME.slice(Math.max(0, mountIdx - 120), mountIdx);
    expect(before).not.toMatch(/&&\s*\(\s*$/);
  });

  it('ruling: the AI paragraph no longer enters allCommentaries as a peer tab', () => {
    expect(HOME).not.toMatch(/AI Insight/);
    expect(HOME).not.toMatch(/allCommentaries/);
    expect(HOME).not.toMatch(/selectedCommentaryIdx/);
    expect(HOME).not.toMatch(/import\s*\{[^}]*\bCOMMENTARY\b[^}]*\}/);
  });

  it('ruling: in CommentaryCard, the AI block sits below the tab strip and the tab-strip map excludes the AI entry', () => {
    const tabsIdx = COMMENTARY_CARD.indexOf('data-testid="commentary-tabs"');
    const aiBlockIdx = COMMENTARY_CARD.indexOf('data-testid="commentary-ai-block"');
    expect(tabsIdx).toBeGreaterThan(-1);
    expect(aiBlockIdx).toBeGreaterThan(-1);
    expect(aiBlockIdx).toBeGreaterThan(tabsIdx);
    // The tab-strip map (between the tabs container and the AI block) does
    // not reference the AI entry.
    const stripBlock = COMMENTARY_CARD.slice(tabsIdx, aiBlockIdx);
    expect(stripBlock).not.toMatch(/AI Insight/);
  });

  it('ruling: the AI commentary prompt stops asking for a cross-reference', () => {
    const promptIdx = API.indexOf('export async function fetchAICommentarySourced');
    expect(promptIdx).toBeGreaterThan(-1);
    const promptBlock = API.slice(promptIdx, API.indexOf('export async function fetchAICommentary(', promptIdx));
    expect(promptBlock).not.toMatch(/cross-reference/i);
    expect(promptBlock).toMatch(/Do not cite chapter-and-verse references from memory\./);
  });

  it('ruling: StudySourcesSheet uses useSubView alone, never a focus trap', () => {
    expect(STUDY_SOURCES_SHEET).toMatch(/import\s*\{[^}]*\buseSubView\b[^}]*\}/);
    expect(STUDY_SOURCES_SHEET).not.toMatch(/useModalA11y/);
  });

  it('ruling: pastor mode in BibleAI carries the study-assistant framing line, not a ghostwriter prompt', () => {
    expect(BIBLE_AI).toMatch(/t\('ai_pastor_framing'/);
    expect(BIBLE_AI).not.toMatch(/cross-references I should look at/);
  });
});
