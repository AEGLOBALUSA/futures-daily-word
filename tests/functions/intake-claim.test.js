/**
 * Staff sign-in is decided by the roster, not by how an address looks.
 *
 * A made-up @futures.church address must not be able to set a password, sign
 * in, or become "staff", and a campus pastor whose campus Ashley has not
 * confirmed must not publish to the campus corner straight away.
 *
 * `intake.js` is CommonJS and pulls its dependencies with `require`, which
 * `vi.mock` cannot intercept, so the module loader is overridden directly
 * (same approach as claude.test.js) with a small in-memory fake of Supabase.
 *
 * NOTE: this file lives in tests/, never in netlify/functions/.
 */
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import Module from 'node:module';
import { createRequire } from 'node:module';

const require_ = createRequire(import.meta.url);

// ── in-memory Supabase ────────────────────────────────────────────────────
let tables;
let seq = 0;

function resetTables() {
  seq = 0;
  tables = {
    staff_roster: [],
    staff_sessions: [],
    intake_questions: [
      { id: 'q_campus', label: 'Which campus?', type: 'campus', audience: 'campus', required: false, enabled: true, sort_order: 10, config: {} },
      { id: 'q_title', label: 'Title', type: 'text', audience: 'campus', required: false, enabled: true, sort_order: 20, config: { publish: 'campus_title' } },
      { id: 'q_body', label: 'Body', type: 'long_text', audience: 'campus', required: false, enabled: true, sort_order: 30, config: { publish: 'campus_body' } },
      { id: 'q_hub_title', label: 'Sermon title', type: 'text', audience: 'hub', required: false, enabled: true, sort_order: 40, config: { publish: 'sermon_field', sermonKey: 'title' } },
      { id: 'q_hub_outline', label: 'Sermon notes', type: 'long_text', audience: 'hub', required: false, enabled: true, sort_order: 50, config: { publish: 'sermon_field', sermonKey: 'outline' } },
    ],
    intake_submissions: [],
    campus_content: [],
    published_sermons: [],
  };
}

function matches(row, filters) {
  return filters.every((f) => {
    if (f.op === 'eq') return row[f.col] === f.val;
    if (f.op === 'neq') return row[f.col] !== f.val;
    if (f.op === 'lt') return row[f.col] < f.val;
    if (f.op === 'is') return (row[f.col] ?? null) === f.val;
    if (f.op === 'gte') return row[f.col] != null && row[f.col] >= f.val;
    if (f.op === 'like') {
      // Postgres LIKE: % any run, _ one character, a backslash escapes the next character.
      let re = '';
      for (let i = 0; i < f.val.length; i++) {
        const c = f.val[i];
        if (c === '\\' && i + 1 < f.val.length) re += f.val[++i].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        else if (c === '%') re += '.*';
        else if (c === '_') re += '.';
        else re += c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      }
      return typeof row[f.col] === 'string' && new RegExp('^' + re + '$', 's').test(row[f.col]);
    }
    return true;
  });
}

// `failOn.add('rate_limit_hits:insert')` makes that op on that table return { error }.
const failOn = new Set();

function builder(table) {
  const state = { op: 'select', filters: [], payload: null, opts: null, wantRows: false, count: false };
  const rows = () => tables[table] || (tables[table] = []);
  const run = () => {
    const t = rows();
    if (state.op === 'insert') {
      const list = (Array.isArray(state.payload) ? state.payload : [state.payload]).map((r) => ({ id: r.id || `id-${++seq}`, created_at: new Date().toISOString(), ...r }));
      t.push(...list);
      return list;
    }
    if (state.op === 'upsert') {
      const key = (state.opts && state.opts.onConflict) || 'id';
      const hit = t.find((r) => r[key] === state.payload[key]);
      if (hit) { Object.assign(hit, state.payload); return [hit]; }
      const row = { ...state.payload };
      t.push(row);
      return [row];
    }
    const hits = t.filter((r) => matches(r, state.filters));
    if (state.op === 'update') { hits.forEach((r) => Object.assign(r, state.payload)); return hits; }
    if (state.op === 'delete') { tables[table] = t.filter((r) => !hits.includes(r)); return hits; }
    return hits;
  };
  const b = {
    select(_cols, o) { if (state.op !== 'select') state.wantRows = true; else if (o && o.count) state.count = true; return b; },
    insert(p) { state.op = 'insert'; state.payload = p; return b; },
    update(p) { state.op = 'update'; state.payload = p; return b; },
    upsert(p, o) { state.op = 'upsert'; state.payload = p; state.opts = o; return b; },
    delete() { state.op = 'delete'; return b; },
    eq(col, val) { state.filters.push({ op: 'eq', col, val }); return b; },
    neq(col, val) { state.filters.push({ op: 'neq', col, val }); return b; },
    lt(col, val) { state.filters.push({ op: 'lt', col, val }); return b; },
    gte(col, val) { state.filters.push({ op: 'gte', col, val }); return b; },
    is(col, val) { state.filters.push({ op: 'is', col, val }); return b; },
    like(col, val) { state.filters.push({ op: 'like', col, val }); return b; },
    order() { return b; },
    limit() { return b; },
    maybeSingle: async () => ({ data: run()[0] || null, error: null }),
    single: async () => { const r = run()[0]; return r ? { data: r, error: null } : { data: null, error: { message: 'no row' } }; },
    then(resolve, reject) {
      if (failOn.has(`${table}:${state.op}`)) return Promise.resolve({ data: null, error: { message: 'injected failure' } }).then(resolve, reject);
      const out = run();
      return Promise.resolve(state.count ? { data: null, count: out.length, error: null } : { data: out, error: null }).then(resolve, reject);
    },
  };
  return b;
}

const fakeSupabase = { from: (table) => builder(table) };

// ── load the handler under the fake ───────────────────────────────────────
const realLoad = Module._load;
let handler;
let limiterIps = [];

beforeAll(() => {
  Module._load = function (request, ...rest) {
    if (request === '@supabase/supabase-js') return { createClient: () => fakeSupabase };
    if (request === './lib/rate-limit') return { isSharedRateLimited: async (_name, ip) => { limiterIps.push(ip); return false; } };
    return realLoad.call(this, request, ...rest);
  };
  process.env.SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_KEY = 'service-key';
  ({ handler } = require_('../../netlify/functions/intake.js'));
});

afterAll(() => { Module._load = realLoad; });

beforeEach(() => { resetTables(); limiterIps = []; failOn.clear(); });

const { hashPassword, hashSetupCode } = require_('../../netlify/functions/lib/intake-core.js');
const PASSWORD = 'a-long-test-passphrase-9';

async function call(body, token, extraHeaders = {}) {
  const headers = { 'x-forwarded-for': '203.0.113.9', origin: 'https://futuresdailyword.com', ...extraHeaders };
  if (token) headers.authorization = `Bearer ${token}`;
  const res = await handler({ httpMethod: 'POST', headers, body: JSON.stringify(body) });
  return { status: res.statusCode, body: JSON.parse(res.body || '{}') };
}

function addRoster(row) {
  tables.staff_roster.push({ role: 'campus', campus_id: null, campus_set_by: null, display_name: '', password_hash: null, ...row });
}

const CODE = 'K7M2Q-9XWRT';
const HOUR = 3600_000;

/** A roster row Ashley has added and handed a code to (live unless told otherwise). */
function addWithCode(row, { code = CODE, expiresInMs = 72 * HOUR, attempts = 0 } = {}) {
  addRoster({
    ...row,
    setup_code_hash: hashSetupCode(code),
    setup_code_expires_at: new Date(Date.now() + expiresInMs).toISOString(),
    setup_code_attempts: attempts,
  });
}

const setUp = (email, extra = {}) => call({ action: 'set_password', email, password: PASSWORD, setupCode: CODE, ...extra });
const snapshot = () => JSON.parse(JSON.stringify(tables.staff_roster));

async function adminToken() {
  addRoster({ email: 'ae@futures.global', role: 'admin', display_name: 'Ashley Evans', password_hash: hashPassword(PASSWORD) });
  return signIn('ae@futures.global');
}

async function signIn(email) {
  const r = await call({ action: 'login', email, password: PASSWORD });
  expect(r.status).toBe(200);
  return r.body.token;
}

const CORNER = { q_title: 'Harvest night', q_body: 'Friday 7pm, bring a friend.' };

describe('unknown addresses are not staff', () => {
  it('auth_status says setup:false for a made-up futures.church address', async () => {
    const r = await call({ action: 'auth_status', email: 'nobody123@futures.church' });
    expect(r.status).toBe(200);
    expect(r.body).toEqual({ setup: false });
  });

  it('set_password for a made-up address is refused, even with a code, and leaves no row and no session', async () => {
    const r = await setUp('nobody123@futures.church');
    expect(r.status).toBe(403);
    expect(tables.staff_roster).toHaveLength(0);
    expect(tables.staff_sessions).toHaveLength(0);
  });

  it('login for a made-up address gets the plain refusal, with no setup hint', async () => {
    const r = await call({ action: 'login', email: 'nobody123@futures.church', password: PASSWORD });
    expect(r.status).toBe(403);
    expect(r.body.error).toBe('Invalid email or password');
    expect('setup' in r.body).toBe(false);
  });

  it('a live session whose roster row was deleted is signed out', async () => {
    addRoster({ email: 'gone.pastor@futures.church', campus_id: 'us-gwinnett', campus_set_by: 'admin', password_hash: hashPassword(PASSWORD) });
    const token = await signIn('gone.pastor@futures.church');
    expect((await call({ action: 'me' }, token)).status).toBe(200);
    tables.staff_roster = [];
    expect((await call({ action: 'me' }, token)).status).toBe(401);
  });
});

describe('a first password needs the setup code Ashley issued', () => {
  const REFUSED = /did not work/;

  it('refuses a person on the roster who has no code: 403, no row change, no session', async () => {
    addRoster({ email: 'new.pastor@futures.church', campus_id: 'us-gwinnett', campus_set_by: 'admin' });
    const before = snapshot();
    const none = await call({ action: 'set_password', email: 'new.pastor@futures.church', password: PASSWORD });
    const blank = await call({ action: 'set_password', email: 'new.pastor@futures.church', password: PASSWORD, setupCode: '  ' });
    const guess = await setUp('new.pastor@futures.church');
    for (const r of [none, blank, guess]) {
      expect(r.status).toBe(403);
      expect(r.body.error).toMatch(REFUSED);
      expect(r.body.token).toBeUndefined();
    }
    expect(snapshot()).toEqual(before);
    expect(tables.staff_sessions).toHaveLength(0);
  });

  it('refuses a roster row with a password already set, whatever code is typed', async () => {
    addWithCode({ email: 'old.pastor@futures.church', password_hash: hashPassword(PASSWORD) });
    const before = snapshot();
    const r = await setUp('old.pastor@futures.church');
    expect(r.status).toBe(403);
    expect(snapshot()).toEqual(before);
    expect(tables.staff_sessions).toHaveLength(0);
  });

  it('refuses the named staff who have no roster row (Josh, hub), and creates no row', async () => {
    const before = await setUp('josh@futures.church');
    const none = await call({ action: 'set_password', email: 'josh@futures.church', password: PASSWORD });
    expect(before.status).toBe(403);
    expect(none.status).toBe(403);
    expect(tables.staff_roster).toHaveLength(0);
    expect(tables.staff_sessions).toHaveLength(0);
  });

  it('refuses Ashley\'s own address when there is no row and no code', async () => {
    const r = await call({ action: 'set_password', email: 'ae@futures.global', password: PASSWORD });
    expect(r.status).toBe(403);
    expect(tables.staff_roster).toHaveLength(0);
  });

  // Changed on purpose (Daily Word hardening F2, 1 Oct): a miss is now a row in
  // rate_limit_hits (intake-setup-miss:<email>), not a setup_code_attempts count,
  // and five misses lock the address for 15 minutes instead of burning the code.
  const missRows = (email = 'new.pastor@futures.church') =>
    (tables.rate_limit_hits || []).filter((r) => r.key === `intake-setup-miss:${email}`);

  it('refuses a WRONG code, counts the miss, and does not touch the password', async () => {
    addWithCode({ email: 'new.pastor@futures.church' });
    const r = await setUp('new.pastor@futures.church', { setupCode: 'AAAAA-AAAAA' });
    expect(r.status).toBe(403);
    expect(tables.staff_roster[0].password_hash).toBeNull();
    expect(missRows()).toHaveLength(1);
    expect(tables.staff_sessions).toHaveLength(0);
  });

  it('locks the address after five wrong guesses, without burning the code: it works again once the lock passes', async () => {
    vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-10-02T09:00:00Z') });
    try {
      addWithCode({ email: 'new.pastor@futures.church', campus_id: 'us-gwinnett', campus_set_by: 'admin' });
      for (let i = 0; i < 5; i++) {
        expect((await setUp('new.pastor@futures.church', { setupCode: `BBBBB-BBBB${i}` })).status).toBe(403);
      }
      // a stranger's five guesses do not destroy the pastor's code ...
      expect(tables.staff_roster[0].setup_code_hash).toBeTruthy();
      // ... but even the right code waits out the lock
      const locked = await setUp('new.pastor@futures.church');
      expect(locked.status).toBe(429);
      expect(tables.staff_roster[0].password_hash).toBeNull();
      expect(tables.staff_sessions).toHaveLength(0);

      vi.setSystemTime(new Date('2026-10-02T09:16:00Z'));
      const later = await setUp('new.pastor@futures.church');
      expect(later.status).toBe(200);
      expect(tables.staff_roster[0].password_hash).toBeTruthy();
      expect(tables.staff_roster[0].setup_code_hash).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('counts parallel wrong guesses one by one: five at once still lock the address', async () => {
    addWithCode({ email: 'new.pastor@futures.church' });
    const guesses = await Promise.all(
      Array.from({ length: 5 }, (_, i) => setUp('new.pastor@futures.church', { setupCode: `CCCCC-CCCC${i}` })),
    );
    expect(guesses.map((g) => g.status)).toEqual([403, 403, 403, 403, 403]);
    expect(missRows()).toHaveLength(5);
    const r = await setUp('new.pastor@futures.church');
    expect(r.status).toBe(429);
    expect(tables.staff_roster[0].password_hash).toBeNull();
  });

  it('twelve parallel guesses: no more than five are ever checked against the code', async () => {
    addWithCode({ email: 'new.pastor@futures.church' });
    const guesses = await Promise.all(
      Array.from({ length: 12 }, (_, i) => setUp('new.pastor@futures.church', { setupCode: `DDDDD-DDD${String(i).padStart(2, '2')}` })),
    );
    expect(guesses.filter((g) => g.status === 403).length).toBeLessThanOrEqual(5);
    expect(guesses.filter((g) => g.status === 429).length).toBeGreaterThanOrEqual(7);
  });

  it('fails closed: when the attempt cannot be recorded, even the right code is refused', async () => {
    addWithCode({ email: 'new.pastor@futures.church', campus_id: 'us-gwinnett', campus_set_by: 'admin' });
    failOn.add('rate_limit_hits:insert');
    const r = await setUp('new.pastor@futures.church');
    expect(r.status).toBe(503);
    expect(tables.staff_roster[0].password_hash).toBeNull();
    expect(tables.staff_roster[0].setup_code_hash).toBeTruthy();
    expect(tables.staff_sessions).toHaveLength(0);
  });

  // Daily Word hardening round 4 (F2): the lock is per caller IP for an address,
  // with a loose address-wide ceiling, and a locked caller writes nothing.
  const fromIp = (ip) => ({ 'x-forwarded-for': ip });

  it('a stranger locked on IP A does not lock out the owner: the right code works from IP B', async () => {
    addWithCode({ email: 'new.pastor@futures.church', campus_id: 'us-gwinnett', campus_set_by: 'admin' });
    const A = '198.51.100.10';
    for (let i = 0; i < 5; i++) {
      expect((await call({ action: 'set_password', email: 'new.pastor@futures.church', password: PASSWORD, setupCode: `EEEEE-EEEE${i}` }, null, fromIp(A))).status).toBe(403);
    }
    // IP A is locked, even with the right code
    expect((await call({ action: 'set_password', email: 'new.pastor@futures.church', password: PASSWORD, setupCode: CODE }, null, fromIp(A))).status).toBe(429);
    // the owner on their own connection is not
    const owner = await call({ action: 'set_password', email: 'new.pastor@futures.church', password: PASSWORD, setupCode: CODE }, null, fromIp('198.51.100.11'));
    expect(owner.status).toBe(200);
    expect(tables.staff_roster[0].password_hash).toBeTruthy();
    // a successful claim clears every miss row for the address, per IP and address-wide
    expect((tables.rate_limit_hits || []).filter((r) => r.key.startsWith('intake-setup-miss:new.pastor@futures.church'))).toHaveLength(0);
  });

  it('a locked caller writes nothing more, so retrying cannot keep the window open', async () => {
    vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-10-02T09:00:00Z') });
    try {
      addWithCode({ email: 'new.pastor@futures.church', campus_id: 'us-gwinnett', campus_set_by: 'admin' });
      const A = '198.51.100.12';
      for (let i = 0; i < 5; i++) await call({ action: 'set_password', email: 'new.pastor@futures.church', password: PASSWORD, setupCode: `FFFFF-FFFF${i}` }, null, fromIp(A));
      const rows = (tables.rate_limit_hits || []).length;
      for (let i = 0; i < 20; i++) {
        vi.setSystemTime(new Date(Date.parse('2026-10-02T09:00:00Z') + (i + 1) * 30e3));
        expect((await call({ action: 'set_password', email: 'new.pastor@futures.church', password: PASSWORD, setupCode: 'GGGGG-GGGGG' }, null, fromIp(A))).status).toBe(429);
      }
      expect((tables.rate_limit_hits || []).length).toBe(rows);
      // fifteen minutes after the last recorded miss, IP A gets its guesses back
      vi.setSystemTime(new Date('2026-10-02T09:16:00Z'));
      expect((await call({ action: 'set_password', email: 'new.pastor@futures.church', password: PASSWORD, setupCode: CODE }, null, fromIp(A))).status).toBe(200);
    } finally {
      vi.useRealTimers();
    }
  });

  it('parallel guesses from many IPs cannot pass the address-wide ceiling of 50 in 15 minutes', async () => {
    addWithCode({ email: 'new.pastor@futures.church' });
    const at = new Date().toISOString();
    for (let i = 0; i < 48; i++) tables.rate_limit_hits = [...(tables.rate_limit_hits || []), { key: 'intake-setup-miss:new.pastor@futures.church', created_at: at }];
    const guesses = await Promise.all(
      Array.from({ length: 6 }, (_, i) => call({ action: 'set_password', email: 'new.pastor@futures.church', password: PASSWORD, setupCode: `HHHHH-HHHH${i}` }, null, fromIp(`198.51.100.${30 + i}`))),
    );
    expect(guesses.filter((g) => g.status === 403).length).toBeLessThanOrEqual(2);
    expect(guesses.filter((g) => g.status === 429).length).toBeGreaterThanOrEqual(4);
    // once at the ceiling, even the right code from a fresh IP waits
    expect((await call({ action: 'set_password', email: 'new.pastor@futures.church', password: PASSWORD, setupCode: CODE }, null, fromIp('198.51.100.99'))).status).toBe(429);
  });

  it('a reissued code clears the address\'s miss rows and no other address\'s ("_" is not a wildcard)', async () => {
    const admin = await adminToken();
    addRoster({ email: 'new_pastor@futures.church' });
    const at = new Date().toISOString();
    tables.rate_limit_hits = [
      { key: 'intake-setup-miss:new_pastor@futures.church', created_at: at },
      { key: 'intake-setup-miss:new_pastor@futures.church:198.51.100.40', created_at: at },
      { key: 'intake-setup-miss:newXpastor@futures.church', created_at: at },
    ];
    expect((await call({ action: 'roster_issue_code', email: 'new_pastor@futures.church' }, admin)).status).toBe(200);
    expect(tables.rate_limit_hits.map((r) => r.key)).toEqual(['intake-setup-miss:newXpastor@futures.church']);
  });

  it('refuses an EXPIRED code', async () => {
    addWithCode({ email: 'new.pastor@futures.church' }, { expiresInMs: -1000 });
    const r = await setUp('new.pastor@futures.church');
    expect(r.status).toBe(403);
    expect(tables.staff_roster[0].password_hash).toBeNull();
    expect(tables.staff_sessions).toHaveLength(0);
  });

  it('accepts the RIGHT code once: signs in, stores a hash, spends the code', async () => {
    addWithCode({ email: 'new.pastor@futures.church', role: 'campus', campus_id: 'us-gwinnett', campus_set_by: 'admin' });
    const first = await setUp('new.pastor@futures.church');
    expect(first.status).toBe(200);
    expect(typeof first.body.token).toBe('string');
    expect(first.body.staff).toMatchObject({ email: 'new.pastor@futures.church', role: 'campus' });
    const row = tables.staff_roster[0];
    expect(row.password_hash).toBeTruthy();
    expect(row.password_hash).not.toContain(PASSWORD);
    expect(row.setup_code_hash).toBeNull();
    expect(row.setup_code_expires_at).toBeNull();
    // the new password signs in
    expect((await call({ action: 'login', email: 'new.pastor@futures.church', password: PASSWORD })).status).toBe(200);
    // the same code again is refused, and so is a fresh attempt to overwrite the password
    const again = await setUp('new.pastor@futures.church', { password: 'a-different-passphrase-7' });
    expect(again.status).toBe(403);
    expect((await call({ action: 'login', email: 'new.pastor@futures.church', password: PASSWORD })).status).toBe(200);
  });

  it('takes the code however it is typed: lower case, spaces, no dash', async () => {
    addWithCode({ email: 'new.pastor@futures.church', campus_id: 'us-gwinnett', campus_set_by: 'admin' });
    const r = await setUp('new.pastor@futures.church', { setupCode: ' k7m2q 9xwrt ' });
    expect(r.status).toBe(200);
  });

  it('a short password is refused before the code is spent', async () => {
    addWithCode({ email: 'new.pastor@futures.church' });
    const r = await setUp('new.pastor@futures.church', { password: 'short' });
    expect(r.status).toBe(400);
    expect(tables.staff_roster[0].setup_code_hash).toBeTruthy();
    expect((tables.rate_limit_hits || []).filter((r) => r.key.startsWith('intake-setup-miss:'))).toHaveLength(0);
  });

  it('two set_password calls racing on one row with the right code: exactly one wins', async () => {
    addWithCode({ email: 'new.pastor@futures.church', campus_id: 'us-gwinnett', campus_set_by: 'admin' });
    const results = await Promise.all([
      setUp('new.pastor@futures.church', { password: 'first-racer-passphrase-1' }),
      setUp('new.pastor@futures.church', { password: 'second-racer-passphrase-2' }),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual([200, 403]);
    expect(tables.staff_sessions).toHaveLength(1);
    const winner = results.find((r) => r.status === 200);
    const winnerPassword = winner === results[0] ? 'first-racer-passphrase-1' : 'second-racer-passphrase-2';
    const loserPassword = winner === results[0] ? 'second-racer-passphrase-2' : 'first-racer-passphrase-1';
    expect((await call({ action: 'login', email: 'new.pastor@futures.church', password: winnerPassword })).status).toBe(200);
    expect((await call({ action: 'login', email: 'new.pastor@futures.church', password: loserPassword })).status).toBe(403);
  });

  it('two racing claims on a row with no password and NO code: both refused', async () => {
    addRoster({ email: 'new.pastor@futures.church' });
    const results = await Promise.all([
      call({ action: 'set_password', email: 'new.pastor@futures.church', password: 'first-racer-passphrase-1' }),
      call({ action: 'set_password', email: 'new.pastor@futures.church', password: 'second-racer-passphrase-2' }),
    ]);
    expect(results.map((r) => r.status)).toEqual([403, 403]);
    expect(tables.staff_roster[0].password_hash).toBeNull();
    expect(tables.staff_sessions).toHaveLength(0);
  });
});

describe('auth_status and login do not list the accounts waiting to be claimed', () => {
  it('auth_status says setup:true only for a person holding a live code', async () => {
    addWithCode({ email: 'live.code@futures.church' });
    addWithCode({ email: 'stale.code@futures.church' }, { expiresInMs: -1000 });
    addRoster({ email: 'no.code@futures.church' });
    addWithCode({ email: 'done@futures.church', password_hash: hashPassword(PASSWORD) });
    const status = async (email) => (await call({ action: 'auth_status', email })).body;
    expect(await status('live.code@futures.church')).toEqual({ setup: true });
    expect(await status('stale.code@futures.church')).toEqual({ setup: false });
    expect(await status('no.code@futures.church')).toEqual({ setup: false });
    expect(await status('done@futures.church')).toEqual({ setup: false });
    expect(await status('josh@futures.church')).toEqual({ setup: false });
    expect(await status('nobody123@futures.church')).toEqual({ setup: false });
  });

  it('login for an unclaimed row gets the same plain refusal as an unknown address', async () => {
    addRoster({ email: 'new.pastor@futures.church' });
    const r = await call({ action: 'login', email: 'new.pastor@futures.church', password: PASSWORD });
    const unknown = await call({ action: 'login', email: 'nobody123@futures.church', password: PASSWORD });
    expect(r.status).toBe(403);
    expect(r.body).toEqual(unknown.body);
    expect('setup' in r.body).toBe(false);
  });
});

describe('Ashley issues the codes', () => {
  it('adding a person returns a one-time code, stores only a hash, and the person can use it once', async () => {
    const admin = await adminToken();
    const r = await call({ action: 'roster_save', email: 'New.Pastor@futures.church', role: 'campus', campusId: 'us-gwinnett', name: 'New Pastor' }, admin);
    expect(r.status).toBe(200);
    expect(r.body.person).toMatchObject({ email: 'new.pastor@futures.church', role: 'campus', campus_id: 'us-gwinnett' });
    expect(r.body.person.password_hash).toBeUndefined();
    expect(r.body.setupCode).toMatch(/^[A-Z2-9]{5}-[A-Z2-9]{5}$/);
    expect(new Date(r.body.setupCodeExpiresAt).getTime()).toBeGreaterThan(Date.now() + 71 * HOUR);
    const row = tables.staff_roster.find((x) => x.email === 'new.pastor@futures.church');
    expect(JSON.stringify(row)).not.toContain(r.body.setupCode);
    expect((await call({ action: 'auth_status', email: 'new.pastor@futures.church' })).body).toEqual({ setup: true });

    const claimed = await call({ action: 'set_password', email: 'new.pastor@futures.church', password: PASSWORD, setupCode: r.body.setupCode });
    expect(claimed.status).toBe(200);
    expect((await call({ action: 'set_password', email: 'new.pastor@futures.church', password: PASSWORD, setupCode: r.body.setupCode })).status).toBe(403);
  });

  it('adding a named person (Josh) is what lets him in: the code works, the role is hub', async () => {
    const admin = await adminToken();
    const r = await call({ action: 'roster_save', email: 'josh@futures.church', role: 'hub' }, admin);
    const claimed = await call({ action: 'set_password', email: 'josh@futures.church', password: PASSWORD, setupCode: r.body.setupCode });
    expect(claimed.status).toBe(200);
    expect(claimed.body.staff).toMatchObject({ role: 'hub', name: 'Josh Greenwood' });
  });

  it('saving someone who already has a password issues no code and changes nothing about their sign-in', async () => {
    const admin = await adminToken();
    addRoster({ email: 'old.pastor@futures.church', campus_id: 'us-gwinnett', campus_set_by: 'admin', password_hash: hashPassword(PASSWORD) });
    const r = await call({ action: 'roster_save', email: 'old.pastor@futures.church', role: 'campus', campusId: 'us-kennesaw' }, admin);
    expect(r.status).toBe(200);
    expect(r.body.setupCode).toBeUndefined();
    expect((await call({ action: 'login', email: 'old.pastor@futures.church', password: PASSWORD })).status).toBe(200);
  });

  it('a reissued code replaces the old one', async () => {
    const admin = await adminToken();
    const first = await call({ action: 'roster_save', email: 'new.pastor@futures.church', role: 'campus' }, admin);
    const second = await call({ action: 'roster_issue_code', email: 'new.pastor@futures.church' }, admin);
    expect(second.status).toBe(200);
    expect(second.body.setupCode).not.toBe(first.body.setupCode);
    expect((await call({ action: 'set_password', email: 'new.pastor@futures.church', password: PASSWORD, setupCode: first.body.setupCode })).status).toBe(403);
    expect((await call({ action: 'set_password', email: 'new.pastor@futures.church', password: PASSWORD, setupCode: second.body.setupCode })).status).toBe(200);
  });

  it('roster_issue_code refuses someone not on the roster and someone who already has a password', async () => {
    const admin = await adminToken();
    addRoster({ email: 'old.pastor@futures.church', password_hash: hashPassword(PASSWORD) });
    expect((await call({ action: 'roster_issue_code', email: 'nobody123@futures.church' }, admin)).status).toBe(404);
    expect((await call({ action: 'roster_issue_code', email: 'old.pastor@futures.church' }, admin)).status).toBe(400);
  });

  it('only Ashley can add people or issue codes', async () => {
    addRoster({ email: 'set.pastor@futures.church', campus_id: 'us-gwinnett', campus_set_by: 'admin', password_hash: hashPassword(PASSWORD) });
    const pastor = await signIn('set.pastor@futures.church');
    expect((await call({ action: 'roster_save', email: 'x.y@futures.church', role: 'hub' }, pastor)).status).toBe(403);
    expect((await call({ action: 'roster_issue_code', email: 'set.pastor@futures.church' }, pastor)).status).toBe(403);
    expect((await call({ action: 'roster_clear_password', email: 'set.pastor@futures.church' }, pastor)).status).toBe(403);
    expect(tables.staff_roster.some((x) => x.email === 'x.y@futures.church')).toBe(false);
  });

  it('roster_list shows whether a code is waiting, never the code or its hash', async () => {
    const admin = await adminToken();
    const r = await call({ action: 'roster_save', email: 'new.pastor@futures.church', role: 'campus' }, admin);
    const list = await call({ action: 'roster_list' }, admin);
    const row = list.body.roster.find((x) => x.email === 'new.pastor@futures.church');
    expect(row).toMatchObject({ has_password: false, code_live: true });
    expect(JSON.stringify(list.body)).not.toContain(r.body.setupCode);
    expect(JSON.stringify(list.body)).not.toContain('setup_code_hash');
  });

  it('resetting a password does not leave the row open: it ends sessions and waits for a new code', async () => {
    const admin = await adminToken();
    addRoster({ email: 'set.pastor@futures.church', campus_id: 'us-gwinnett', campus_set_by: 'admin', password_hash: hashPassword(PASSWORD) });
    const pastorToken = await signIn('set.pastor@futures.church');
    const reset = await call({ action: 'roster_clear_password', email: 'set.pastor@futures.church' }, admin);
    expect(reset.status).toBe(200);
    expect(reset.body.setupCode).toMatch(/^[A-Z2-9]{5}-[A-Z2-9]{5}$/);
    // old session is dead, old password is dead
    expect((await call({ action: 'me' }, pastorToken)).status).toBe(401);
    expect((await call({ action: 'login', email: 'set.pastor@futures.church', password: PASSWORD })).status).toBe(403);
    // a stranger typing the address first gets nothing
    const grab = await call({ action: 'set_password', email: 'set.pastor@futures.church', password: 'stranger-passphrase-99' });
    expect(grab.status).toBe(403);
    expect((await call({ action: 'set_password', email: 'set.pastor@futures.church', password: 'stranger-passphrase-99', setupCode: 'AAAAA-AAAAA' })).status).toBe(403);
    expect(tables.staff_roster.find((x) => x.email === 'set.pastor@futures.church').password_hash).toBeNull();
    // the person holding the new code gets in
    const back = await call({ action: 'set_password', email: 'set.pastor@futures.church', password: 'fresh-passphrase-1234', setupCode: reset.body.setupCode });
    expect(back.status).toBe(200);
  });

  it('removing someone ends their sessions at once', async () => {
    const admin = await adminToken();
    addRoster({ email: 'set.pastor@futures.church', campus_id: 'us-gwinnett', campus_set_by: 'admin', password_hash: hashPassword(PASSWORD) });
    const pastorToken = await signIn('set.pastor@futures.church');
    expect((await call({ action: 'roster_delete', email: 'set.pastor@futures.church' }, admin)).status).toBe(200);
    expect((await call({ action: 'me' }, pastorToken)).status).toBe(401);
  });
});

describe('the sign-in rate limits key on an address the client cannot choose', () => {
  it('prefers Netlify\'s own connection address over a client-supplied x-forwarded-for', async () => {
    await call({ action: 'auth_status', email: 'a@futures.church' }, undefined, {
      'x-forwarded-for': '1.1.1.1, 203.0.113.9',
      'x-nf-client-connection-ip': '198.51.100.7',
    });
    expect(limiterIps).toEqual(['198.51.100.7']);
  });

  it('falls back to client-ip, then x-forwarded-for, when Netlify\'s header is absent', async () => {
    await call({ action: 'auth_status', email: 'a@futures.church' }, undefined, { 'client-ip': '192.0.2.5' });
    await call({ action: 'auth_status', email: 'a@futures.church' });
    expect(limiterIps).toEqual(['192.0.2.5', '203.0.113.9']);
  });
});

describe('a campus nobody has confirmed is held, not published', () => {
  it('holds a first-time pick: roster marked self, submission pending, nothing on the corner', async () => {
    addRoster({ email: 'new.pastor@futures.church', password_hash: hashPassword(PASSWORD) });
    const token = await signIn('new.pastor@futures.church');
    const r = await call({ action: 'submit', job: 'campus', campusId: 'us-kennesaw', answers: { q_campus: 'us-kennesaw', ...CORNER } }, token);
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ ok: true, pending: true, published: false, reason: 'campus_not_confirmed' });
    expect(tables.staff_roster[0]).toMatchObject({ campus_id: 'us-kennesaw', campus_set_by: 'self' });
    expect(tables.intake_submissions).toHaveLength(1);
    expect(tables.intake_submissions[0].status).toBe('pending');
    expect(tables.campus_content).toHaveLength(0);
  });

  it('holds a campus that is already marked self', async () => {
    addRoster({ email: 'self.pastor@futures.church', campus_id: 'us-gwinnett', campus_set_by: 'self', password_hash: hashPassword(PASSWORD) });
    const token = await signIn('self.pastor@futures.church');
    const r = await call({ action: 'submit', job: 'campus', answers: { q_campus: 'us-gwinnett', ...CORNER } }, token);
    expect(r.body).toMatchObject({ pending: true, published: false });
    expect(tables.campus_content).toHaveLength(0);
    expect(tables.intake_submissions[0].status).toBe('pending');
  });

  it('publishes straight away for a campus Ashley set', async () => {
    addRoster({ email: 'set.pastor@futures.church', campus_id: 'us-gwinnett', campus_set_by: 'admin', display_name: 'Set Pastor', password_hash: hashPassword(PASSWORD) });
    const token = await signIn('set.pastor@futures.church');
    const r = await call({ action: 'submit', job: 'campus', answers: { q_campus: 'us-gwinnett', ...CORNER } }, token);
    expect(r.status).toBe(200);
    expect(r.body.published).toBe(true);
    expect(r.body.pending).toBeUndefined();
    expect(tables.campus_content).toHaveLength(1);
    expect(tables.campus_content[0]).toMatchObject({ campus: 'us-gwinnett', title: 'Harvest night' });
    expect(tables.intake_submissions[0].status).toBe('approved');
  });

  it('publishes for a legacy campus (campus set, no marker)', async () => {
    addRoster({ email: 'legacy.pastor@futures.church', campus_id: 'us-gwinnett', campus_set_by: null, password_hash: hashPassword(PASSWORD) });
    const token = await signIn('legacy.pastor@futures.church');
    const r = await call({ action: 'submit', job: 'campus', answers: { q_campus: 'us-gwinnett', ...CORNER } }, token);
    expect(r.body.published).toBe(true);
    expect(tables.campus_content).toHaveLength(1);
  });

  it('keeps a confirmed campus pastor on their own campus when they name another', async () => {
    // lockCampus pins a campus role to their roster campus, so the request is
    // served for that campus and nothing is written to the one they named. (The
    // "You can only update your own campus" 403 in submit is unreachable.)
    addRoster({ email: 'set.pastor@futures.church', campus_id: 'us-gwinnett', campus_set_by: 'admin', password_hash: hashPassword(PASSWORD) });
    const token = await signIn('set.pastor@futures.church');
    const r = await call({ action: 'submit', job: 'campus', answers: { q_campus: 'us-kennesaw', ...CORNER } }, token);
    expect(r.status).toBe(200);
    expect(tables.campus_content).toHaveLength(1);
    expect(tables.campus_content[0].campus).toBe('us-gwinnett');
    expect(tables.campus_content.some((c) => c.campus === 'us-kennesaw')).toBe(false);
  });

  it('does not hold a hub submit', async () => {
    addRoster({ email: 'josh@futures.church', role: 'hub', password_hash: hashPassword(PASSWORD) });
    const token = await signIn('josh@futures.church');
    const r = await call({
      action: 'submit', job: 'hub', congregation: 'futures-us',
      answers: { q_hub_title: 'Grace Wins', q_hub_outline: 'Big idea: grace wins.\n1. Point one\nBody of point one.' },
    }, token);
    expect(r.status).toBe(200);
    expect(r.body.published).toBe(true);
    expect(r.body.pending).toBeUndefined();
    expect(tables.published_sermons).toHaveLength(1);
  });

  it('an admin approving a held item puts it on the corner under the pastor, not the reviewer', async () => {
    addRoster({ email: 'self.pastor@futures.church', campus_id: 'us-gwinnett', campus_set_by: 'self', display_name: 'Sam Pastor', password_hash: hashPassword(PASSWORD) });
    const pastor = await signIn('self.pastor@futures.church');
    const held = await call({ action: 'submit', job: 'campus', answers: { q_campus: 'us-gwinnett', ...CORNER } }, pastor);
    expect(held.body.pending).toBe(true);

    addRoster({ email: 'ae@futures.global', role: 'admin', display_name: 'Ashley Evans', password_hash: hashPassword(PASSWORD) });
    const admin = await signIn('ae@futures.global');
    const r = await call({ action: 'review', id: tables.intake_submissions[0].id, decision: 'approved' }, admin);
    expect(r.status).toBe(200);
    expect(tables.campus_content).toHaveLength(1);
    expect(tables.campus_content[0]).toMatchObject({ campus: 'us-gwinnett', author: 'Sam Pastor' });
    expect(tables.intake_submissions[0]).toMatchObject({ status: 'approved', reviewed_by: 'ae@futures.global' });
  });
});
