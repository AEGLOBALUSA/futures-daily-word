import { describe, it, expect } from 'vitest';
import { parseVerseRange, sliceVerseRange, rangeRef } from './verseRange';

describe('parseVerseRange', () => {
  it('parses a simple range', () => {
    expect(parseVerseRange('8-9')).toEqual([{ start: 8, end: 9 }]);
  });

  it('parses a single verse', () => {
    expect(parseVerseRange('30')).toEqual([{ start: 30, end: 30 }]);
  });

  it('parses a mixed list', () => {
    expect(parseVerseRange('1-3,6')).toEqual([
      { start: 1, end: 3 },
      { start: 6, end: 6 },
    ]);
  });

  it('tolerates surrounding whitespace', () => {
    expect(parseVerseRange(' 8 - 9 ')).toEqual([{ start: 8, end: 9 }]);
  });

  it('returns [] for undefined/empty/garbage', () => {
    expect(parseVerseRange(undefined)).toEqual([]);
    expect(parseVerseRange('')).toEqual([]);
    expect(parseVerseRange('not a range')).toEqual([]);
  });
});

const CHAPTER = '[1] In the beginning. [2] The earth was formless. [3] And God said. ' +
  '[4] Let there be light. [5] Fifth verse. [6] Sixth verse. [7] Seventh verse. ' +
  '[8] For by grace you have been saved. [9] Not a result of works. [10] Tenth verse.';

describe('sliceVerseRange', () => {
  it("'8-9' keeps exactly verses 8 and 9 with markers", () => {
    expect(sliceVerseRange(CHAPTER, '8-9')).toBe(
      '[8] For by grace you have been saved. [9] Not a result of works.'
    );
  });

  it("'30' (single verse) keeps one verse", () => {
    expect(sliceVerseRange(CHAPTER, '3')).toBe('[3] And God said.');
  });

  it("'1-3,6' keeps four verses", () => {
    expect(sliceVerseRange(CHAPTER, '1-3,6')).toBe(
      '[1] In the beginning. [2] The earth was formless. [3] And God said. [6] Sixth verse.'
    );
  });

  it('empty/undefined spec returns the whole chapter text byte-identical (no range was asked for)', () => {
    expect(sliceVerseRange(CHAPTER, undefined)).toBe(CHAPTER);
    expect(sliceVerseRange(CHAPTER, '')).toBe(CHAPTER);
  });

  it('a spec naming absent verses returns null (range could not be applied)', () => {
    expect(sliceVerseRange(CHAPTER, '50-60')).toBeNull();
  });

  it('plain text with no [N] markers returns null (range could not be applied)', () => {
    const plain = 'Just a plain block of text with no verse markers at all.';
    expect(sliceVerseRange(plain, '8-9')).toBeNull();
  });
});

describe('rangeRef', () => {
  it('builds a reference with verses', () => {
    expect(rangeRef('Ephesians', 2, '8-9')).toBe('Ephesians 2:8-9');
  });

  it('builds a chapter-only reference when verses are absent', () => {
    expect(rangeRef('Ephesians', 2)).toBe('Ephesians 2');
    expect(rangeRef('Ephesians', 2, '')).toBe('Ephesians 2');
  });
});
