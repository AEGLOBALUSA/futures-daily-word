import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { createRequire } from 'module';
import { detectPlace, __resetPlaceForTests } from './geo';

const require = createRequire(import.meta.url);
const { placeFromRequest } = require('../../netlify/functions/lib/geo-country.js');
const geoFn = require('../../netlify/functions/geo.js');

const b64 = (v: unknown) => Buffer.from(JSON.stringify(v)).toString('base64');

describe('placeFromRequest (server)', () => {
  it('reads town and state code from x-nf-geo', () => {
    const header = b64({ city: 'Kennesaw', country: { code: 'US' }, subdivision: { code: 'GA', name: 'Georgia' }, latitude: 34, longitude: -84, postal_code: '30144' });
    expect(placeFromRequest({ headers: { 'x-nf-geo': header } }, {})).toEqual({ city: 'Kennesaw', subdivision: 'GA' });
  });

  it('falls back to context.geo', () => {
    expect(placeFromRequest({ headers: {} }, { geo: { city: 'Adelaide', subdivision: { code: 'SA' } } })).toEqual({ city: 'Adelaide', subdivision: 'SA' });
  });

  it('gives nulls when absent or garbled', () => {
    expect(placeFromRequest({ headers: { 'x-nf-geo': '!!!' } }, {})).toEqual({ city: null, subdivision: null });
    expect(placeFromRequest({ headers: {} }, {})).toEqual({ city: null, subdivision: null });
  });
});

describe('GET /api/geo', () => {
  let logs: ReturnType<typeof vi.spyOn>[] = [];
  beforeEach(() => {
    logs = [vi.spyOn(console, 'log'), vi.spyOn(console, 'info'), vi.spyOn(console, 'warn'), vi.spyOn(console, 'error')];
  });
  afterEach(() => { logs.forEach((s) => s.mockRestore()); });

  it('returns country, town and state only (never latitude, longitude or postcode), and logs nothing', async () => {
    const header = b64({ city: 'Kennesaw', subdivision: { code: 'GA' }, latitude: 34, longitude: -84, postal_code: '30144' });
    const res = await geoFn.handler({ httpMethod: 'GET', headers: { 'x-nf-country': 'US', 'x-nf-geo': header } }, {});
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual({ country: 'US', city: 'Kennesaw', subdivision: 'GA' });
    expect(res.body).not.toMatch(/30144|latitude|longitude|-84/);
    for (const s of logs) {
      for (const call of s.mock.calls) expect(JSON.stringify(call)).not.toContain('Kennesaw');
    }
  });

  it('omits town and state when Netlify has none', async () => {
    const res = await geoFn.handler({ httpMethod: 'GET', headers: { 'x-nf-country': 'AU' } }, {});
    expect(JSON.parse(res.body)).toEqual({ country: 'AU' });
  });
});

describe('detectPlace (device)', () => {
  beforeEach(() => { __resetPlaceForTests(); localStorage.clear(); sessionStorage.clear(); });
  afterEach(() => { vi.unstubAllGlobals(); });

  it('keeps town and state in memory only: nothing written to storage', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ country: 'us', city: 'Kennesaw', subdivision: 'GA' }) })));
    const p = await detectPlace();
    expect(p).toEqual({ country: 'US', city: 'Kennesaw', subdivision: 'GA' });
    const stored = JSON.stringify({ ...localStorage }) + JSON.stringify({ ...sessionStorage });
    expect(stored).not.toContain('Kennesaw');
    expect(stored).not.toContain('GA');
  });

  it('never throws offline', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline'); }));
    expect(await detectPlace()).toEqual({ country: null, city: null, subdivision: null });
  });
});
