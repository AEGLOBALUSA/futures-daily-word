import { describe, it, expect, vi, afterEach } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { fetchPassage } from './api';

/**
 * Regression test for the KJV offline reader.
 *
 * Bug: bundled KJV chapter files are object-shaped ({ book, chapter, verses: string[] }),
 * but fetchKJV only handled the array shape and fell through to JSON.stringify(data) for
 * objects — so every offline KJV chapter rendered as raw JSON (e.g. John 3).
 */

function mockFetchReturning(body: unknown, ok = true) {
  return vi.fn(async () => ({ ok, json: async () => body }) as unknown as Response);
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('fetchKJV offline reader', () => {
  it('joins verse text from object-shaped chapter files (the John 3 bug)', async () => {
    const john3 = {
      book: 'John',
      chapter: 3,
      verses: [
        'There was a man of the Pharisees, named Nicodemus, a ruler of the Jews:',
        'The same came to Jesus by night, and said unto him, Rabbi...',
      ],
    };
    vi.stubGlobal('fetch', mockFetchReturning(john3));

    const text = await fetchPassage('John 3', 'KJV');

    expect(text).toBe(john3.verses.join(' '));
    expect(text).toContain('There was a man of the Pharisees');
    // Must never leak the JSON structure to the reader.
    expect(text).not.toContain('"book"');
    expect(text).not.toContain('"verses"');
  });

  it('still handles the legacy array-of-objects shape', async () => {
    const legacy = [{ text: 'In the beginning' }, { text: 'God created the heaven and the earth.' }];
    vi.stubGlobal('fetch', mockFetchReturning(legacy));

    // Distinct passage avoids the module-level verse cache from the previous test.
    const text = await fetchPassage('Genesis 1', 'KJV');

    expect(text).toBe('In the beginning God created the heaven and the earth.');
  });

  it('handles object shape whose verses are {text} objects', async () => {
    const objVerses = { book: 'Mark', chapter: 1, verses: [{ text: 'The beginning of the gospel' }] };
    vi.stubGlobal('fetch', mockFetchReturning(objVerses));

    const text = await fetchPassage('Mark 1', 'KJV');

    expect(text).toBe('The beginning of the gospel');
  });
});

describe('bundled KJV data contract', () => {
  it('John 3 on disk is object-shaped with a verses string[]', () => {
    const file = resolve('bible/kjv/john/3.json');
    if (!existsSync(file)) return; // bundled bible not present in this checkout — skip
    const data = JSON.parse(readFileSync(file, 'utf8'));
    expect(Array.isArray(data)).toBe(false);
    expect(Array.isArray(data.verses)).toBe(true);
    expect(typeof data.verses[0]).toBe('string');
  });
});
