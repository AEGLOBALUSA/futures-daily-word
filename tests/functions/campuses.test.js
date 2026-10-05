/**
 * The one campus list on the server (B09-02): lib/campuses.js and the public
 * GET /.netlify/functions/campuses.
 *
 * NOTE: this file lives in tests/, never in netlify/functions/ (every file
 * there is deployed as a function).
 */
import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest';
import Module from 'node:module';
import { createRequire } from 'node:module';

const require_ = createRequire(import.meta.url);
const campuses = require_('../../netlify/functions/lib/campuses.js');
const codes = require_('../../netlify/functions/lib/campus-code.js');
const FALLBACK = require_('../../netlify/functions/lib/campuses.fallback.json');

function row(over = {}) {
  return {
    id: 've-futuros-merida', name: 'Futuros Mérida', city: 'Mérida, Venezuela', region: 'Venezuela',
    congregation: 'futuros-us', time_zone: 'America/Caracas', sunday_until: '16:00:00', video_url: null,
    pco_names: ['Futuros Merida'], sort_order: 215, active: true, updated_by: 'someone@example.org',
    towns: ['Ejido'],
    ...over,
  };
}

/** A fake db whose dw_campuses read answers `result` and counts the reads. */
function fakeDb(result) {
  const db = { reads: 0 };
  db.from = (table) => {
    expect(table).toBe('dw_campuses');
    const b = {
      select() { return b; },
      order() { db.reads++; return Promise.resolve(typeof result === 'function' ? result() : result); },
    };
    return b;
  };
  return db;
}

const seedRows = () => FALLBACK.map((c) => ({
  id: c.id, name: c.name, city: c.city, towns: c.towns, region: c.region, congregation: c.congregation,
  time_zone: c.timeZone, sunday_until: '16:00:00', video_url: c.videoUrl, pco_names: c.pcoNames,
  sort_order: c.sortOrder, active: true,
}));

beforeEach(() => { campuses.clearCampusCache(); });

describe('loadCampuses', () => {
  it('reads the table once and serves the cached list for 5 minutes', async () => {
    const db = fakeDb({ data: [...seedRows(), row()], error: null });
    const t0 = 1_000_000;
    const a = await campuses.loadCampuses(db, { now: t0 });
    const b = await campuses.loadCampuses(db, { now: t0 + campuses.CACHE_MS - 1 });
    expect(db.reads).toBe(1);
    expect(b).toBe(a);
    expect(a).toHaveLength(23);
    await campuses.loadCampuses(db, { now: t0 + campuses.CACHE_MS + 1 });
    expect(db.reads).toBe(2);
  });

  it('answers the bundled 22 when the read errors, throws or comes back empty, and does not cache that', async () => {
    for (const result of [
      { data: null, error: { message: 'relation "dw_campuses" does not exist' } },
      () => { throw new Error('network down'); },
      { data: [], error: null },
    ]) {
      campuses.clearCampusCache();
      const db = fakeDb(result);
      const list = await campuses.loadCampuses(db);
      expect(list.map((c) => c.id)).toEqual(FALLBACK.map((c) => c.id));
      await campuses.loadCampuses(db);
      expect(db.reads).toBe(2);
    }
  });

  it('before the towns column is applied, reads the rest of the owner\'s list instead of the bundled seed (B09-07F)', async () => {
    const answers = [
      { data: null, error: { code: '42703', message: 'column dw_campuses.towns does not exist' } },
      { data: [row({ towns: undefined })], error: null },
    ];
    const db = fakeDb(() => answers.shift());
    const list = await campuses.loadCampuses(db);
    expect(db.reads).toBe(2);
    expect(list.map((c) => c.id)).toEqual(['ve-futuros-merida']);
    expect(list[0].towns).toEqual([]);
  });

  it('maps a row to the list shape: camelCase, HH:MM, lower-case Planning Center spellings, no updated_by', async () => {
    const list = await campuses.loadCampuses(fakeDb({ data: [row()], error: null }));
    expect(list[0]).toEqual({
      id: 've-futuros-merida', name: 'Futuros Mérida', city: 'Mérida, Venezuela', towns: ['Ejido'], region: 'Venezuela',
      congregation: 'futuros-us', timeZone: 'America/Caracas', sundayUntil: '16:00', videoUrl: null,
      pcoNames: ['futuros merida'], sortOrder: 215, active: true,
    });
  });
});

describe('the helpers take the list', () => {
  const list = [...FALLBACK, campuses.fromRow(row()), campuses.fromRow(row({ id: 've-valles-del-tuy', name: 'Futuros Valles del Tuy', pco_names: [], active: false }))];

  it('knows a campus the owner added, hidden or not; other is never a staff campus', () => {
    expect(campuses.isCampusId('ve-futuros-merida', list)).toBe(true);
    expect(campuses.isCampusId('ve-valles-del-tuy', list)).toBe(true);
    expect(campuses.isCampusId('ve-futuros-merida')).toBe(false); // not in the bundled list
    expect(campuses.isCampusId('other', list)).toBe(false);
    expect(campuses.isKnownCampus('other', list)).toBe(true);
    expect(campuses.campusIds(list)).not.toContain('other');
  });

  it('names a campus, and falls back to the id itself', () => {
    expect(campuses.campusName('ve-valles-del-tuy', list)).toBe('Futuros Valles del Tuy');
    expect(campuses.campusName('us-gwinnett', list)).toBe('Futures Gwinnett');
    expect(campuses.campusName('xx-nowhere', list)).toBe('xx-nowhere');
  });

  it('matches every Planning Center spelling the old map held, and the new campus', () => {
    const OLD = {
      'paradise': 'au-paradise', 'adelaide': 'au-adelaide-city', 'mt barker': 'au-mount-barker', 'victor harbour': 'au-victor-harbor',
      'futures gwinnett': 'us-gwinnett', 'duluth': 'us-futuros-duluth', 'futuros kennesaw': 'us-futuros-kennesaw', 'kennesaw': 'us-kennesaw',
      'grayson': 'us-futuros-grayson', 'surakarta': 'id-solo', 'denpasar': 'id-bali', 'rio de janeiro': 'br-rio',
    };
    for (const [name, id] of Object.entries(OLD)) expect(campuses.campusIdForPcoName(name, list)).toBe(id);
    expect(campuses.campusIdForPcoName('Futuros Merida', list)).toBe('ve-futuros-merida');
    expect(campuses.campusIdForPcoName('Non-Futures Church', list)).toBe('');
    expect(campuses.campusIdForPcoName('', list)).toBe('');
  });

  it('gives each campus its time zone (Franklin is Central)', () => {
    expect(campuses.campusTimeZone('us-franklin', list)).toBe('America/Chicago');
    expect(campuses.campusTimeZone('au-paradise', list)).toBe('Australia/Adelaide');
    expect(campuses.campusTimeZone('id-bali', list)).toBe('Asia/Makassar');
    expect(campuses.campusTimeZone('xx-nowhere', list)).toBeNull();
  });

  it('cuts and checks a code for a new region prefix, with the same digest as before for the old campuses', () => {
    const code = codes.generateCampusCode('ve-futuros-merida', 'secret', list);
    expect(code).toHaveLength(8);
    expect(codes.campusForCode(code, 'secret', list)).toBe('ve-futuros-merida');
    expect(codes.campusSlug('ve-futuros-merida')).toBe('futuros-merida');
    expect(codes.campusSlug('us-gwinnett')).toBe('gwinnett');
    expect(codes.generateCampusCode('us-gwinnett', 'secret', list)).toBe(codes.generateCampusCode('us-gwinnett', 'secret'));
  });
});

describe('validateCampusSave', () => {
  const list = FALLBACK.map((c) => ({ ...c }));
  const NEW = { id: 've-futuros-merida', name: 'Futuros Mérida', city: 'Mérida, Venezuela', region: 'Venezuela', timeZone: 'America/Caracas', sundayUntil: '16:00', isNew: true };

  it('takes a new campus and puts it last among the campuses', () => {
    const r = campuses.validateCampusSave(NEW, list);
    expect(r.error).toBeUndefined();
    expect(r.isNew).toBe(true);
    expect(r.row).toMatchObject({ id: 've-futuros-merida', time_zone: 'America/Caracas', sunday_until: '16:00', active: true, sort_order: 211 });
    expect(r.row.updated_by).toBeUndefined();
  });

  it('an edit that leaves a field out keeps what is saved; only an explicit empty clears it', () => {
    const hidden = list.map((c) => (c.id === 'us-gwinnett' ? { ...c, active: false } : c));
    const kept = campuses.validateCampusSave({ id: 'us-gwinnett', name: 'Futures Gwinnett', region: 'North America', timeZone: 'America/New_York' }, hidden);
    expect(kept.error).toBeUndefined();
    expect(kept.row.video_url).toMatch(/^https:\/\/www\.youtube\.com/);
    expect(kept.row.pco_names).toEqual(['gwinnett', 'futures gwinnett']);
    expect(kept.row.city).toBe('Gwinnett, GA');
    expect(kept.row.congregation).toBe('futures-us');
    expect(kept.row.active).toBe(false);
    const cleared = campuses.validateCampusSave({ id: 'us-gwinnett', name: 'Futures Gwinnett', region: 'North America', timeZone: 'America/New_York', videoUrl: '', pcoNames: [], active: true }, hidden);
    expect(cleared.row.video_url).toBeNull();
    expect(cleared.row.pco_names).toEqual([]);
    expect(cleared.row.active).toBe(true);
  });

  it('keeps the other towns as typed: trimmed, tags dropped, duplicates dropped ignoring case and accents (B09-07F)', () => {
    const r = campuses.validateCampusSave({ ...NEW, towns: ' Ejido \nejido\n<b>Tabay</b>\n\nTábay, Lagunillas' }, list);
    expect(r.error).toBeUndefined();
    expect(r.row.towns).toEqual(['Ejido', 'Tabay', 'Lagunillas']);
    expect(campuses.MAX_TOWNS).toBe(20);
  });

  it('more than 20 other towns is said beside Save campus, never cut silently (B09-07F)', () => {
    const twenty = Array.from({ length: 20 }, (_, i) => `Town ${i}`);
    expect(campuses.validateCampusSave({ ...NEW, towns: twenty }, list).row.towns).toHaveLength(20);
    // 21 lines, one a duplicate ignoring case: still 20, so it saves.
    expect(campuses.validateCampusSave({ ...NEW, towns: [...twenty, 'town 3'].join('\n') }, list).row.towns).toHaveLength(20);
    const r = campuses.validateCampusSave({ ...NEW, towns: [...twenty, 'Town 20'].join('\n') }, list);
    expect(r.row).toBeUndefined();
    expect(r.error).toBe('Keep it to 20 other towns. This campus has 21.');
  });

  it('an edit that leaves the towns out keeps them; an explicit empty list clears them (B09-07F)', () => {
    const base = { id: 'au-copper-coast', name: 'Futures Copper Coast', region: 'Australia', timeZone: 'Australia/Adelaide' };
    expect(campuses.validateCampusSave(base, list).row.towns).toEqual(['Kadina', 'Wallaroo', 'Moonta']);
    expect(campuses.validateCampusSave({ ...base, towns: [] }, list).row.towns).toEqual([]);
    expect(campuses.validateCampusSave({ ...base, towns: 'Kadina\nPort Hughes' }, list).row.towns).toEqual(['Kadina', 'Port Hughes']);
  });

  it('says the fix in words', () => {
    expect(campuses.validateCampusSave({ ...NEW, name: '' }, list).error).toBe('Add the campus name first.');
    expect(campuses.validateCampusSave({ ...NEW, timeZone: 'Mars/Olympus' }, list).error).toBe('Choose the campus\'s time zone first.');
    expect(campuses.validateCampusSave({ ...NEW, sundayUntil: '25:00' }, list).error).toMatch(/hours and minutes/);
    expect(campuses.validateCampusSave({ ...NEW, id: 'Bad Id' }, list).error).toMatch(/two letters, a dash/);
    expect(campuses.validateCampusSave({ ...NEW, name: 'Futures Gwinnett', id: 'us-gwinnett-2' }, list).error).toMatch(/already on the list/);
    expect(campuses.validateCampusSave({ ...NEW, pcoNames: 'Paradise' }, list).error).toMatch(/already matches Futures Paradise/);
  });

  it('refuses a rename: an edit must name a saved id, and a new campus cannot take one', () => {
    const rename = campuses.validateCampusSave({ ...NEW, isNew: false }, list);
    expect(rename.error).toBe('The id never changes once saved. Add a new campus instead.');
    const taken = campuses.validateCampusSave({ ...NEW, id: 'us-gwinnett', name: 'Gwinnett Two' }, list);
    expect(taken.error).toMatch(/already taken/);
  });

  it('an edit keeps the id and the order, and can hide the campus', () => {
    const r = campuses.validateCampusSave({ id: 'br-rio', name: 'Futures Rio', city: 'Rio', region: 'Brazil', timeZone: 'America/Sao_Paulo', active: false }, list);
    expect(r.error).toBeUndefined();
    expect(r.isNew).toBe(false);
    expect(r.row).toMatchObject({ id: 'br-rio', sort_order: 210, active: false });
  });

  it('fills an id from a name', () => {
    expect(campuses.slugify('Futuros Mérida')).toBe('futuros-merida');
    expect(campuses.slugify('  Valles del Tuy! ')).toBe('valles-del-tuy');
  });
});

describe('planCampusMove', () => {
  const list = FALLBACK.map((c) => ({ ...c }));
  it('swaps a campus with its neighbour and renumbers', () => {
    const { changes } = campuses.planCampusMove('au-adelaide-city', 'up', list);
    expect(changes).toEqual(expect.arrayContaining([{ id: 'au-adelaide-city', sort_order: 10 }, { id: 'au-paradise', sort_order: 20 }]));
  });
  it('says so at either end', () => {
    expect(campuses.planCampusMove('au-paradise', 'up', list).error).toBe('Futures Paradise is already first.');
    expect(campuses.planCampusMove('other', 'down', list).error).toBe('Non-Futures Church is already last.');
    expect(campuses.planCampusMove('xx-nowhere', 'up', list).error).toMatch(/not on the list/);
  });
});

describe('GET /.netlify/functions/campuses', () => {
  const realLoad = Module._load;
  let handler;
  let table;

  beforeAll(() => {
    Module._load = function (request, ...rest) {
      if (request === '@supabase/supabase-js') return { createClient: () => fakeDb(() => table) };
      if (request === './lib/rate-limit') return { isSharedRateLimited: async () => false };
      return realLoad.call(this, request, ...rest);
    };
    delete require_.cache[require_.resolve('../../netlify/functions/campuses.js')];
    ({ handler } = require_('../../netlify/functions/campuses.js'));
  });
  afterAll(() => { Module._load = realLoad; });

  it('serves the active campuses as JSON, cacheable, never updated_by or the Planning Center spellings', async () => {
    table = { data: [...seedRows().map((r) => ({ ...r, updated_by: 'someone@example.org' })), row({ active: false })], error: null };
    const res = await handler({ httpMethod: 'GET', headers: { origin: 'https://futuresdailyword.com' } });
    expect(res.statusCode).toBe(200);
    expect(res.headers['Cache-Control']).toBe('public, max-age=300');
    const body = JSON.parse(res.body);
    expect(body.campuses).toHaveLength(22);
    expect(Object.keys(body.campuses[0]).sort()).toEqual(['city', 'congregation', 'id', 'name', 'region', 'sortOrder', 'sundayUntil', 'timeZone', 'towns', 'videoUrl']);
    // The other towns near a campus are public, so the phone matches its own town in memory (B09-07F).
    expect(body.campuses.find((c) => c.id === 'au-copper-coast').towns).toEqual(['Kadina', 'Wallaroo', 'Moonta']);
    expect(res.body).not.toContain('updated_by');
    expect(res.body).not.toContain('someone@example.org');
    expect(body.campuses.find((c) => c.id === 'us-gwinnett').videoUrl).toMatch(/^https:\/\/www\.youtube\.com\//);
  });

  it('serves the bundled 22 when the table cannot be read', async () => {
    campuses.clearCampusCache();
    table = { data: null, error: { message: 'down' } };
    const res = await handler({ httpMethod: 'GET', headers: {} });
    expect(JSON.parse(res.body).campuses).toHaveLength(22);
  });

  it('answers GET only', async () => {
    const res = await handler({ httpMethod: 'POST', headers: {}, body: '{}' });
    expect(res.statusCode).toBe(405);
  });
});
