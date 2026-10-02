import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getCampuses, refreshCampuses, findCampus, campusName, campusRegions, CAMPUSES_CACHE_KEY, __resetCampusesForTests, type CampusRow } from './campuses';
import { FALLBACK_CAMPUSES } from './campuses.fallback';
import { defaultCongregation } from '../utils/congregation';

const MERIDA: CampusRow = {
  id: 've-futuros-merida', name: 'Futuros Mérida', city: 'Mérida, Venezuela', region: 'Venezuela',
  congregation: 'futuros-us', timeZone: 'America/Caracas', sundayUntil: '16:00', videoUrl: null, sortOrder: 215,
};

function respond(body: unknown, ok = true) {
  return vi.fn(async () => ({ ok, json: async () => body })) as unknown as typeof fetch;
}

beforeEach(() => { localStorage.clear(); __resetCampusesForTests(); });
afterEach(() => { vi.unstubAllGlobals(); });

describe('the reader-side campus list', () => {
  it('starts on the bundled 22, in order', () => {
    expect(getCampuses()).toHaveLength(22);
    expect(getCampuses()[0].id).toBe('au-paradise');
    expect(getCampuses()[21].id).toBe('other');
  });

  it('takes the fetched list, caches it, and keeps it for the next visit', async () => {
    vi.stubGlobal('fetch', respond({ campuses: [...FALLBACK_CAMPUSES, MERIDA] }));
    await refreshCampuses();
    expect(getCampuses().map((c) => c.id)).toContain('ve-futuros-merida');
    expect(campusRegions()).toContain('Venezuela');
    __resetCampusesForTests();
    expect(getCampuses().map((c) => c.id)).toContain('ve-futuros-merida');
    expect(localStorage.getItem(CAMPUSES_CACHE_KEY)).toContain('ve-futuros-merida');
  });

  it('keeps the bundled 22 when the fetch fails or the answer is the SPA page', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline'); }));
    await refreshCampuses();
    expect(getCampuses()).toHaveLength(22);
    __resetCampusesForTests();
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => { throw new SyntaxError('Unexpected token <'); } })));
    await refreshCampuses();
    expect(getCampuses()).toHaveLength(22);
  });

  it('ignores junk in the cache', () => {
    localStorage.setItem(CAMPUSES_CACHE_KEY, '{"not":"a list"}');
    expect(getCampuses()).toHaveLength(22);
  });

  it('a hidden campus is not offered but still names a reader who chose it', async () => {
    vi.stubGlobal('fetch', respond({ campuses: FALLBACK_CAMPUSES.filter((c) => c.id !== 'br-rio') }));
    await refreshCampuses();
    expect(getCampuses().map((c) => c.id)).not.toContain('br-rio');
    expect(campusName('br-rio')).toBe('Futures Rio');
    expect(findCampus('br-rio')?.timeZone).toBe('America/Sao_Paulo');
    expect(campusName('xx-unknown')).toBe('xx-unknown');
  });
});

describe('congregation from the campus row', () => {
  it('a campus the owner added reads the congregation set on its row', () => {
    expect(defaultCongregation({ campus: 've-futuros-merida', lang: 'en' }, [...FALLBACK_CAMPUSES, MERIDA])).toBe('futuros-us');
    expect(defaultCongregation({ campus: 've-futuros-merida', lang: 'en' }, FALLBACK_CAMPUSES)).toBe('futures-us');
    expect(defaultCongregation({ campus: 'us-futuros-grayson', lang: 'en' })).toBe('futuros-us');
    expect(defaultCongregation({ campus: 'id-bali', lang: 'en', timeZone: 'Australia/Adelaide' })).toBe('futures-au');
  });
});
