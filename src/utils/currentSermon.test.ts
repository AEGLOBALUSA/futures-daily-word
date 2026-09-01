import { describe, it, expect, vi, afterEach } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { fetchCurrentSermon, openSermonNotesId } from './currentSermon';

const ROOT = join(__dirname, '../..');
const LATEST = join(ROOT, 'public/sermons/latest.json');
const ARCHIVE = join(ROOT, 'public/sermons/archive/tying-up-loose-ends-2026-04-05.json');

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('sermon archive vs current feed', () => {
  it('keeps Tying Up Loose Ends in the archive, not as latest.json', () => {
    expect(existsSync(ARCHIVE)).toBe(true);
    const archived = JSON.parse(readFileSync(ARCHIVE, 'utf-8'));
    expect(archived.id).toBe('tying-up-loose-ends-2026-04-05');
    expect(String(archived.title).toUpperCase()).toContain('TYING UP LOOSE ENDS');
    expect(existsSync(LATEST)).toBe(false);
  });
});

describe('fetchCurrentSermon', () => {
  it('returns null on 404 so callers do not invent a sermon', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 }));
    await expect(fetchCurrentSermon()).resolves.toBeNull();
  });

  it('returns null when the body has no id', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ title: 'Untitled' }),
    }));
    await expect(fetchCurrentSermon()).resolves.toBeNull();
  });

  it('prefers the approved intake sermon over a static file', async () => {
    const sermon = { id: 'hope-2026-09-06', title: 'Hope' };
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes('published-sermon')) {
        return { ok: true, json: async () => ({ sermon }) };
      }
      return { ok: true, json: async () => ({ id: 'stale', title: 'Stale' }) };
    });
    vi.stubGlobal('fetch', fetchMock);
    await expect(fetchCurrentSermon()).resolves.toEqual(sermon);
  });

  it('returns the sermon when latest.json is a real message', async () => {
    const sermon = { id: 'next-sunday', title: 'Hope' };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => sermon,
    }));
    await expect(fetchCurrentSermon()).resolves.toEqual(sermon);
  });
});

describe('openSermonNotesId', () => {
  it('uses the published sermon id when present', () => {
    expect(openSermonNotesId('hope-2026-09-06')).toBe('hope-2026-09-06');
  });

  it('falls back to a per-day open note when nothing is published', () => {
    const id = openSermonNotesId(null);
    expect(id).toMatch(/^open_\d{4}-\d{2}-\d{2}$/);
  });
});
