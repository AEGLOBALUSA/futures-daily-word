/**
 * The one scripture-reference canon shared by netlify/functions/study.js and
 * the study loaders (scripts/study/common.mjs re-exports it).
 */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
import { BIBLE_BOOKS, BOOK_CHAPTERS } from '../data/bible-books';

const require = createRequire(import.meta.url);
const ref = require('../../netlify/functions/lib/study-ref.js');

describe('study-ref canon', () => {
  it('matches src/data/bible-books.ts exactly (names, order, chapter counts)', () => {
    expect(ref.BOOKS).toEqual(BIBLE_BOOKS);
    for (const b of BIBLE_BOOKS) expect(ref.chapterCount(b), b).toBe(BOOK_CHAPTERS[b]);
  });

  it('resolves USFM, OSIS, STEPBible-style and loose names to the canonical book', () => {
    expect(ref.canonicalBook('GEN')).toBe('Genesis');
    expect(ref.canonicalBook('Gen')).toBe('Genesis');
    expect(ref.canonicalBook('1Sam')).toBe('1 Samuel');
    expect(ref.canonicalBook('1SA')).toBe('1 Samuel');
    expect(ref.canonicalBook('SNG')).toBe('Song of Solomon');
    expect(ref.canonicalBook('Song of Songs')).toBe('Song of Solomon');
    expect(ref.canonicalBook('Psalm')).toBe('Psalms');
    expect(ref.canonicalBook('Ps')).toBe('Psalms');
    expect(ref.canonicalBook('Jhn')).toBe('John');
    expect(ref.canonicalBook('1Jn')).toBe('1 John');
    expect(ref.canonicalBook('Phlm')).toBe('Philemon');
    expect(ref.canonicalBook('PHP')).toBe('Philippians');
    expect(ref.canonicalBook('Rev')).toBe('Revelation');
    expect(ref.canonicalBook('Nope')).toBeNull();
    expect(ref.canonicalBook('')).toBeNull();
  });

  it('parses the reference shapes the app and the sources use', () => {
    expect(ref.parseRef('Romans 8')).toEqual({ book: 'Romans', chapter: 8, verse: 0, verseEnd: null });
    expect(ref.parseRef('Romans 8:28')).toEqual({ book: 'Romans', chapter: 8, verse: 28, verseEnd: null });
    expect(ref.parseRef('Romans 8:1-4')).toEqual({ book: 'Romans', chapter: 8, verse: 1, verseEnd: 4 });
    expect(ref.parseRef('Gen.1.1')).toEqual({ book: 'Genesis', chapter: 1, verse: 1, verseEnd: null });
    expect(ref.parseRef('1Sam.2.4-6')).toEqual({ book: '1 Samuel', chapter: 2, verse: 4, verseEnd: 6 });
    expect(ref.parseRef('ROM 8:28')).toEqual({ book: 'Romans', chapter: 8, verse: 28, verseEnd: null });
    expect(ref.parseRef('Psalm 23')).toEqual({ book: 'Psalms', chapter: 23, verse: 0, verseEnd: null });
    expect(ref.parseRef('2 Corinthians 4:7-12')).toEqual({ book: '2 Corinthians', chapter: 4, verse: 7, verseEnd: 12 });
    expect(ref.parseRef('Song of Solomon 2:1')).toEqual({ book: 'Song of Solomon', chapter: 2, verse: 1, verseEnd: null });
  });

  it('rejects nonsense and out-of-range chapters, cuts cross-chapter ranges at the first chapter', () => {
    expect(ref.parseRef('Romans 17')).toBeNull();
    expect(ref.parseRef('Romans')).toBeNull();
    expect(ref.parseRef('8:28')).toBeNull();
    expect(ref.parseRef('')).toBeNull();
    expect(ref.parseRef('Romans 8:38-9:1')).toEqual({ book: 'Romans', chapter: 8, verse: 38, verseEnd: null });
    expect(ref.parseRef('Romans 8:10-4')).toEqual({ book: 'Romans', chapter: 8, verse: 10, verseEnd: null });
  });

  it('reads single-chapter books by verse ("Jude 3", "Obadiah 1-4") and cuts chapter ranges', () => {
    expect(ref.parseRef('Jude 3')).toEqual({ book: 'Jude', chapter: 1, verse: 3, verseEnd: null });
    expect(ref.parseRef('Jude 3-5')).toEqual({ book: 'Jude', chapter: 1, verse: 3, verseEnd: 5 });
    expect(ref.parseRef('Obadiah 1-4')).toEqual({ book: 'Obadiah', chapter: 1, verse: 1, verseEnd: 4 });
    expect(ref.parseRef('Philemon 6')).toEqual({ book: 'Philemon', chapter: 1, verse: 6, verseEnd: null });
    expect(ref.parseRef('2 John 1:5')).toEqual({ book: '2 John', chapter: 1, verse: 5, verseEnd: null });
    expect(ref.parseRef('Romans 8-9')).toEqual({ book: 'Romans', chapter: 8, verse: 0, verseEnd: null });
  });

  it('formats back to the app shape', () => {
    expect(ref.formatRef(ref.parseRef('rom 8'))).toBe('Romans 8');
    expect(ref.formatRef(ref.parseRef('Gen.1.1'))).toBe('Genesis 1:1');
    expect(ref.formatRef(ref.parseRef('Romans 8:1-4'))).toBe('Romans 8:1-4');
    expect(ref.formatRef({ book: 'John', chapter: 3, verse: 16, verseEnd: 16 })).toBe('John 3:16');
  });

  it('knows the testaments', () => {
    expect(ref.isOldTestament('Malachi')).toBe(true);
    expect(ref.isOldTestament('Matthew')).toBe(false);
    expect(ref.isOldTestament('Nope')).toBe(false);
  });
});
