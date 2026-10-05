/**
 * The daily reminder sender with the v2 switch (MOS-to-8 build B09-17):
 * netlify/functions/push-send.js.
 *
 * OFF EQUALS TODAY: the same subscriber table, clock and template choice are run
 * through the sender as it was before this build (a frozen copy in
 * fixtures/push-send.before-b09-17.cjs) and through the sender now. With the kind
 * off, missing, unreadable, in shadow with no listed device, or on before its
 * columns exist, both send the same payloads to the same subscriptions, write
 * the same rows and answer the same body.
 *
 * Shadow reaches only the listed device; live never reaches a Comfort reader or
 * a reader who read today, and never sends twice in a day.
 *
 * NOTE: this file lives in tests/, never in netlify/functions/.
 */
import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const webpush = require('web-push');
const supa = require('@supabase/supabase-js');
const templates = require('../../netlify/functions/lib/push-templates.js');

const NOW_PATH = '../../netlify/functions/push-send.js';
const BEFORE_PATH = './fixtures/push-send.before-b09-17.cjs';
const SECRET = 'test-cron-secret-0123456789';

const TEST_ID = '0b6f1d2e-3c4a-4b5c-8d9e-0f1a2b3c4d5e';
const ID_A = '1a1a1a1a-1111-4111-8111-111111111111';
const ID_B = '2b2b2b2b-2222-4222-8222-222222222222';
const ID_C = '3c3c3c3c-3333-4333-8333-333333333333';

/** 11:00 UTC Tue 6 Oct 2026 = 7 am New York, 10 pm Sydney (AEDT). */
const RUN_AT = new Date('2026-10-06T11:00:00Z');

function subs() {
  const base = (id, over) => ({
    id,
    endpoint_hash: `hash-${id.slice(0, 4)}`,
    subscription: { endpoint: `https://push.example.test/${id.slice(0, 4)}` },
    timezone: 'America/New_York',
    preferred_hour: 7,
    lang: 'en',
    active: true,
    persona: null, journey_day: null, next_passage: null, next_label: null, next_for_date: null,
    last_read_date: null, last_sent_at: null, unopened_streak: 0,
    ...over,
  });
  return [
    base(TEST_ID, { persona: 'congregation', next_passage: 'John 3', next_label: 'Day 12 of Bible Basics', next_for_date: '2026-10-06' }),
    base(ID_A, { lang: 'es', persona: 'comfort' }),
    base(ID_B, { persona: 'congregation', last_read_date: '2026-10-06' }),
    base(ID_C, { timezone: 'Australia/Sydney', preferred_hour: 22, lang: 'pt', persona: 'congregation' }),
    base('4d4d4d4d-4444-4444-8444-444444444444', { preferred_hour: 8 }),
    base('5e5e5e5e-5555-4555-8555-555555555555', { active: false }),
  ];
}

const STATE_COLS = ['persona', 'journey_day', 'next_passage', 'next_label', 'next_for_date', 'last_read_date', 'last_sent_at', 'unopened_streak'];

/**
 * A stand-in for the three tables. hasLedger: whether push_subscriptions has
 * last_sent_date (live does NOT, 5 Oct 2026). hasState: whether this build's
 * columns exist (false = before the migration is applied).
 */
function fakeDb({ kind = null, kindError = false, hasLedger = false, hasState = true, logFails = false, rows = subs() } = {}) {
  const writes = [];
  const log = [];
  function from(table) {
    const q = { op: 'select', cols: '', filters: [], patch: null };
    const api = {
      select(cols) { q.cols = cols; return api; },
      eq(c, v) { q.filters.push(['eq', c, v]); return api; },
      in(c, v) { q.filters.push(['in', c, v]); return api; },
      order() { return api; },
      range(a, b) { q.range = [a, b]; return api; },
      update(p) { q.op = 'update'; q.patch = p; return api; },
      delete() { q.op = 'delete'; return api; },
      insert(row) { q.op = 'insert'; q.patch = row; return Promise.resolve(run()); },
      maybeSingle() { return Promise.resolve(run(true)); },
      then(res, rej) { return Promise.resolve(run()).then(res, rej); },
    };
    const match = (r) => q.filters.every(([t, c, v]) => (t === 'eq' ? r[c] === v : v.includes(r[c])));
    function run(single) {
      if (table === 'dw_prompt_kind') {
        if (kindError) return { data: null, error: { message: 'relation does not exist' } };
        if (!kind) return { data: null, error: null };
        if (q.cols === 'note') return { data: { note: kind.note ?? null }, error: null };
        return { data: { mode: kind.mode, shadow_recipients: kind.shadow_recipients || [] }, error: null };
      }
      if (table === 'dw_prompt_log') {
        if (q.op === 'insert') {
          if (logFails) return { error: { code: '42501', message: 'permission denied' } };
          if (log.some((r) => r.dedupe_key === q.patch.dedupe_key)) return { error: { code: '23505', message: 'duplicate' } };
          log.push({ delivered: false, ...q.patch });
          return { error: null };
        }
        if (q.op === 'update') {
          log.filter(match).forEach((r) => Object.assign(r, q.patch));
          return { error: null };
        }
      }
      if (table === 'push_subscriptions') {
        const cols = q.cols.split(',').map((c) => c.trim()).filter(Boolean);
        if (q.op === 'select') {
          if (cols.includes('last_sent_date') && !hasLedger) return { data: null, error: { message: 'column push_subscriptions.last_sent_date does not exist' } };
          if (cols.some((c) => STATE_COLS.includes(c)) && !hasState) return { data: null, error: { message: 'column push_subscriptions.persona does not exist' } };
          let data = rows.filter(match).map((r) => Object.fromEntries(cols.map((c) => [c, r[c] ?? null])));
          if (q.range) data = data.slice(q.range[0], q.range[1] + 1);
          return single ? { data: data[0] || null, error: null } : { data, error: null };
        }
        writes.push({ op: q.op, patch: q.patch, filters: q.filters });
        if (q.op === 'update') {
          if (Object.keys(q.patch).some((c) => STATE_COLS.includes(c)) && !hasState) return { error: { message: 'no such column' } };
          rows.filter(match).forEach((r) => Object.assign(r, q.patch));
        }
        return { error: null };
      }
      return { data: null, error: { message: `unexpected table ${table}` } };
    }
    return api;
  }
  return { from, writes, log, rows };
}

let sent;
let realCreate;
let realSend;

beforeAll(() => {
  const keys = webpush.generateVAPIDKeys();
  process.env.VAPID_PUBLIC_KEY = keys.publicKey;
  process.env.VAPID_PRIVATE_KEY = keys.privateKey;
  process.env.VAPID_EMAIL = 'mailto:test@example.com';
  process.env.CRON_SECRET = SECRET;
});

beforeEach(() => {
  sent = [];
  realCreate = supa.createClient;
  realSend = webpush.sendNotification;
  webpush.sendNotification = async (subscription, payload) => {
    sent.push({ endpoint: subscription.endpoint, payload: JSON.parse(payload) });
    return { statusCode: 201 };
  };
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(RUN_AT);
  vi.spyOn(Math, 'random').mockReturnValue(0.42);
});

afterEach(() => {
  supa.createClient = realCreate;
  webpush.sendNotification = realSend;
  vi.useRealTimers();
  vi.restoreAllMocks();
});

/** Load a sender fresh against this db and run its handler as the cron would. */
async function runWith(path, db) {
  supa.createClient = () => db;
  const resolved = require.resolve(path);
  delete require.cache[resolved];
  const mod = require(resolved);
  sent = [];
  const res = await mod.handler({ headers: { authorization: `Bearer ${SECRET}` } });
  delete require.cache[resolved];
  return { res, sent: [...sent].sort((a, b) => a.endpoint.localeCompare(b.endpoint)) };
}

describe('off equals today', () => {
  const cases = {
    'kind off': { kind: { mode: 'off', note: TEST_ID } },
    'kind row missing': { kind: null },
    'switch table unreadable': { kindError: true },
    'shadow with no device listed': { kind: { mode: 'shadow', note: 'no id here' } },
    'shadow listing an email, not a device': { kind: { mode: 'shadow', shadow_recipients: ['owner@example.com'] } },
    'live before the migration is applied': { kind: { mode: 'live' }, hasState: false },
    'shadow before the migration is applied': { kind: { mode: 'shadow', note: TEST_ID }, hasState: false },
  };
  for (const ledger of [false, true]) {
    for (const [name, opts] of Object.entries(cases)) {
      it(`${name} (${ledger ? 'with' : 'without'} last_sent_date): same sends, same writes, same answer`, async () => {
        const before = fakeDb({ ...opts, hasLedger: ledger });
        const now = fakeDb({ ...opts, hasLedger: ledger });
        const a = await runWith(BEFORE_PATH, before);
        const b = await runWith(NOW_PATH, now);
        expect(b.res).toEqual(a.res);
        expect(b.sent).toEqual(a.sent);
        expect(now.writes).toEqual(before.writes);
        expect(now.log).toEqual([]);
        expect(a.sent.length).toBeGreaterThan(0);
      });
    }
  }

  it('today, every subscriber at the hour gets the template, Comfort and read-today included', async () => {
    const { sent: s } = await runWith(NOW_PATH, fakeDb({ kind: { mode: 'off' } }));
    expect(s.map((x) => x.endpoint)).toEqual([
      'https://push.example.test/0b6f', 'https://push.example.test/1a1a', 'https://push.example.test/2b2b', 'https://push.example.test/3c3c',
    ]);
    for (const x of s) expect(x.payload.title).not.toMatch(/Day 12/);
  });
});

describe('shadow: only the listed device', () => {
  it('the test device gets its plan and day; everyone else gets exactly what they get today', async () => {
    const before = await runWith(BEFORE_PATH, fakeDb({ kind: { mode: 'off' } }));
    const db = fakeDb({ kind: { mode: 'shadow', note: `test phone ${TEST_ID}` } });
    const now = await runWith(NOW_PATH, db);

    const mine = now.sent.find((x) => x.endpoint.endsWith('0b6f'));
    expect(mine.payload).toMatchObject({ title: 'Day 12 of Bible Basics', body: 'John 3 is ready when you are.', url: '/' });
    const othersNow = now.sent.filter((x) => !x.endpoint.endsWith('0b6f'));
    const othersBefore = before.sent.filter((x) => !x.endpoint.endsWith('0b6f'));
    expect(othersNow).toEqual(othersBefore);

    expect(db.log).toHaveLength(1);
    expect(db.log[0]).toMatchObject({ kind: 'dw_daily_push_v2', recipient: TEST_ID, mode: 'shadow', delivered: true, dedupe_key: `dw_daily_push_v2:${TEST_ID}:2026-10-06` });
    expect(db.rows.find((r) => r.id === TEST_ID)).toMatchObject({ unopened_streak: 1, last_sent_at: RUN_AT.toISOString() });
    const body = JSON.parse(now.res.body);
    expect(body.v2).toEqual({ mode: 'shadow', rows: 1, sent: 1, skipped: {} });
  });

  it('shadow_recipients holding the push row id works too', async () => {
    const db = fakeDb({ kind: { mode: 'shadow', shadow_recipients: [TEST_ID.toUpperCase()] } });
    const now = await runWith(NOW_PATH, db);
    expect(now.sent.find((x) => x.endpoint.endsWith('0b6f')).payload.title).toBe('Day 12 of Bible Basics');
  });

  it('a second run in the same hour sends the test device nothing more', async () => {
    const db = fakeDb({ kind: { mode: 'shadow', note: TEST_ID } });
    await runWith(NOW_PATH, db);
    const again = await runWith(NOW_PATH, db);
    expect(again.sent.find((x) => x.endpoint.endsWith('0b6f'))).toBeUndefined();
    expect(db.log).toHaveLength(1);
  });

  it('a day the test device already read: nothing', async () => {
    const rows = subs();
    rows[0].last_read_date = '2026-10-06';
    const now = await runWith(NOW_PATH, fakeDb({ kind: { mode: 'shadow', note: TEST_ID }, rows }));
    expect(now.sent.find((x) => x.endpoint.endsWith('0b6f'))).toBeUndefined();
    expect(JSON.parse(now.res.body).v2.skipped).toEqual({ read_today: 1 });
  });
});

describe('live', () => {
  it('never reaches a Comfort reader or a reader who read today; counts only in the log line', async () => {
    const db = fakeDb({ kind: { mode: 'live' } });
    const now = await runWith(NOW_PATH, db);
    expect(now.sent.map((x) => x.endpoint)).toEqual(['https://push.example.test/0b6f', 'https://push.example.test/3c3c']);
    const pt = now.sent.find((x) => x.endpoint.endsWith('3c3c')).payload;
    expect(templates.TEMPLATES.pt.map((x) => x.title)).toContain(pt.title); // no state yet: today's template
    const body = JSON.parse(now.res.body);
    expect(body.v2).toEqual({ mode: 'live', rows: 5, sent: 2, skipped: { not_hour: 1, comfort: 1, read_today: 1 } });
    expect(JSON.stringify(body)).not.toContain(TEST_ID);
  });

  it('a device that has not yet said its path gets nothing until its first open (it could be Comfort)', async () => {
    const rows = subs();
    rows.find((r) => r.id === ID_C).persona = null;
    const now = await runWith(NOW_PATH, fakeDb({ kind: { mode: 'live' }, rows }));
    expect(now.sent.some((x) => x.endpoint.endsWith('3c3c'))).toBe(false);
    expect(JSON.parse(now.res.body).v2.skipped.unknown_path).toBe(1);
  });

  it('an open that lands during the run keeps the unopened count at 0', async () => {
    const db = fakeDb({ kind: { mode: 'live' } });
    const realSendFn = webpush.sendNotification;
    webpush.sendNotification = async (subscription, payload) => {
      if (subscription.endpoint.endsWith('0b6f')) db.rows.find((r) => r.id === TEST_ID).unopened_streak = 0;
      return realSendFn(subscription, payload);
    };
    db.rows.find((r) => r.id === TEST_ID).unopened_streak = 2;
    await runWith(NOW_PATH, db);
    expect(db.rows.find((r) => r.id === TEST_ID).unopened_streak).toBe(0);
  });

  it('fails closed: when the send log cannot be written, nothing is sent', async () => {
    const now = await runWith(NOW_PATH, fakeDb({ kind: { mode: 'live' }, logFails: true }));
    expect(now.sent).toEqual([]);
  });

  it('a v2 send writes today\'s ledger, so switching the kind off the same day sends nothing more', async () => {
    const db = fakeDb({ kind: { mode: 'live' }, hasLedger: true });
    const first = await runWith(NOW_PATH, db);
    expect(first.sent.some((x) => x.endpoint.endsWith('0b6f'))).toBe(true);
    expect(db.rows.find((r) => r.id === TEST_ID).last_sent_date).toBe('2026-10-06');
    const offDb = fakeDb({ kind: { mode: 'off' }, hasLedger: true, rows: db.rows });
    vi.setSystemTime(new Date('2026-10-06T12:00:00Z'));
    const later = await runWith(NOW_PATH, offDb);
    expect(later.sent.some((x) => x.endpoint.endsWith('0b6f'))).toBe(false);
  });

  it('reads every row\'s reading state past the 1,000-row page', async () => {
    const many = subs().slice(0, 1);
    for (let i = 0; i < 1500; i++) {
      many.push({ ...subs()[4], id: `9a9a9a9a-9999-4999-8999-${String(i).padStart(12, '0')}`, endpoint_hash: `h${i}` });
    }
    const db = fakeDb({ kind: { mode: 'live' }, rows: many });
    const r = await runWith(NOW_PATH, db);
    expect(JSON.parse(r.res.body).v2.rows).toBe(1501);
  });

  it('switched on an hour after the old sender reached her (no ledger, as live): no second reminder', async () => {
    const offDb = fakeDb({ kind: { mode: 'off' } });
    const first = await runWith(NOW_PATH, offDb);
    expect(first.sent.some((x) => x.endpoint.endsWith('0b6f'))).toBe(true);
    const liveDb = fakeDb({ kind: { mode: 'live' }, rows: offDb.rows });
    vi.setSystemTime(new Date('2026-10-06T12:00:00Z'));
    const later = await runWith(NOW_PATH, liveDb);
    expect(later.sent.some((x) => x.endpoint.endsWith('0b6f'))).toBe(false);
  });

  it('one a day across a whole day of hourly runs, even when the cron fires twice an hour', async () => {
    const db = fakeDb({ kind: { mode: 'live' } });
    let mine = 0;
    for (let h = 0; h < 24; h++) {
      for (let k = 0; k < 2; k++) {
        vi.setSystemTime(new Date(Date.UTC(2026, 9, 6, h, k * 20)));
        const r = await runWith(NOW_PATH, db);
        mine += r.sent.filter((x) => x.endpoint.endsWith('0b6f')).length;
      }
    }
    expect(mine).toBe(1);
  });
});
