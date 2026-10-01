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
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
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
// `selectHook` (when set) runs after a maybeSingle() read has taken its rows and
// before they are returned, so a test can hold a read (its snapshot already
// taken, as under read-committed) while another request runs.
let selectHook = null;

function builder(table) {
  const state = { op: 'select', cols: null, filters: [], payload: null, opts: null, wantRows: false, count: false };
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
    select(cols, o) { if (state.op !== 'select') state.wantRows = true; else { state.cols = cols; if (o && o.count) state.count = true; } return b; },
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
    maybeSingle: async () => {
      const r = run()[0];
      const data = r ? { ...r } : null;
      if (selectHook) await selectHook({ table, cols: state.cols });
      return { data, error: null };
    },
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

beforeEach(() => { resetTables(); limiterIps = []; failOn.clear(); selectHook = null; });

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

  // Changed on purpose (email-a-code, 1 Oct): a row WITH a password may now be
  // reset by a live code (forgot password). Without a live code it is refused.
  it('refuses a roster row with a password already set and no live code, whatever code is typed', async () => {
    addRoster({ email: 'old.pastor@futures.church', password_hash: hashPassword(PASSWORD) });
    addWithCode({ email: 'stale.pastor@futures.church', password_hash: hashPassword(PASSWORD) }, { expiresInMs: -1000 });
    const before = snapshot();
    for (const email of ['old.pastor@futures.church', 'stale.pastor@futures.church']) {
      const r = await setUp(email);
      expect(r.status).toBe(403);
    }
    expect(snapshot()).toEqual(before);
    expect(tables.staff_sessions).toHaveLength(0);
    expect((await call({ action: 'login', email: 'old.pastor@futures.church', password: PASSWORD })).status).toBe(200);
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

  it('parallel guesses from IPs that have already missed cannot pass the address-wide ceiling of 50 in 15 minutes', async () => {
    addWithCode({ email: 'new.pastor@futures.church' });
    const at = new Date().toISOString();
    const push = (key) => { tables.rate_limit_hits = [...(tables.rate_limit_hits || []), { key, created_at: at }]; };
    for (let i = 0; i < 48; i++) push('intake-setup-miss:new.pastor@futures.church');
    // each of these six IPs has one miss of its own already, so the ceiling binds them
    for (let i = 0; i < 6; i++) push(`intake-setup-miss:new.pastor@futures.church:198.51.100.${30 + i}`);
    const guesses = await Promise.all(
      Array.from({ length: 6 }, (_, i) => call({ action: 'set_password', email: 'new.pastor@futures.church', password: PASSWORD, setupCode: `HHHHH-HHHH${i}` }, null, fromIp(`198.51.100.${30 + i}`))),
    );
    expect(guesses.filter((g) => g.status === 403).length).toBeLessThanOrEqual(2);
    expect(guesses.filter((g) => g.status === 429).length).toBeGreaterThanOrEqual(4);
    // once at the ceiling, a caller that has missed waits, even with the right code
    expect((await call({ action: 'set_password', email: 'new.pastor@futures.church', password: PASSWORD, setupCode: CODE }, null, fromIp('198.51.100.30'))).status).toBe(429);
    expect(tables.staff_roster[0].password_hash).toBeNull();
  });

  // Round 5: the per-IP key is an IPv6 caller's /64, and the address-wide ceiling
  // only binds a caller that has itself missed, so a flood from elsewhere never
  // keeps the owner's right code at 429 for the code's whole 72 hours.
  it('50 misses from 10 addresses in one IPv6 /64: the /64 is locked after five, and the owner on IPv4 still gets in', async () => {
    addWithCode({ email: 'new.pastor@futures.church', campus_id: 'us-gwinnett', campus_set_by: 'admin' });
    const statuses = [];
    for (let host = 1; host <= 10; host++) {
      for (let g = 0; g < 5; g++) {
        const r = await call({ action: 'set_password', email: 'new.pastor@futures.church', password: PASSWORD, setupCode: `JJJJJ-JJJ${host}${g}` }, null, { 'x-nf-client-connection-ip': `2001:db8:abcd:12::${host.toString(16)}` });
        statuses.push(r.status);
      }
    }
    // the /64 gets five checked guesses; the sixth and every one after is refused
    expect(statuses.slice(0, 5)).toEqual([403, 403, 403, 403, 403]);
    expect(statuses[5]).toBe(429);
    expect(statuses.slice(5).every((s) => s === 429)).toBe(true);
    // the refused guesses wrote nothing: one per-IP key for the whole /64
    const ipKeys = new Set((tables.rate_limit_hits || []).map((r) => r.key).filter((k) => k.startsWith('intake-setup-miss:new.pastor@futures.church:')));
    expect([...ipKeys]).toEqual(['intake-setup-miss:new.pastor@futures.church:2001:db8:abcd:12::/64']);
    // the owner, on their own IPv4 connection, with the right code
    const owner = await call({ action: 'set_password', email: 'new.pastor@futures.church', password: PASSWORD, setupCode: CODE }, null, { 'x-nf-client-connection-ip': '198.51.100.77' });
    expect(owner.status).toBe(200);
    expect(tables.staff_roster[0].password_hash).toBeTruthy();
  });

  it('50 misses from 10 IPv4 addresses do not refuse the owner\'s right code from a fresh connection', async () => {
    addWithCode({ email: 'new.pastor@futures.church', campus_id: 'us-gwinnett', campus_set_by: 'admin' });
    for (let host = 0; host < 10; host++) {
      for (let g = 0; g < 5; g++) {
        const r = await call({ action: 'set_password', email: 'new.pastor@futures.church', password: PASSWORD, setupCode: `KKKKK-KKK${host}${g}` }, null, fromIp(`203.0.113.${100 + host}`));
        expect(r.status).toBe(403);
      }
    }
    expect(missRows()).toHaveLength(50);
    // a stranger IP that has missed is now held by the address-wide ceiling ...
    expect((await call({ action: 'set_password', email: 'new.pastor@futures.church', password: PASSWORD, setupCode: CODE }, null, fromIp('203.0.113.100'))).status).toBe(429);
    // ... but the owner, with no misses of their own, gets the right code checked
    const owner = await call({ action: 'set_password', email: 'new.pastor@futures.church', password: PASSWORD, setupCode: CODE }, null, fromIp('198.51.100.78'));
    expect(owner.status).toBe(200);
    expect(tables.staff_roster[0].password_hash).toBeTruthy();
  }, 60_000);

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
    addWithCode({ email: 'short.code@futures.church' }, { expiresInMs: 20 * 60_000 });
    addRoster({ email: 'no.code@futures.church' });
    addWithCode({ email: 'done@futures.church', password_hash: hashPassword(PASSWORD) });
    const status = async (email) => (await call({ action: 'auth_status', email })).body;
    expect(await status('live.code@futures.church')).toEqual({ setup: true });
    expect(await status('stale.code@futures.church')).toEqual({ setup: false });
    expect(await status('short.code@futures.church')).toEqual({ setup: false });
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

// ── "Email me a code" (Ashley, 1 Oct 2026) ─────────────────────────────────
// A person on the roster emails a one-time code to their own roster address,
// then types it to choose a password: first time and forgot password alike.
// Resend is a stubbed fetch: nothing is ever sent.
describe('email_setup_code: a person on the roster emails themselves a code', () => {
  const resend = vi.fn();
  const SENT = { sent: true };
  const STAFF = 'new.pastor@futures.church';

  beforeEach(() => {
    process.env.RESEND_API_KEY = 're_test';
    resend.mockReset();
    resend.mockResolvedValue({ ok: true, status: 200, json: async () => ({ id: 'em_1' }) });
    vi.stubGlobal('fetch', resend);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
    delete process.env.RESEND_API_KEY;
  });

  const ask = (email, ip = '203.0.113.9', extra = {}) =>
    call({ action: 'email_setup_code', email, lang: 'en', ...extra }, null, { 'x-forwarded-for': ip });
  const askV6 = (email, ip, extra = {}) =>
    call({ action: 'email_setup_code', email, lang: 'en', ...extra }, null, { 'x-nf-client-connection-ip': ip });
  const mail = (i = resend.mock.calls.length - 1) => JSON.parse(resend.mock.calls[i][1].body);
  const mailedCode = (i) => mail(i).text.match(/[A-Z0-9]{5}-[A-Z0-9]{5}/)[0];
  const setWith = (email, setupCode, password = PASSWORD, ip = '203.0.113.9') =>
    call({ action: 'set_password', email, password, setupCode }, null, { 'x-forwarded-for': ip });
  const row = (email = STAFF) => tables.staff_roster.find((r) => r.email === email);
  const at = (iso) => vi.useFakeTimers({ toFake: ['Date'], now: new Date(iso) });
  const move = (iso) => vi.setSystemTime(new Date(iso));

  it('an eligible address gets exactly one email, to the roster address, whose code works once', async () => {
    addRoster({ email: STAFF, campus_id: 'us-gwinnett', campus_set_by: 'admin' });
    const r = await ask('  New.Pastor@Futures.Church ');
    expect(r.status).toBe(200);
    expect(r.body).toEqual(SENT);
    expect(resend).toHaveBeenCalledTimes(1);
    expect(resend.mock.calls[0][0]).toBe('https://api.resend.com/emails');
    const m = mail(0);
    expect(m.to).toEqual([STAFF]);
    expect(m.from).toMatch(/notes@futuresdailyword\.com/);
    expect(m.subject).toBe('Your Daily Word staff code');
    const code = mailedCode(0);
    // only a hash is stored, and it lives 30 minutes
    expect(row().setup_code_hash).toBeTruthy();
    expect(row().setup_code_hash).not.toContain(code);
    const ttl = Date.parse(row().setup_code_expires_at) - Date.now();
    expect(ttl).toBeGreaterThan(29 * 60_000);
    expect(ttl).toBeLessThanOrEqual(30 * 60_000);
    // the code sets the first password, once
    const first = await setWith(STAFF, code);
    expect(first.status).toBe(200);
    expect(typeof first.body.token).toBe('string');
    expect((await call({ action: 'login', email: STAFF, password: PASSWORD })).status).toBe(200);
    const again = await setWith(STAFF, code, 'another-passphrase-123');
    expect(again.status).toBe(403);
    expect((await call({ action: 'login', email: STAFF, password: PASSWORD })).status).toBe(200);
  });

  it('auth_status is not a roster oracle: after a code is emailed, an unclaimed roster row and a stranger both answer setup:false', async () => {
    addRoster({ email: STAFF });
    const STRANGER = 'nobody123@futures.church';
    expect((await ask(STAFF)).body).toEqual(SENT);
    expect((await ask(STRANGER, '198.51.100.77')).body).toEqual(SENT);
    expect(resend).toHaveBeenCalledTimes(1);
    expect(row().setup_code_hash).toBeTruthy(); // the roster row now holds an emailed code
    const status = async (email) => (await call({ action: 'auth_status', email })).body;
    expect(await status(STAFF)).toEqual({ setup: false });
    expect(await status(STRANGER)).toEqual({ setup: false });
    // the emailed code still works through the "I have a code" path
    expect((await setWith(STAFF, mailedCode(0))).status).toBe(200);
  });

  it('only the roster row\'s address is ever mailed, whatever else the request carries', async () => {
    addRoster({ email: STAFF });
    const r = await call({ action: 'email_setup_code', email: STAFF, to: 'attacker@example.com', recipient: 'attacker@example.com', lang: 'en' });
    expect(r.body).toEqual(SENT);
    expect(resend).toHaveBeenCalledTimes(1);
    expect(mail(0).to).toEqual([STAFF]);
  });

  it('an address not on the roster gets the same 200 body and no email, and nothing changes', async () => {
    addRoster({ email: STAFF });
    const eligible = await ask(STAFF);
    expect(eligible.status).toBe(200);
    expect(eligible.body).toEqual(SENT);
    expect(resend).toHaveBeenCalledTimes(1);
    resend.mockClear();
    const before = snapshot();
    for (const email of ['nobody123@futures.church', 'josh@futures.church', 'someone@gmail.com', 'ae@futures.global', 'hello@futures.church']) {
      const r = await ask(email, `198.51.100.${email.length}`);
      expect(r.status).toBe(eligible.status);
      expect(r.body).toEqual(eligible.body);
    }
    expect(resend).not.toHaveBeenCalled();
    expect(snapshot()).toEqual(before);
  });

  it('a provider failure answers the same 200 body and leaves the earlier code as it was', async () => {
    addWithCode({ email: STAFF }); // Ashley's code, 72 h
    const before = snapshot();
    resend.mockResolvedValue({ ok: false, status: 500, json: async () => ({}) });
    const failed = await ask(STAFF);
    expect(failed.status).toBe(200);
    expect(failed.body).toEqual(SENT);
    delete process.env.RESEND_API_KEY;
    const unconfigured = await ask(STAFF, '198.51.100.20');
    expect(unconfigured.body).toEqual(SENT);
    expect(snapshot()).toEqual(before);
    expect((await setWith(STAFF, CODE)).status).toBe(200);
  });

  it('a row that already has a password gets a code too (forgot password)', async () => {
    addRoster({ email: STAFF, password_hash: hashPassword(PASSWORD) });
    const r = await ask(STAFF);
    expect(r.body).toEqual(SENT);
    expect(resend).toHaveBeenCalledTimes(1);
    expect(row().setup_code_hash).toBeTruthy();
    // the password still works until the code is used
    expect((await call({ action: 'login', email: STAFF, password: PASSWORD })).status).toBe(200);
  });

  it('forgot password: the code resets it, the old password and every old session stop working, the new one works', async () => {
    addRoster({ email: STAFF, campus_id: 'us-gwinnett', campus_set_by: 'admin', password_hash: hashPassword(PASSWORD) });
    const phone = await signIn(STAFF);
    const laptop = await signIn(STAFF);
    addRoster({ email: 'other.pastor@futures.church', password_hash: hashPassword(PASSWORD) });
    const other = await signIn('other.pastor@futures.church');
    expect((await call({ action: 'me' }, phone)).status).toBe(200);

    await ask(STAFF);
    const NEW = 'brand-new-passphrase-42';
    const r = await setWith(STAFF, mailedCode(0), NEW);
    expect(r.status).toBe(200);
    expect(r.body.staff).toMatchObject({ email: STAFF });
    expect(row().setup_code_hash).toBeNull();
    // the old password and both old sessions are gone
    expect((await call({ action: 'login', email: STAFF, password: PASSWORD })).status).toBe(403);
    expect((await call({ action: 'me' }, phone)).status).toBe(401);
    expect((await call({ action: 'me' }, laptop)).status).toBe(401);
    // the new session and the new password work
    expect((await call({ action: 'me' }, r.body.token)).status).toBe(200);
    expect((await call({ action: 'login', email: STAFF, password: NEW })).status).toBe(200);
    // nobody else's session was touched
    expect((await call({ action: 'me' }, other)).status).toBe(200);
  });

  it('forgot password fails closed: if the old sessions cannot be ended, nothing changes', async () => {
    addRoster({ email: STAFF, password_hash: hashPassword(PASSWORD) });
    const phone = await signIn(STAFF);
    await ask(STAFF);
    const before = snapshot();
    failOn.add('staff_sessions:delete');
    const r = await setWith(STAFF, mailedCode(0), 'brand-new-passphrase-42');
    expect(r.status).toBe(503);
    expect(snapshot()).toEqual(before);
    failOn.clear();
    expect((await call({ action: 'me' }, phone)).status).toBe(200);
    expect((await call({ action: 'login', email: STAFF, password: PASSWORD })).status).toBe(200);
  });

  it('two racing resets with the same code: exactly one wins', async () => {
    addRoster({ email: STAFF, password_hash: hashPassword(PASSWORD) });
    await ask(STAFF);
    const code = mailedCode(0);
    const results = await Promise.all([
      setWith(STAFF, code, 'first-racer-passphrase-1'),
      setWith(STAFF, code, 'second-racer-passphrase-2'),
    ]);
    expect(results.map((x) => x.status).sort()).toEqual([200, 403]);
  });

  it('refuses wrong, expired and used codes with the same refusal, and the new wording', async () => {
    at('2026-10-02T09:00:00Z');
    addRoster({ email: STAFF, password_hash: hashPassword(PASSWORD) });
    await ask(STAFF);
    const code = mailedCode(0);
    const wrong = await setWith(STAFF, 'AAAAA-AAAAA');
    expect(wrong.status).toBe(403);
    expect(wrong.body.error).toBe('That code did not work. Check it, or email yourself a new one.');
    // 31 minutes later the right code has expired
    move('2026-10-02T09:31:00Z');
    const expired = await setWith(STAFF, code, 'brand-new-passphrase-42', '198.51.100.60');
    expect(expired.status).toBe(403);
    expect(expired.body).toEqual(wrong.body);
    expect((await call({ action: 'login', email: STAFF, password: PASSWORD })).status).toBe(200);
    // a fresh code works once, then it is used
    await ask(STAFF, '198.51.100.61');
    const fresh = mailedCode(1);
    expect((await setWith(STAFF, fresh, 'brand-new-passphrase-42', '198.51.100.61')).status).toBe(200);
    const used = await setWith(STAFF, fresh, 'third-passphrase-4242', '198.51.100.61');
    expect(used.status).toBe(403);
    expect(used.body).toEqual(wrong.body);
    expect((await call({ action: 'login', email: STAFF, password: 'brand-new-passphrase-42' })).status).toBe(200);
  });

  it('a new code replaces the earlier one', async () => {
    addRoster({ email: STAFF });
    await ask(STAFF);
    await ask(STAFF);
    expect(resend).toHaveBeenCalledTimes(2);
    expect((await setWith(STAFF, mailedCode(0))).status).toBe(403);
    expect((await setWith(STAFF, mailedCode(1))).status).toBe(200);
  });

  it('asking for a code does not wipe a guesser\'s lock', async () => {
    addRoster({ email: STAFF });
    await ask(STAFF, '198.51.100.70');
    for (let i = 0; i < 5; i++) expect((await setWith(STAFF, `MMMMM-MMMM${i}`, PASSWORD, '198.51.100.70')).status).toBe(403);
    await ask(STAFF, '198.51.100.70');
    expect((await setWith(STAFF, mailedCode(1), PASSWORD, '198.51.100.70')).status).toBe(429);
    // the owner on their own connection is not held
    expect((await setWith(STAFF, mailedCode(1), PASSWORD, '198.51.100.71')).status).toBe(200);
  });

  it('the guess lock looks the same for an address that is not on the roster', async () => {
    const statuses = async (email, ip) => {
      const out = [];
      for (let i = 0; i < 6; i++) out.push((await setWith(email, `NNNNN-NNNN${i}`, PASSWORD, ip)).status);
      return out;
    };
    addRoster({ email: STAFF });
    await ask(STAFF);
    const staff = await statuses(STAFF, '198.51.100.80');
    const stranger = await statuses('nobody123@futures.church', '198.51.100.81');
    expect(staff).toEqual([403, 403, 403, 403, 403, 429]);
    expect(stranger).toEqual(staff);
  });

  it('the email has no link of any kind, in any language', async () => {
    addRoster({ email: STAFF });
    const want = {
      en: 'Your Daily Word staff code',
      es: 'Tu código de equipo de Daily Word',
      pt: 'Seu código de equipe do Daily Word',
      id: 'Kode staf Daily Word Anda',
    };
    const langs = Object.keys(want);
    for (const [i, lang] of langs.entries()) {
      await ask(STAFF, `198.51.100.${90 + i}`, { lang });
      const m = mail(i);
      expect(m.subject).toBe(want[lang]);
      for (const part of [m.text, m.html]) {
        expect(part).not.toMatch(/https?:|www\.|:\/\/|href|<a[\s>]|\.com|\.church|\.global/i);
        expect(part).toContain(mailedCode(i));
        expect(part).toMatch(/30/);
      }
    }
    expect(mail(0).text).toContain('Type it in Daily Word or Sermon Prep to choose your password. It works once and expires in 30 minutes.');
    expect(mail(0).text).toContain("If you didn't ask for this, ignore this email. Nothing on your account has changed.");
  });

  it('Ashley\'s manual code still lasts 72 hours and works', async () => {
    at('2026-10-02T09:00:00Z');
    const admin = await adminToken();
    const r = await call({ action: 'roster_save', email: STAFF, role: 'campus', campusId: 'us-gwinnett' }, admin);
    expect(r.status).toBe(200);
    expect(Date.parse(r.body.setupCodeExpiresAt) - Date.now()).toBe(72 * HOUR);
    move('2026-10-04T09:00:00Z'); // two days later
    expect((await setWith(STAFF, r.body.setupCode)).status).toBe(200);
  });

  // ── limits ──
  it('rejects a malformed address before any limit or lookup', async () => {
    for (const email of ['', 'not-an-email', `${'a'.repeat(250)}@futures.church`]) {
      expect((await ask(email)).status).toBe(400);
    }
    expect(tables.rate_limit_hits || []).toHaveLength(0);
    expect(resend).not.toHaveBeenCalled();
  });

  it('per address and caller IP: 2 per 15 minutes, 5 per day', async () => {
    at('2026-10-02T09:00:00Z');
    addRoster({ email: STAFF });
    const s = async () => (await ask(STAFF)).status;
    expect([await s(), await s(), await s()]).toEqual([200, 200, 429]);
    move('2026-10-02T09:16:00Z');
    expect([await s(), await s(), await s()]).toEqual([200, 200, 429]);
    move('2026-10-02T09:32:00Z');
    expect([await s(), await s()]).toEqual([200, 429]);
    move('2026-10-02T09:48:00Z');
    expect(await s()).toBe(429);
    expect(resend).toHaveBeenCalledTimes(5);
    // another connection is not held by this one
    expect((await ask(STAFF, '198.51.100.5')).status).toBe(200);
    move('2026-10-03T09:01:00Z');
    expect(await s()).toBe(200);
  });

  it('per caller IP: 5 per 15 minutes and 20 per day, whatever the addresses', async () => {
    at('2026-10-02T09:00:00Z');
    let n = 0;
    const burst = async (k) => {
      const out = [];
      for (let i = 0; i < k; i++) out.push((await ask(`person${n++}@futures.church`)).status);
      return out;
    };
    expect(await burst(6)).toEqual([200, 200, 200, 200, 200, 429]);
    for (const t of ['09:16', '09:32', '09:48']) {
      move(`2026-10-02T${t}:00Z`);
      expect(await burst(5)).toEqual([200, 200, 200, 200, 200]);
    }
    move('2026-10-02T10:04:00Z');
    expect(await burst(1)).toEqual([429]);
    // the same limit binds an address that is on the roster
    addRoster({ email: STAFF });
    expect((await ask(STAFF)).status).toBe(429);
    expect(resend).not.toHaveBeenCalled();
    move('2026-10-03T10:05:00Z');
    expect((await ask(STAFF)).status).toBe(200);
  }, 30_000);

  const addressRows = (email = STAFF) => (tables.rate_limit_hits || []).filter((r) => r.key === `intake-email-code:${email}`).length;
  // Five codes from one IP in a day: 2 at hh:00, 2 at hh:16, 1 at hh:32 (inside the 2 / 15 min cap).
  const fiveFrom = async (ip, hh = '09') => {
    const out = [];
    for (const [mm, n] of [['00', 2], ['16', 2], ['32', 1]]) {
      move(`2026-10-02T${hh}:${mm}:00Z`);
      for (let k = 0; k < n; k++) out.push((await ask(STAFF, ip)).status);
    }
    return out;
  };

  it('address-wide: 12 a day, written and held only for a caller whose own IP already asked for it', async () => {
    at('2026-10-02T09:00:00Z');
    addRoster({ email: STAFF });
    // a caller's first request per IP never uses the address-wide budget
    expect((await ask(STAFF, '198.51.100.99')).status).toBe(200);
    expect(addressRows()).toBe(0);
    tables.rate_limit_hits = [];
    resend.mockClear();
    // three strangers at their full allowance: 4 rows each, 12 in all
    for (const ip of ['198.51.100.100', '198.51.100.101', '198.51.100.102']) {
      expect(await fiveFrom(ip)).toEqual([200, 200, 200, 200, 200]);
    }
    expect(addressRows()).toBe(12);
    // a fourth stranger's first code goes; their second is held by the backstop
    move('2026-10-02T09:40:00Z');
    expect((await ask(STAFF, '198.51.100.103')).status).toBe(200);
    expect((await ask(STAFF, '198.51.100.103')).status).toBe(429);
    // ... but the pastor on a fresh connection still gets their code
    const owner = await ask(STAFF, '192.0.2.44');
    expect(owner.status).toBe(200);
    expect(resend).toHaveBeenCalledTimes(17);
    expect((await setWith(STAFF, mailedCode(16), PASSWORD, '192.0.2.44')).status).toBe(200);
  }, 30_000);

  it('two stranger IPs each sending 5 a day leave the pastor all 5 of their own codes', async () => {
    at('2026-10-02T09:00:00Z');
    addRoster({ email: STAFF });
    expect(await fiveFrom('198.51.100.110', '09')).toEqual([200, 200, 200, 200, 200]);
    expect(await fiveFrom('198.51.100.111', '10')).toEqual([200, 200, 200, 200, 200]);
    expect(addressRows()).toBe(8);
    // the pastor, later the same day, on their own connection: all five go
    expect(await fiveFrom('192.0.2.44', '11')).toEqual([200, 200, 200, 200, 200]);
    expect(resend).toHaveBeenCalledTimes(15);
    // and the last one works
    expect((await setWith(STAFF, mailedCode(14), PASSWORD, '192.0.2.44')).status).toBe(200);
  }, 30_000);

  it('global: 100 an hour, everyone together', async () => {
    at('2026-10-02T09:00:00Z');
    addRoster({ email: STAFF });
    const created_at = new Date().toISOString();
    tables.rate_limit_hits = Array.from({ length: 99 }, () => ({ key: 'intake-email-code-all', created_at }));
    expect((await ask(STAFF, '198.51.100.120')).status).toBe(200);
    expect((await ask(STAFF, '198.51.100.121')).status).toBe(429);
    expect((await ask('nobody123@futures.church', '198.51.100.122')).status).toBe(429);
    expect(resend).toHaveBeenCalledTimes(1);
    move('2026-10-02T10:01:00Z');
    expect((await ask(STAFF, '198.51.100.123')).status).toBe(200);
  });

  it('a parallel burst from one caller cannot pass the limits', async () => {
    addRoster({ email: STAFF });
    const same = await Promise.all(Array.from({ length: 10 }, () => ask(STAFF)));
    const ok = same.filter((x) => x.status === 200).length;
    expect(ok).toBeLessThanOrEqual(2);
    expect(same.filter((x) => x.status === 429).length).toBeGreaterThanOrEqual(8);
    expect(resend.mock.calls.length).toBeLessThanOrEqual(2);
    const spread = await Promise.all(Array.from({ length: 12 }, (_, i) => ask(`burst${i}@futures.church`, '198.51.100.130')));
    expect(spread.filter((x) => x.status === 200).length).toBeLessThanOrEqual(5);
    expect(spread.filter((x) => x.status === 429).length).toBeGreaterThanOrEqual(7);
  });

  it('a parallel burst from many connections cannot pass the global cap', async () => {
    const created_at = new Date().toISOString();
    tables.rate_limit_hits = Array.from({ length: 95 }, () => ({ key: 'intake-email-code-all', created_at }));
    const burst = await Promise.all(Array.from({ length: 12 }, (_, i) => ask(`wide${i}@futures.church`, `192.0.2.${10 + i}`)));
    expect(burst.filter((x) => x.status === 200).length).toBeLessThanOrEqual(5);
    expect(burst.filter((x) => x.status === 429).length).toBeGreaterThanOrEqual(7);
    expect(burst.every((x) => x.status === 200 || x.status === 429)).toBe(true);
  });

  it('IPv6 addresses in one /64 share one limit', async () => {
    addRoster({ email: STAFF });
    // per address and caller: two hosts in the /64 use up the pair
    expect((await askV6(STAFF, '2001:db8:abcd:12::1')).status).toBe(200);
    expect((await askV6(STAFF, '2001:db8:abcd:12::2')).status).toBe(200);
    expect((await askV6(STAFF, '2001:db8:abcd:12:ffff::3')).status).toBe(429);
    // per caller: five hosts in the /64 use up its 15 minutes
    for (let h = 4; h <= 6; h++) expect((await askV6(`v6person${h}@futures.church`, `2001:db8:abcd:12::${h}`)).status).toBe(200);
    expect((await askV6('v6person7@futures.church', '2001:db8:abcd:12::7')).status).toBe(429);
    // another /64 is another caller
    expect((await askV6('v6person8@futures.church', '2001:db8:abcd:13::1')).status).toBe(200);
    const keys = new Set((tables.rate_limit_hits || []).map((r) => r.key));
    expect(keys.has('intake-email-code-ip:2001:db8:abcd:12::/64')).toBe(true);
    expect([...keys].some((k) => k.includes('2001:db8:abcd:12::1'))).toBe(false);
  });

  it('fails closed: a limiter that cannot write or count refuses with 503 and sends nothing', async () => {
    addRoster({ email: STAFF });
    failOn.add('rate_limit_hits:insert');
    expect((await ask(STAFF)).status).toBe(503);
    failOn.clear();
    failOn.add('rate_limit_hits:select');
    expect((await ask(STAFF)).status).toBe(503);
    expect(resend).not.toHaveBeenCalled();
    expect(row().setup_code_hash ?? null).toBeNull();
  });
});

describe('a sign-in with the old password racing a forgot-password reset', () => {
  const STAFF = 'racing.pastor@futures.church';
  const NEW = 'brand-new-passphrase-42';
  const reset = () => call({ action: 'set_password', email: STAFF, password: NEW, setupCode: CODE });
  const sessionsFor = () => tables.staff_sessions.filter((x) => x.email === STAFF);

  /** Hold the nth `select("password_hash")` read on staff_roster; resolves once it is held. */
  function holdPasswordRead(nth) {
    let release;
    const gate = new Promise((r) => { release = r; });
    let reached;
    const held = new Promise((r) => { reached = r; });
    let n = 0;
    selectHook = async ({ table, cols }) => {
      if (table === 'staff_roster' && cols === 'password_hash' && ++n === nth) { reached(); await gate; }
    };
    return { held, release: () => release() };
  }

  it('P2: login read the old hash, the reset finished, then login issued its session: the session is taken back', async () => {
    addWithCode({ email: STAFF, password_hash: hashPassword(PASSWORD) });
    const hold = holdPasswordRead(1); // login's first read of the hash
    const login = call({ action: 'login', email: STAFF, password: PASSWORD });
    await hold.held;
    const r = await reset();
    expect(r.status).toBe(200);
    hold.release();
    const l = await login;
    expect(l.status).toBe(403);
    expect(l.body).toEqual({ error: 'Invalid email or password' });
    // only the reset's own session is left
    expect(sessionsFor()).toHaveLength(1);
    expect((await call({ action: 'me' }, r.body.token)).status).toBe(200);
  });

  it('P2b: login\'s re-read came before the reset\'s update: the reset\'s second sweep ends the session', async () => {
    addWithCode({ email: STAFF, password_hash: hashPassword(PASSWORD) });
    const hold = holdPasswordRead(2); // login's re-read, after its session is inserted
    const login = call({ action: 'login', email: STAFF, password: PASSWORD });
    await hold.held;
    const r = await reset();
    expect(r.status).toBe(200);
    hold.release();
    const l = await login;
    // whatever login answered, its token does not work
    if (l.body.token) expect((await call({ action: 'me' }, l.body.token)).status).toBe(401);
    expect(sessionsFor()).toHaveLength(1);
    expect((await call({ action: 'login', email: STAFF, password: PASSWORD })).status).toBe(403);
  });
});
