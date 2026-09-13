import { describe, it, expect } from 'vitest';
import { chapterOf, notInHero } from './heroDedupe';

describe('chapterOf', () => {
  it('strips a verse or verse-range suffix', () => {
    expect(chapterOf('John 3:16-21')).toBe('John 3');
  });

  it('leaves a chapter-only reference unchanged', () => {
    expect(chapterOf('1 Peter 1')).toBe('1 Peter 1');
  });
});

describe('notInHero', () => {
  const getRef = (item: { passage: string }) => item.passage;

  it('dedupes a verse-range passage against a hero holding the full chapter', () => {
    const items = [{ passage: 'John 3:16-21' }];
    const heroRefs = ['John 3'];
    expect(notInHero(items, getRef, heroRefs)).toEqual([]);
  });

  it('dedupes a chapter passage against the same chapter in the hero', () => {
    const items = [{ passage: '1 Peter 1' }];
    const heroRefs = ['1 Peter 1'];
    expect(notInHero(items, getRef, heroRefs)).toEqual([]);
  });

  it('keeps a passage whose chapter is not in any hero ref', () => {
    const items = [{ passage: 'Romans 8:1-4' }];
    const heroRefs = ['John 3'];
    expect(notInHero(items, getRef, heroRefs)).toEqual(items);
  });

  it('returns every item when heroRefs is empty', () => {
    const items = [{ passage: 'John 3:16-21' }, { passage: 'Romans 8:1' }];
    expect(notInHero(items, getRef, [])).toEqual(items);
  });

  it('returns an empty array when the item list is empty', () => {
    expect(notInHero([], getRef, ['John 3'])).toEqual([]);
  });
});
