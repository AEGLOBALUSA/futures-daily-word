import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  emptyOutline, loadOutline, saveOutline, outlineToNotes, seedFromPrep, applyFramework,
  capOutline, MAX_POINT_BODY, MAX_DOC_SIZE, OUTLINE_EVENT,
} from './preachOutline';
import type { PreachOutline } from './preachOutline';

const KEY = 'dw_preach_outline';

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.useRealTimers();
});

function outlineWith(overrides: Partial<PreachOutline>): PreachOutline {
  return { ...emptyOutline(), ...overrides };
}

describe('outlineToNotes', () => {
  it('renders bigIdea, then each non-empty point as "Heading\\nbody", then weeklyAction, blank-line separated', () => {
    const o = outlineWith({
      bigIdea: 'God keeps His promises.',
      points: [
        { heading: 'The promise', body: 'Genesis 15 — He counted it to him as righteousness.' },
        { heading: '', body: '' }, // empty point — skipped entirely
        { heading: 'The fulfillment', body: 'Galatians 3 — sons of Abraham by faith.' },
      ],
      weeklyAction: 'Write down one promise God has kept in your life.',
    });
    expect(outlineToNotes(o)).toBe(
      'God keeps His promises.\n\n' +
      'The promise\nGenesis 15 — He counted it to him as righteousness.\n\n' +
      'The fulfillment\nGalatians 3 — sons of Abraham by faith.\n\n' +
      'Write down one promise God has kept in your life.'
    );
  });

  it('publishes a heading-less point as its body alone — never an invented English "Point N"', () => {
    const o = outlineWith({ bigIdea: '', points: [{ heading: '', body: 'Just a body.' }], weeklyAction: '' });
    expect(outlineToNotes(o)).toBe('Just a body.');
    const two = outlineWith({ bigIdea: 'Idea', points: [{ heading: '', body: 'Solo cuerpo.' }, { heading: 'Segundo', body: 'Texto.' }], weeklyAction: '' });
    expect(outlineToNotes(two)).toBe('Idea\n\nSolo cuerpo.\n\nSegundo\nTexto.');
    expect(outlineToNotes(two)).not.toMatch(/Point \d/);
  });

  it('produces an empty string for a fully empty outline', () => {
    const o = outlineWith({ bigIdea: '', points: [{ heading: '', body: '' }], weeklyAction: '' });
    expect(outlineToNotes(o)).toBe('');
  });
});

describe('seedFromPrep', () => {
  it('fills up to 3 empty point bodies with "ref — text" from the newest items, never overwriting a filled body', () => {
    const o = outlineWith({
      points: [
        { heading: '', body: 'already written — leave me alone' },
        { heading: 'Point 2', body: '' },
        { heading: '', body: '' },
        { heading: '', body: '' },
        { heading: '', body: '' }, // a 5th empty point — the 3-item cap is reached before this one
      ],
    });
    const items = [
      { ref: 'John 3:16', text: 'For God so loved the world.' },
      { ref: 'Romans 8:28', text: 'All things work together for good.' },
      { ref: 'Philippians 4:13', text: 'I can do all things.' },
      { ref: 'Psalm 23:1', text: 'The Lord is my shepherd.' },
    ];
    const seeded = seedFromPrep(o, items);
    expect(seeded.points[0].body).toBe('already written — leave me alone'); // untouched
    expect(seeded.points[1].body).toBe('John 3:16 — For God so loved the world.');
    expect(seeded.points[1].heading).toBe('Point 2'); // heading untouched
    expect(seeded.points[2].body).toBe('Romans 8:28 — All things work together for good.');
    expect(seeded.points[3].body).toBe('Philippians 4:13 — I can do all things.'); // 3rd empty slot filled
    expect(seeded.points[4].body).toBe(''); // 3-item cap reached, never filled
  });

  it('is a no-op when the prep bag is empty', () => {
    const o = outlineWith({ points: [{ heading: '', body: '' }] });
    expect(seedFromPrep(o, [])).toEqual(o);
  });
});

describe('applyFramework', () => {
  it('grows points to the step count and fills only empty headings, leaving typed ones alone', () => {
    const o = outlineWith({
      points: [
        { heading: 'My own heading', body: 'kept' },
        { heading: '', body: '' },
      ],
    });
    const applied = applyFramework(o, '4d');
    expect(applied.framework).toBe('4d');
    expect(applied.points).toHaveLength(4); // grew from 2 to the 4D Protocol's 4 steps
    expect(applied.points[0]).toEqual({ heading: 'My own heading', body: 'kept' }); // untouched
    expect(applied.points[1].heading).toBe('Develop');
    expect(applied.points[2].heading).toBe('Deploy');
    expect(applied.points[3].heading).toBe('Depart');
  });

  it('never grows points past 5 even for a framework with more steps', () => {
    const o = outlineWith({ points: [{ heading: '', body: '' }] });
    const applied = applyFramework(o, 'heat'); // H.E.A.T. has 4 steps, well under 5
    expect(applied.points.length).toBeLessThanOrEqual(5);
  });

  it('clears the framework on a falsy/unrecognised id ("None" chip) without touching points', () => {
    const o = outlineWith({ framework: '4d', points: [{ heading: 'Discover', body: '' }] });
    const cleared = applyFramework(o, '');
    expect(cleared.framework).toBeUndefined();
    expect(cleared.points).toEqual(o.points);
  });
});

describe('loadOutline', () => {
  it('returns emptyOutline() (speaker + today prefilled) when nothing is stored', () => {
    localStorage.setItem('dw_profile', JSON.stringify({ firstName: 'Ashley', lastName: 'Evans' }));
    const loaded = loadOutline();
    expect(loaded.speaker).toBe('Ashley Evans');
    expect(loaded.date).toBe(new Date().toLocaleDateString('en-CA'));
    expect(loaded.points.length).toBeGreaterThan(0);
  });

  it('tolerates corrupt JSON and falls back to emptyOutline()', () => {
    localStorage.setItem(KEY, '{not valid json');
    const loaded = loadOutline();
    expect(loaded).toEqual(emptyOutline());
  });

  it('tolerates a stored value that is valid JSON but not an object', () => {
    localStorage.setItem(KEY, '"just a string"');
    expect(loadOutline()).toEqual(emptyOutline());
  });

  it('round-trips a well-formed saved outline', () => {
    const o = outlineWith({ title: 'Grace Wins', passage: 'Romans 5', speaker: 'Ashley Evans' });
    localStorage.setItem(KEY, JSON.stringify(o));
    const loaded = loadOutline();
    expect(loaded.title).toBe('Grace Wins');
    expect(loaded.passage).toBe('Romans 5');
  });
});

describe('size cap', () => {
  it('capOutline truncates a point body over MAX_POINT_BODY', () => {
    const huge = 'x'.repeat(MAX_POINT_BODY + 500);
    const o = outlineWith({ points: [{ heading: 'Big', body: huge }] });
    const { outline, truncated } = capOutline(o);
    expect(truncated).toBe(true);
    expect(outline.points[0].body.length).toBe(MAX_POINT_BODY);
  });

  it('capOutline shrinks the document below MAX_DOC_SIZE even with several large points', () => {
    const bigBody = 'y'.repeat(MAX_POINT_BODY);
    const o = outlineWith({
      title: 'A very long sermon title '.repeat(10),
      points: [
        { heading: 'One', body: bigBody },
        { heading: 'Two', body: bigBody },
        { heading: 'Three', body: bigBody },
        { heading: 'Four', body: bigBody },
        { heading: 'Five', body: bigBody },
      ],
    });
    const { outline, truncated } = capOutline(o);
    expect(truncated).toBe(true);
    expect(JSON.stringify(outline).length).toBeLessThanOrEqual(MAX_DOC_SIZE);
  });

  it('saveOutline never throws on an oversized outline and persists something under the cap', () => {
    const bigBody = 'z'.repeat(MAX_POINT_BODY + 1000);
    const o = outlineWith({ points: [{ heading: 'One', body: bigBody }] });
    expect(() => saveOutline(o)).not.toThrow();
    const stored = localStorage.getItem(KEY);
    expect(stored).toBeTruthy();
    expect((stored as string).length).toBeLessThanOrEqual(MAX_DOC_SIZE + 200); // small slack for JSON scaffolding
  });
});

describe('saveOutline', () => {
  it('writes to localStorage under the misc-synced key and dispatches OUTLINE_EVENT', () => {
    const handler = vi.fn();
    window.addEventListener(OUTLINE_EVENT, handler);
    const o = outlineWith({ title: 'Test Sermon' });
    saveOutline(o);
    expect(handler).toHaveBeenCalledTimes(1);
    const stored = JSON.parse(localStorage.getItem(KEY) || '{}');
    expect(stored.title).toBe('Test Sermon');
    window.removeEventListener(OUTLINE_EVENT, handler);
  });
});
