import { describe, expect, it } from 'vitest';
import { formatProvenance, provenanceForSource } from './provenance';
import type { StudySource } from './study';

describe('formatProvenance', () => {
  it('joins name, edition and licence', () => {
    expect(formatProvenance({ name: 'Matthew Henry', edition: '1706 unabridged', licence: 'Public domain' }))
      .toBe('Matthew Henry, 1706 unabridged, Public domain');
  });

  it('joins name and licence when edition is null', () => {
    expect(formatProvenance({ name: 'John Gill', edition: null, licence: 'Public domain' }))
      .toBe('John Gill, Public domain');
  });

  it('prints the name alone when both edition and licence are missing', () => {
    expect(formatProvenance({ name: 'Adam Clarke' })).toBe('Adam Clarke');
  });

  it('treats a whitespace-only edition as missing', () => {
    expect(formatProvenance({ name: 'John Calvin', edition: '   ', licence: 'CC BY-SA 4.0' }))
      .toBe('John Calvin, CC BY-SA 4.0');
  });

  it('returns empty string when name is empty', () => {
    expect(formatProvenance({ name: '' })).toBe('');
    expect(formatProvenance({ name: '   ', licence: 'Public domain' })).toBe('');
  });

  it('appends the share-alike clause only when a licence was printed', () => {
    expect(formatProvenance({ name: 'TSK', licence: 'CC BY-SA 4.0', shareAlikeNote: 'share alike' }))
      .toBe('TSK, CC BY-SA 4.0, share alike');
    // no licence -> no share-alike clause, even if provided
    expect(formatProvenance({ name: 'TSK', shareAlikeNote: 'share alike' })).toBe('TSK');
  });

  it('never prints a licence that was not passed in', () => {
    const out = formatProvenance({ name: 'Keil & Delitzsch', edition: '1866' });
    expect(out).toBe('Keil & Delitzsch, 1866');
    expect(out).not.toMatch(/public domain/i);
    expect(out).not.toMatch(/cc /i);
  });
});

describe('provenanceForSource', () => {
  const source: StudySource = {
    id: 'helloao-matthew-henry',
    name: 'Matthew Henry',
    licence: 'Public domain',
    attribution: 'Matthew Henry, Complete Commentary',
    url: null,
    share_alike: false,
    language: 'en',
    loaded_at: '2026-01-01T00:00:00Z',
    record_count: 1000,
    edition: '1706 unabridged',
  };

  it('reads the facts from the map when the id is present', () => {
    const sources = new Map([[source.id, source]]);
    expect(provenanceForSource(source.id, sources)).toEqual({
      name: 'Matthew Henry',
      edition: '1706 unabridged',
      licence: 'Public domain',
      shareAlikeNote: null,
    });
  });

  it('carries the share-alike note only when the row is share-alike', () => {
    const shareAlikeSource: StudySource = { ...source, id: 'tsk', share_alike: true };
    const sources = new Map([[shareAlikeSource.id, shareAlikeSource]]);
    expect(provenanceForSource('tsk', sources, undefined, 'share alike')).toMatchObject({
      shareAlikeNote: 'share alike',
    });
  });

  it('falls back to fallbackName when the map is null and the id has no static fallback', () => {
    expect(provenanceForSource('some-unrecognised-source', null, 'A Source')).toEqual({ name: 'A Source' });
  });

  it('falls back to the source id when neither the map, a fallbackName nor a static fallback is available', () => {
    expect(provenanceForSource('some-unrecognised-source', null)).toEqual({ name: 'some-unrecognised-source' });
  });

  it('falls back to fallbackName when the map is loaded but lacks the id (and the id has no static fallback)', () => {
    const sources = new Map([[source.id, source]]);
    expect(provenanceForSource('unknown-id', sources, 'Fallback Name')).toEqual({ name: 'Fallback Name' });
  });

  it('a known id with a null sources map yields the static name and licence', () => {
    expect(provenanceForSource('helloao-gill', null)).toEqual({
      name: 'John Gill',
      licence: 'CC Public Domain Mark 1.0 (public domain)',
      shareAlikeNote: null,
    });
  });

  it('an unknown id yields the name alone', () => {
    expect(provenanceForSource('totally-unknown-id', null, 'Totally Unknown')).toEqual({ name: 'Totally Unknown' });
  });

  it('a share-alike static source yields the share-alike note', () => {
    expect(provenanceForSource('theographic-people', null, undefined, 'share alike')).toEqual({
      name: 'Theographic Bible Metadata',
      licence: 'CC BY-SA 4.0',
      shareAlikeNote: 'share alike',
    });
  });
});
