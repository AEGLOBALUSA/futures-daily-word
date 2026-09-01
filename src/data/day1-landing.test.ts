import { describe, it, expect } from 'vitest';
import { DAY1_TITLE, DAY1_VERSE_REF, DAY1_VERSE_TEXT, day1Copy } from './day1-landing';

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
});
