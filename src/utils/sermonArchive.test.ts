import { describe, it, expect } from 'vitest';
import { searchSermons, sermonPassages, type ArchivedSermon } from './sermonArchive';

function sermon(overrides: Partial<ArchivedSermon['sermon']>): ArchivedSermon['sermon'] {
  return {
    id: 's1',
    title: 'Untitled',
    ...overrides,
  };
}

const livingWater: ArchivedSermon = {
  id: 'a1',
  is_current: false,
  published_at: '2026-08-01T00:00:00.000Z',
  sermon: sermon({
    id: 'a1',
    title: 'Living Water',
    series: 'Grace Series',
    speaker: 'Ashley Evans',
    keyVerse: 'John 4:14',
    sections: [
      { num: '1', title: 'Introduction', content: [{ type: 'text', value: 'We looked at the well today.' }] },
    ],
  }),
};

const faithOverFear: ArchivedSermon = {
  id: 'a2',
  is_current: false,
  published_at: '2026-08-08T00:00:00.000Z',
  sermon: sermon({
    id: 'a2',
    title: 'Faith Over Fear',
    speaker: 'Ashley Evans',
    keyVerse: 'Romans 8:28',
    sections: [
      { num: '1', title: 'The Promise', content: [{ type: 'text', value: 'God works all things for good.' }] },
    ],
  }),
};

const goodShepherd: ArchivedSermon = {
  id: 'a3',
  is_current: true,
  published_at: '2026-08-15T00:00:00.000Z',
  sermon: sermon({
    id: 'a3',
    title: 'The Good Shepherd',
    keyVerse: 'Psalm 23:1',
    sections: [
      { num: '1', title: 'Trust', content: [{ type: 'text', value: 'Learn to trust in the Lord fully.' }] },
    ],
  }),
};

const FIXTURE = [livingWater, faithOverFear, goodShepherd];

describe('searchSermons', () => {
  it('returns the full list, newest-first order preserved, for an empty query', () => {
    expect(searchSermons(FIXTURE, '')).toEqual(FIXTURE);
    expect(searchSermons(FIXTURE, '   ')).toEqual(FIXTURE);
  });

  it('matches on title, case-insensitively', () => {
    const out = searchSermons(FIXTURE, 'living water');
    expect(out.map((s) => s.id)).toEqual(['a1']);
  });

  it('matches on section content text', () => {
    const out = searchSermons(FIXTURE, 'trust in the lord');
    expect(out.map((s) => s.id)).toEqual(['a3']);
  });

  it('matches a typed scripture reference against keyVerse / section text', () => {
    const out = searchSermons(FIXTURE, 'Romans 8');
    expect(out.map((s) => s.id)).toEqual(['a2']);
  });

  it('returns nothing for a query that matches no sermon', () => {
    expect(searchSermons(FIXTURE, 'zzz-no-such-word')).toEqual([]);
  });
});

describe('sermonPassages', () => {
  it('extracts references from keyVerse and section text, de-duplicated', () => {
    const refs = sermonPassages(faithOverFear.sermon);
    expect(refs).toContain('Romans 8:28');
  });

  it('returns an empty array when no reference-shaped text is present', () => {
    const bare = sermon({ id: 'bare', title: 'Bare', keyVerse: '', sections: [] });
    expect(sermonPassages(bare)).toEqual([]);
  });
});
