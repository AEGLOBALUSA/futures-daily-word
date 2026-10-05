/**
 * B09-11: "{n} people prayed for your request".
 *
 *   POST create  returns the new request's id (to the poster's own phone).
 *   GET ?mine=   counts only ({id, prayerCount}), at most 10 uuids, and []
 *                unless dw_prayed_count is live (or shadow with the id listed).
 *   GET          adds prayedConfirm, true only while the kind is live.
 *
 * NOTE: this file lives in tests/, never in netlify/functions/ (every file
 * there is deployed as a function).
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import Module from 'node:module';
import { createRequire } from 'node:module';

const require_ = createRequire(import.meta.url);

const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';
const C = '33333333-3333-4333-8333-333333333333';

const state = {
  kind: null, // { mode, shadow_recipients } or null (no row)
  kindError: false,
  prayersError: false,
  prayers: [],
  inserted: [],
};

function reset() {
  state.kind = null;
  state.kindError = false;
  state.prayersError = false;
  state.inserted = [];
  state.prayers = [
    { id: A, prayer: 'Please pray for my job interview', name: 'Sam Example', campus: 'au-paradise', email: 'sam@example.org', prayer_count: 4, created_at: new Date().toISOString() },
    { id: B, prayer: 'Healing for my mum', name: 'Anonymous', campus: '', email: 'b@example.org', prayer_count: 1, created_at: new Date().toISOString() },
  ];
}

function fakeDb() {
  return {
    from(table) {
      const q = { table, filters: [], op: 'select' };
      const b = {
        select() { return b; },
        eq(col, val) { q.filters.push(['eq', col, val]); return b; },
        in(col, val) { q.filters.push(['in', col, val]); return b; },
        order() { return b; },
        limit() { return b; },
        insert(row) { q.op = 'insert'; q.row = row; return b; },
        maybeSingle() { return Promise.resolve(run(q, 'maybe')); },
        single() { return Promise.resolve(run(q, 'single')); },
        then(res, rej) { return Promise.resolve(run(q, 'many')).then(res, rej); },
      };
      return b;
    },
    rpc() { return Promise.resolve({ error: null }); },
  };
}

function run(q, shape) {
  if (q.table === 'dw_prompt_kind') {
    if (state.kindError) return { data: null, error: { message: 'boom' } };
    return { data: state.kind, error: null };
  }
  if (q.table === 'dw_campuses') return { data: [], error: null };
  if (q.table === 'prayers') {
    if (q.op === 'insert') {
      const row = { id: C, ...q.row };
      state.inserted.push(row);
      return { data: shape === 'single' ? { id: C } : [row], error: null };
    }
    if (state.prayersError) return { data: null, error: { message: 'boom' } };
    let rows = state.prayers;
    for (const [type, col, val] of q.filters) {
      rows = rows.filter((r) => (type === 'in' ? val.includes(r[col]) : r[col] === val));
    }
    return { data: rows, error: null };
  }
  return { data: null, error: { message: `unexpected table ${q.table}` } };
}

let handler;
const realLoad = Module._load;
beforeAll(() => {
  Module._load = function (request, ...rest) {
    if (request === '@supabase/supabase-js') return { createClient: () => fakeDb() };
    return realLoad.call(this, request, ...rest);
  };
  handler = require_('../../netlify/functions/prayer-wall.js').handler;
});
afterAll(() => { Module._load = realLoad; });
beforeEach(reset);

let ipSeq = 0;
function get(params) {
  ipSeq++;
  return handler({ httpMethod: 'GET', headers: { 'x-nf-client-connection-ip': `10.0.0.${ipSeq % 250}` }, queryStringParameters: params });
}
function post(body) {
  ipSeq++;
  return handler({ httpMethod: 'POST', headers: { 'x-nf-client-connection-ip': `10.0.1.${ipSeq % 250}` }, body: JSON.stringify(body) });
}

describe('POST create (B09-11)', () => {
  it('returns the new request id', async () => {
    const res = await post({ action: 'create', prayer: 'Please pray', name: 'Anonymous', campus: '' });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual({ success: true, id: C });
    expect(state.inserted).toHaveLength(1);
  });
});

describe('GET ?mine= (B09-11)', () => {
  it('answers [] while the kind is off, missing or unreadable', async () => {
    for (const setup of [
      () => { state.kind = { mode: 'off', shadow_recipients: [] }; },
      () => { state.kind = null; },
      () => { state.kindError = true; },
    ]) {
      reset();
      setup();
      const res = await get({ mine: A });
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body)).toEqual([]);
    }
  });

  it('returns counts only, keys exactly id and prayerCount, when live', async () => {
    state.kind = { mode: 'live', shadow_recipients: [] };
    const res = await get({ mine: `${A},${B}` });
    const body = JSON.parse(res.body);
    expect(body).toEqual([{ id: A, prayerCount: 4 }, { id: B, prayerCount: 1 }]);
    for (const item of body) expect(Object.keys(item).sort()).toEqual(['id', 'prayerCount']);
    expect(res.body).not.toMatch(/Sam|example\.org|interview|paradise/i);
  });

  it('never returns more ids than asked, and ignores ids that do not exist', async () => {
    state.kind = { mode: 'live', shadow_recipients: [] };
    const res = await get({ mine: C });
    expect(JSON.parse(res.body)).toEqual([]);
  });

  it('in shadow, answers only for ids on the shadow list', async () => {
    state.kind = { mode: 'shadow', shadow_recipients: [B.toUpperCase()] };
    const res = await get({ mine: `${A},${B}` });
    expect(JSON.parse(res.body)).toEqual([{ id: B, prayerCount: 1 }]);
  });

  it('refuses more than 10 ids, non-uuids, an empty list and an overlong value', async () => {
    state.kind = { mode: 'live', shadow_recipients: [] };
    const eleven = Array.from({ length: 11 }, (_, i) => `${String(i).padStart(8, '0')}-1111-4111-8111-111111111111`).join(',');
    for (const mine of [eleven, 'not-a-uuid', `${A},abc`, '', ',', `${A};drop table`, 'x'.repeat(401)]) {
      const res = await get({ mine });
      expect(res.statusCode, mine.slice(0, 20)).toBe(400);
    }
  });

  it('accepts exactly 10 ids and de-duplicates', async () => {
    state.kind = { mode: 'live', shadow_recipients: [] };
    const ten = [A, ...Array.from({ length: 9 }, (_, i) => `${String(i).padStart(8, '0')}-1111-4111-8111-111111111111`)].join(',');
    expect((await get({ mine: ten })).statusCode).toBe(200);
    expect(JSON.parse((await get({ mine: `${A},${A}` })).body)).toEqual([{ id: A, prayerCount: 4 }]);
  });

  it('fails closed to [] when the prayers read errors', async () => {
    state.kind = { mode: 'live', shadow_recipients: [] };
    state.prayersError = true;
    const res = await get({ mine: A });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual([]);
  });
});

describe('GET wall prayedConfirm (B09-11)', () => {
  it('is true only while the kind is live, and the wall never carries an email', async () => {
    for (const [kind, want] of [[{ mode: 'live', shadow_recipients: [] }, true], [{ mode: 'shadow', shadow_recipients: [A] }, false], [{ mode: 'off', shadow_recipients: [] }, false], [null, false]]) {
      reset();
      state.kind = kind;
      const res = await get({ filter: 'all' });
      const body = JSON.parse(res.body);
      expect(body.prayedConfirm).toBe(want);
      expect(res.body).not.toMatch(/example\.org/);
    }
  });
});
