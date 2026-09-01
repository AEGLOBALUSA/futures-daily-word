import { describe, it, expect, vi, afterEach } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { fetchCurrentSermon, openSermonNotesId } from './currentSermon';

const ROOT = join(__dirname, '../..');
const LATEST = join(ROOT, 'public/sermons/latest.json');
const SAMPLE = join(ROOT, 'public/sermons/sample.json');
const ARCHIVE = join(ROOT, 'public/sermons/archive/tying-up-loose-ends-2026-04-05.json');

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('sermon archive vs current feed', () => {
  it('keeps Tying Up Loose Ends in the archive', () => {
    expect(existsSync(ARCHIVE)).toBe(true);
    const archived = JSON.parse(readFileSync(ARCHIVE, 'utf-8'));
    expect(archived.id).toBe('tying-up-loose-ends-2026-04-05');
    expect(String(archived.title).toUpperCase()).toContain('TYING UP LOOSE ENDS');
  });

  it('keeps latest.json empty so production cannot serve the SAMPLE sermon', () => {
    expect(existsSync(LATEST)).toBe(true);
    const latest = JSON.parse(readFileSync(LATEST, 'utf-8'));
    expect(latest).toEqual({});
    expect(latest.id).toBeUndefined();
    expect(JSON.stringify(latest)).not.toContain('Love Asks Again');
    expect(JSON.stringify(latest)).not.toContain('sample-love-asks-again');
  });

  it('ships a SAMPLE sample.json for deploy-preview congregation notes only', () => {
    expect(existsSync(SAMPLE)).toBe(true);
    const sample = JSON.parse(readFileSync(SAMPLE, 'utf-8'));
    expect(sample.id).toBe('sample-love-asks-again-2026-08-31');
    expect(sample.series).toBe('SAMPLE');
    expect(sample.title).toBe('Love Asks Again');
    expect(sample.youtubeUrl).toBe('');
    expect(sample.sections.length).toBeLessThanOrEqual(4);
    expect(sample.sections.every((s: { content: { type: string }[] }) => s.content.some(c => c.type === 'blank'))).toBe(true);
    expect(sample.responsePrompts.length).toBeGreaterThanOrEqual(1);
  });
});

describe('fetchCurrentSermon', () => {
  it('returns null on 404 so callers do not invent a sermon', async () => {
    vi.stubGlobal('location', { hostname: 'futuresdailyword.com' });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 }));
    await expect(fetchCurrentSermon()).resolves.toBeNull();
  });

  it('returns null when the body has no id', async () => {
    vi.stubGlobal('location', { hostname: 'futuresdailyword.com' });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ title: 'Untitled' }),
    }));
    await expect(fetchCurrentSermon()).resolves.toBeNull();
  });

  it('on deploy-preview prefers sample.json so sample notes never need the shared DB', async () => {
    const sample = { id: 'sample-love-asks-again-2026-08-31', title: 'Love Asks Again' };
    vi.stubGlobal('location', { hostname: 'deploy-preview-69--futures-daily-word.netlify.app' });
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes('sample.json')) {
        return { ok: true, json: async () => sample };
      }
      return { ok: true, json: async () => ({ sermon: { id: 'live-from-db', title: 'Live' } }) };
    });
    vi.stubGlobal('fetch', fetchMock);
    await expect(fetchCurrentSermon()).resolves.toEqual(sample);
    expect(fetchMock.mock.calls.some((c: unknown[]) => String(c[0]).includes('published-sermon'))).toBe(false);
    expect(fetchMock.mock.calls.some((c: unknown[]) => String(c[0]).includes('latest.json'))).toBe(false);
  });

  it('on production uses the approved intake sermon and never reads latest.json', async () => {
    const sermon = { id: 'hope-2026-09-06', title: 'Hope' };
    vi.stubGlobal('location', { hostname: 'futuresdailyword.com' });
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes('published-sermon')) {
        return { ok: true, json: async () => ({ sermon }) };
      }
      return { ok: true, json: async () => ({ id: 'sample-love-asks-again-2026-08-31', title: 'Love Asks Again' }) };
    });
    vi.stubGlobal('fetch', fetchMock);
    await expect(fetchCurrentSermon()).resolves.toEqual(sermon);
    expect(fetchMock.mock.calls.every((c: unknown[]) => String(c[0]).includes('published-sermon'))).toBe(true);
    expect(fetchMock.mock.calls.some((c: unknown[]) => String(c[0]).includes('latest.json'))).toBe(false);
    expect(fetchMock.mock.calls.some((c: unknown[]) => String(c[0]).includes('sample.json'))).toBe(false);
  });

  it('on production returns null when published-sermon is empty and never falls back to a static file', async () => {
    vi.stubGlobal('location', { hostname: 'www.futuresdailyword.com' });
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes('published-sermon')) {
        return { ok: true, json: async () => ({ sermon: null }) };
      }
      return { ok: true, json: async () => ({ id: 'sample-love-asks-again-2026-08-31', title: 'Love Asks Again' }) };
    });
    vi.stubGlobal('fetch', fetchMock);
    await expect(fetchCurrentSermon()).resolves.toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain('published-sermon');
    expect(fetchMock.mock.calls.some((c: unknown[]) => String(c[0]).includes('latest.json'))).toBe(false);
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
