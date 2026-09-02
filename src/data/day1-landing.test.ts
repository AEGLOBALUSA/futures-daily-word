import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DAY1_QUESTIONS, DAY1_TITLE, DAY1_VERSE_REF, DAY1_VERSE_TEXT, day1Copy } from './day1-landing';

describe('Day 1 landing copy (existing series, not Superdesign placeholders)', () => {
  it('uses the real Day 1 title, not Welcome Home', () => {
    expect(DAY1_TITLE.en).toBe('Grace Changes Everything');
    expect(day1Copy('en').title).not.toMatch(/Welcome Home/i);
  });

  it('uses Ephesians 2:8-9 from the series, not Luke 15:20', () => {
    expect(DAY1_VERSE_REF).toBe('Ephesians 2:8-9');
    expect(DAY1_VERSE_TEXT.toLowerCase()).toContain('by grace');
    expect(DAY1_VERSE_TEXT).not.toMatch(/long way off/i);
    expect(day1Copy('en').verseRef).not.toBe('Luke 15:20');
  });

  it('pastoral word is the opening of the real Day 1 lesson', () => {
    expect(day1Copy('en').pastoral).toMatch(/LIVE saved/i);
    expect(day1Copy('en').pastoral).not.toMatch(/no distance too great/i);
  });

  it('reading surface uses three beats from the real Day 1 lesson', () => {
    const blocks = day1Copy('en').readingPastoral.split('\n\n');
    expect(blocks).toHaveLength(3);
    expect(blocks[0]).toMatch(/LIVE saved/i);
    expect(blocks[2]).toMatch(/gift you don.t deserve/i);
    expect(day1Copy('en').readingPastoral).not.toMatch(/Take a deep breath/i);
    expect(day1Copy('en').readingPastoral).not.toMatch(/no distance too great/i);
  });

  it("questions are Day 1's real Reflect & Respond questions, in all four languages", () => {
    const json = JSON.parse(readFileSync(join(__dirname, '..', '..', 'books', 'faith-pathway.json'), 'utf-8'));
    const day1 = json.days.find((d: { day: number }) => d.day === 1);
    expect(day1.questions).toHaveLength(2);
    expect([...DAY1_QUESTIONS.en]).toEqual(day1.questions);
    expect([...day1Copy('es').questions]).toEqual(day1.questionsEs);
    expect([...day1Copy('pt').questions]).toEqual(day1.questionsPt);
    expect([...day1Copy('id').questions]).toEqual(day1.questionsId);
    expect([...day1Copy('fr').questions]).toEqual(day1.questions);
  });
});
