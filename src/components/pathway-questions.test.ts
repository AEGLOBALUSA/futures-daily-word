import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { localizedQuestions } from '../utils/pathwayQuestions';

const card = readFileSync(resolve(__dirname, 'NewBelieverLessonCard.tsx'), 'utf8');
const landing = readFileSync(resolve(__dirname, 'Day1Landing.tsx'), 'utf8');

describe('Reflect & Respond is part of the lesson (Ashley, 2 Sep 2026)', () => {
  it('Day N surface renders the questions directly under the lesson text, before Mark Complete', () => {
    const lesson = card.indexOf('{dayLesson && (');
    const questions = card.indexOf('<PathwayQuestions');
    const complete = card.indexOf("t('mark_complete')");
    expect(lesson).toBeGreaterThan(-1);
    expect(questions).toBeGreaterThan(lesson);
    expect(complete).toBeGreaterThan(questions);
    // the old end-of-page block is gone
    expect(card).not.toMatch(/dayData\.questions\.map/);
  });

  it('Day 1 landing shows Day 1 questions under the pastoral text, keyed to the same store', () => {
    const pastoral = landing.indexOf('dw-day1-pastoral-stack');
    const questions = landing.indexOf('<PathwayQuestions day={1}');
    const mark = landing.indexOf('handleMarkRead}');
    expect(questions).toBeGreaterThan(pastoral);
    expect(mark).toBeGreaterThan(questions);
  });

  it('localizedQuestions falls back to English when a translation is missing', () => {
    const day = { questions: ['a', 'b'], questionsEs: ['c', 'd'] };
    expect(localizedQuestions(day, 'es')).toEqual(['c', 'd']);
    expect(localizedQuestions(day, 'pt')).toEqual(['a', 'b']);
    expect(localizedQuestions(day, 'en')).toEqual(['a', 'b']);
    expect(localizedQuestions({}, 'id')).toEqual([]);
  });
});
