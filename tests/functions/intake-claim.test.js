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
    // jsonb filter values arrive as JSON strings (lib/auth.js's CAS on session_token_hashes).
    if (f.op === 'eq') return typeof f.val === 'string' && row[f.col] !== null && typeof row[f.col] === 'object' ? JSON.stringify(row[f.col]) === f.val : row[f.col] === f.val;
    if (f.op === 'in') return f.val.includes(row[f.col]);
    if (f.op === 'neq') return row[f.col] !== f.val;
    if (f.op === 'lt') return row[f.col] < f.val;
    if (f.op === 'is') return (row[f.col] ?? null) === f.val;
    if (f.op === 'gte') return row[f.col] != null && row[f.col] >= f.val;
    // PostgREST or=(col.op.val,...): only the is/lt/eq forms this repo sends.
    if (f.op === 'or') return f.val.split(',').some((part) => {
      const [col, op, ...rest] = part.split('.');
      const val = rest.join('.');
      return matches(row, [{ op, col, val: op === 'is' && val === 'null' ? null : val }]);
    });
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
// Every update payload, in order, so a test can assert exactly which columns a write touched.
let updateLog = [];
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
    update(p) { state.op = 'update'; state.payload = p; updateLog.push({ table, payload: p }); return b; },
    upsert(p, o) { state.op = 'upsert'; state.payload = p; state.opts = o; return b; },
    delete() { state.op = 'delete'; return b; },
    eq(col, val) { state.filters.push({ op: 'eq', col, val }); return b; },
    neq(col, val) { state.filters.push({ op: 'neq', col, val }); return b; },
    in(col, val) { state.filters.push({ op: 'in', col, val }); return b; },
    lt(col, val) { state.filters.push({ op: 'lt', col, val }); return b; },
    or(val) { state.filters.push({ op: 'or', val }); return b; },
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

beforeEach(() => { resetTables(); limiterIps = []; failOn.clear(); selectHook = null; updateLog = []; });
// Password hashing here is synchronous and the fake database answers in
// microtasks, so without this the worker never turns its event loop for the
// whole file. Past 60 seconds vitest then fails the run with
// 'Timeout calling "onTaskUpdate"' although every test passed. One turn of the
// loop after each test lets the runner's messages through.
afterEach(() => new Promise((resolve) => setTimeout(resolve, 0)));

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
    // Ashley's code opens the code box until its very last minute (emailed codes live elsewhere)
    expect(await status('short.code@futures.church')).toEqual({ setup: true });
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

describe('home: what Staff home opens on (readiness 7 Oct 2026)', () => {
  it('refuses a caller with no session', async () => {
    expect((await call({ action: 'home' })).status).toBe(401);
  });

  it('a hub pastor hears whether Sunday notes are up, and their usual job from their OWN submissions only', async () => {
    addRoster({ email: 'hub.pastor@futures.church', role: 'hub', password_hash: hashPassword(PASSWORD) });
    const hub = await signIn('hub.pastor@futures.church');
    const at = new Date(Date.now() - 7 * 86400000).toISOString();
    tables.intake_submissions.push(
      { id: 's1', email: 'hub.pastor@futures.church', role: 'hub', answers: { q_hub_title: 'x' }, created_at: at },
      { id: 's2', email: 'someone.else@futures.church', role: 'campus', answers: { q_title: 'x' }, created_at: at },
    );
    const r = await call({ action: 'home', congregation: 'futures-us' }, hub);
    expect(r.status).toBe(200);
    expect(r.body.notes).toMatchObject({ congregation: 'futures-us', up: false });
    expect(r.body.notes.sunday).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(r.body.usualJob).toMatchObject({ job: 'hub', why: 'weekday' });
  });

  it('a campus pastor gets no notes status (not theirs to put up) and only campus as a usual job', async () => {
    addRoster({ email: 'set.pastor@futures.church', campus_id: 'us-gwinnett', campus_set_by: 'admin', password_hash: hashPassword(PASSWORD) });
    const pastor = await signIn('set.pastor@futures.church');
    tables.intake_submissions.push({ id: 's3', email: 'set.pastor@futures.church', role: 'campus', answers: { q_hub_title: 'x' }, created_at: new Date().toISOString() });
    const r = await call({ action: 'home' }, pastor);
    expect(r.status).toBe(200);
    expect(r.body.notes).toBeNull();
    expect(r.body.usualJob).toMatchObject({ job: 'campus' });
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

  // Readiness 7 Oct 2026: admin is a roster role, the roster row is the allow-list.
  async function secondAdmin(email = 'mark@futures.church') {
    addRoster({ email, role: 'admin', display_name: 'Mark', password_hash: hashPassword(PASSWORD) });
    return signIn(email);
  }

  it('an address outside futures.church can sign in once an admin adds it, and never before', async () => {
    const admin = await adminToken();
    expect((await call({ action: 'login', email: 'pastor@futuros.global', password: PASSWORD })).status).toBe(403);
    const r = await call({ action: 'roster_save', email: 'Pastor@Futuros.Global', role: 'campus', campusId: 'us-gwinnett' }, admin);
    expect(r.status).toBe(200);
    const claimed = await call({ action: 'set_password', email: 'pastor@futuros.global', password: PASSWORD, setupCode: r.body.setupCode });
    expect(claimed.status).toBe(200);
    expect(claimed.body.staff).toMatchObject({ email: 'pastor@futuros.global', role: 'campus' });
    expect((await call({ action: 'login', email: 'someone.else@futuros.global', password: PASSWORD })).status).toBe(403);
  });

  it('a shared inbox is never added', async () => {
    const admin = await adminToken();
    expect((await call({ action: 'roster_save', email: 'hello@futures.church', role: 'hub' }, admin)).status).toBe(400);
    expect(tables.staff_roster.some((x) => x.email === 'hello@futures.church')).toBe(false);
  });

  it('a second admin (a roster row with role admin) can add people and see People', async () => {
    const mark = await secondAdmin();
    expect((await call({ action: 'me' }, mark)).body.staff).toMatchObject({ role: 'admin', isAdmin: true });
    const r = await call({ action: 'roster_save', email: 'new.pastor@futures.church', role: 'campus', campusId: 'us-gwinnett' }, mark);
    expect(r.status).toBe(200);
    expect(r.body.setupCode).toMatch(/^[A-Z2-9]{5}-[A-Z2-9]{5}$/);
    expect((await call({ action: 'roster_list' }, mark)).status).toBe(200);
    expect((await call({ action: 'roster_issue_code', email: 'new.pastor@futures.church' }, mark)).status).toBe(200);
  });

  it('only the owner makes an admin; a second admin cannot promote anyone', async () => {
    const mark = await secondAdmin();
    const refused = await call({ action: 'roster_save', email: 'josh@futures.church', role: 'admin' }, mark);
    expect(refused.status).toBe(403);
    expect(tables.staff_roster.some((x) => x.email === 'josh@futures.church')).toBe(false);
    const admin = await adminToken();
    expect((await call({ action: 'roster_save', email: 'josh@futures.church', role: 'admin' }, admin)).status).toBe(200);
    expect(tables.staff_roster.find((x) => x.email === 'josh@futures.church').role).toBe('admin');
  });

  it('a second admin cannot demote, remove, reset or reissue a code for another admin or the owner', async () => {
    await adminToken();
    addRoster({ email: 'josh@futures.church', role: 'admin', password_hash: hashPassword(PASSWORD) });
    const mark = await secondAdmin();
    const before = snapshot();
    for (const email of ['josh@futures.church', 'ae@futures.global']) {
      expect((await call({ action: 'roster_save', email, role: 'hub' }, mark)).status).toBeGreaterThanOrEqual(400);
      expect((await call({ action: 'roster_clear_password', email }, mark)).status).toBeGreaterThanOrEqual(400);
      expect((await call({ action: 'roster_delete', email }, mark)).status).toBeGreaterThanOrEqual(400);
    }
    expect((await call({ action: 'roster_save', email: 'ae@futures.global', role: 'admin' }, mark)).status).toBe(403);
    expect(snapshot()).toEqual(before);
    expect((await call({ action: 'login', email: 'ae@futures.global', password: PASSWORD })).status).toBe(200);
  });

  it('a promotion that lands between a second admin\'s read and write wins: no reset, no code, no demotion', async () => {
    await adminToken();
    addRoster({ email: 'josh@futures.church', role: 'hub', password_hash: hashPassword(PASSWORD) });
    const mark = await secondAdmin();
    for (const [action, extra] of [['roster_clear_password', {}], ['roster_save', { role: 'media' }], ['roster_delete', {}]]) {
      tables.staff_roster.find((x) => x.email === 'josh@futures.church').role = 'hub';
      selectHook = async ({ table, cols }) => {
        if (table === 'staff_roster' && cols === 'email, role') tables.staff_roster.find((x) => x.email === 'josh@futures.church').role = 'admin';
      };
      const r = await call({ action, email: 'josh@futures.church', ...extra }, mark);
      selectHook = null;
      expect(r.status).toBe(409);
      expect(r.body.setupCode).toBeUndefined();
      const josh = tables.staff_roster.find((x) => x.email === 'josh@futures.church');
      expect(josh).toBeTruthy();
      expect(josh.role).toBe('admin');
      expect(josh.password_hash).toBeTruthy();
    }
  });

  it('the owner stays admin and on People, whoever asks', async () => {
    const admin = await adminToken();
    expect((await call({ action: 'roster_save', email: 'ae@futures.global', role: 'hub' }, admin)).status).toBe(400);
    expect((await call({ action: 'roster_delete', email: 'ae@futures.global' }, admin)).status).toBe(400);
    expect(tables.staff_roster.find((x) => x.email === 'ae@futures.global').role).toBe('admin');
  });

  it('the owner can still demote or remove another admin', async () => {
    const admin = await adminToken();
    addRoster({ email: 'josh@futures.church', role: 'admin', password_hash: hashPassword(PASSWORD) });
    expect((await call({ action: 'roster_save', email: 'josh@futures.church', role: 'hub' }, admin)).status).toBe(200);
    expect(tables.staff_roster.find((x) => x.email === 'josh@futures.church').role).toBe('hub');
    expect((await call({ action: 'roster_delete', email: 'josh@futures.church' }, admin)).status).toBe(200);
  });

  it('a second admin can edit Campuses (the admin gate, not the owner)', async () => {
    const mark = await secondAdmin();
    const r = await call({ action: 'campuses_list' }, mark);
    expect(r.status).not.toBe(403);
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
    addRoster({ email: 'set.pastor@futures.church', campus_id: 'us-gwinnett', campus_set_by: 'admin', password_hash: hashPassword(PASSWORD),
      email_code_hash: hashSetupCode('ZZZZZ-ZZZZZ'), email_code_expires_at: new Date(Date.now() + 20 * 60_000).toISOString() });
    const pastorToken = await signIn('set.pastor@futures.church');
    const reset = await call({ action: 'roster_clear_password', email: 'set.pastor@futures.church' }, admin);
    expect(reset.status).toBe(200);
    // starting over also voids a code they (or anyone) emailed before
    expect((await call({ action: 'set_password', email: 'set.pastor@futures.church', password: 'stranger-passphrase-99', setupCode: 'ZZZZZ-ZZZZZ' })).status).toBe(403);
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
    // only a hash is stored, in the emailed slot, and it lives 30 minutes
    expect(row().email_code_hash).toBeTruthy();
    expect(row().email_code_hash).not.toContain(code);
    expect(row().setup_code_hash ?? null).toBeNull();
    const ttl = Date.parse(row().email_code_expires_at) - Date.now();
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
    expect(row().email_code_hash).toBeTruthy(); // the roster row now holds an emailed code
    const status = async (email) => (await call({ action: 'auth_status', email })).body;
    expect(await status(STAFF)).toEqual({ setup: false });
    expect(await status(STRANGER)).toEqual({ setup: false });
    // the emailed code still works through the "I have a code" path
    expect((await setWith(STAFF, mailedCode(0))).status).toBe(200);
  });

  it('an emailed code never voids the code Ashley handed over: either one works, and using one spends both', async () => {
    addWithCode({ email: STAFF });
    expect((await ask(STAFF, '198.51.100.77')).body).toEqual(SENT); // a stranger asks for a code
    expect((await call({ action: 'auth_status', email: STAFF })).body).toEqual({ setup: true });
    expect(row().email_code_hash).toBeTruthy();
    // Ashley's code still works, and the emailed one is spent with it
    expect((await setWith(STAFF, CODE)).status).toBe(200);
    expect(row().setup_code_hash).toBeNull();
    expect(row().email_code_hash).toBeNull();
    expect((await setWith(STAFF, mailedCode(0), 'another-passphrase-123')).status).toBe(403);
  });

  it('the emailed code works beside Ashley\'s, and spends his too', async () => {
    addWithCode({ email: STAFF });
    expect((await ask(STAFF)).body).toEqual(SENT);
    expect((await setWith(STAFF, mailedCode(0))).status).toBe(200);
    expect(row().setup_code_hash).toBeNull();
    expect(row().email_code_hash).toBeNull();
    expect((await setWith(STAFF, CODE, 'another-passphrase-123')).status).toBe(403);
  });

  it('an expired emailed code is refused while Ashley\'s still works', async () => {
    addWithCode({ email: STAFF });
    expect((await ask(STAFF)).body).toEqual(SENT);
    tables.staff_roster[0].email_code_expires_at = new Date(Date.now() - 1000).toISOString();
    expect((await setWith(STAFF, mailedCode(0))).status).toBe(403);
    expect((await setWith(STAFF, CODE)).status).toBe(200);
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
    expect(row().email_code_hash).toBeTruthy();
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

describe('a change_password or sync_token from a stolen session racing a forgot-password reset', () => {
  const STAFF = 'held.pastor@futures.church';
  const OWNER_NEW = 'owners-own-new-passphrase-7';
  const ATTACKER = 'attackers-chosen-passphrase-3';
  const resend = vi.fn();
  const sessionsFor = () => tables.staff_sessions.filter((x) => x.email === STAFF);
  const rosterRow = () => tables.staff_roster.find((r) => r.email === STAFF);

  beforeEach(() => {
    process.env.RESEND_API_KEY = 're_test';
    resend.mockReset();
    resend.mockResolvedValue({ ok: true, status: 200, json: async () => ({ id: 'em_1' }) });
    vi.stubGlobal('fetch', resend);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.RESEND_API_KEY;
  });

  /** Hold the first read of `cols` on `table` (a maybeSingle); resolves once it is held. */
  function holdRead(table, cols) {
    let release;
    const gate = new Promise((r) => { release = r; });
    let reached;
    const held = new Promise((r) => { reached = r; });
    let done = false;
    selectHook = async (q) => {
      if (!done && q.table === table && q.cols === cols) { done = true; reached(); await gate; }
    };
    return { held, release: () => release() };
  }

  /** The owner emails themselves a code and resets the password with it. */
  async function ownerResets() {
    const asked = await call({ action: 'email_setup_code', email: STAFF, lang: 'en' });
    expect(asked.status).toBe(200);
    const mailed = JSON.parse(resend.mock.calls[resend.mock.calls.length - 1][1].body);
    const code = mailed.text.match(/[A-Z0-9]{5}-[A-Z0-9]{5}/)[0];
    const r = await call({ action: 'set_password', email: STAFF, password: OWNER_NEW, setupCode: code });
    expect(r.status).toBe(200);
    return r.body.token;
  }

  it('change_password read the old hash, then the owner reset it: the change is refused and the owner keeps the account', async () => {
    addRoster({ email: STAFF, campus_id: 'us-gwinnett', campus_set_by: 'admin', password_hash: hashPassword(PASSWORD) });
    const stolen = await signIn(STAFF);
    const hold = holdRead('staff_roster', 'password_hash'); // change_password's read of the hash
    const change = call({ action: 'change_password', currentPassword: PASSWORD, newPassword: ATTACKER }, stolen);
    await hold.held;
    const owner = await ownerResets();
    hold.release();
    const c = await change;
    expect(c.status).toBe(403);
    selectHook = null;
    // the owner's new password works, the attacker's does not, the old one does not
    expect((await call({ action: 'login', email: STAFF, password: OWNER_NEW })).status).toBe(200);
    expect((await call({ action: 'login', email: STAFF, password: ATTACKER })).status).toBe(403);
    expect((await call({ action: 'login', email: STAFF, password: PASSWORD })).status).toBe(403);
    // the owner's reset session is alive; the stolen one is not
    expect((await call({ action: 'me' }, owner)).status).toBe(200);
    expect((await call({ action: 'me' }, stolen)).status).toBe(401);
  });

  it('change_password wrote, but its own session had already been ended: the old hash is put back and the change refused', async () => {
    addRoster({ email: STAFF, password_hash: hashPassword(PASSWORD) });
    const before = rosterRow().password_hash;
    const stolen = await signIn(STAFF);
    const other = await signIn(STAFF);
    const hold = holdRead('staff_roster', 'password_hash');
    const change = call({ action: 'change_password', currentPassword: PASSWORD, newPassword: ATTACKER }, stolen);
    await hold.held;
    // a reset's first sweep: every session for the address ends (its UPDATE has not landed yet)
    tables.staff_sessions = tables.staff_sessions.filter((x) => x.email !== STAFF);
    hold.release();
    const c = await change;
    expect(c.status).toBe(403);
    selectHook = null;
    expect(rosterRow().password_hash).toBe(before);
    expect((await call({ action: 'login', email: STAFF, password: ATTACKER })).status).toBe(403);
    expect((await call({ action: 'me' }, other)).status).toBe(401);
  });

  it('a change with no race still works: new password in, every other session out, this one kept', async () => {
    addRoster({ email: STAFF, password_hash: hashPassword(PASSWORD) });
    const mine = await signIn(STAFF);
    const lost = await signIn(STAFF);
    const c = await call({ action: 'change_password', currentPassword: PASSWORD, newPassword: OWNER_NEW }, mine);
    expect(c.status).toBe(200);
    expect((await call({ action: 'me' }, mine)).status).toBe(200);
    expect((await call({ action: 'me' }, lost)).status).toBe(401);
    expect((await call({ action: 'login', email: STAFF, password: OWNER_NEW })).status).toBe(200);
    expect((await call({ action: 'login', email: STAFF, password: PASSWORD })).status).toBe(403);
  });

  it('sync_token minted from a session that a reset ended mid-request: the token is taken back and none is handed out', async () => {
    addRoster({ email: STAFF, password_hash: hashPassword(PASSWORD) });
    tables.profiles = [{ email: STAFF, session_token_hashes: [] }];
    const stolen = await signIn(STAFF);
    const hold = holdRead('profiles', 'email'); // sync_token's profile check, after the session check
    const sync = call({ action: 'sync_token' }, stolen);
    await hold.held;
    const owner = await ownerResets();
    hold.release();
    const s = await sync;
    expect(s.status).toBe(200);
    expect(s.body).toEqual({ token: null });
    selectHook = null;
    expect(tables.profiles[0].session_token_hashes).toEqual([]);
    expect((await call({ action: 'me' }, owner)).status).toBe(200);
    expect(sessionsFor()).toHaveLength(1);
  });

  it('sync_token with a live session still hands back a proven token', async () => {
    addRoster({ email: STAFF, password_hash: hashPassword(PASSWORD) });
    tables.profiles = [{ email: STAFF, session_token_hashes: [] }];
    const mine = await signIn(STAFF);
    const s = await call({ action: 'sync_token' }, mine);
    expect(s.status).toBe(200);
    expect(s.body.token).toMatch(/^[0-9a-f]{64}$/);
    expect(tables.profiles[0].session_token_hashes).toHaveLength(1);
  });
});

// ── The one campus list, kept by the owner in /staff (B09-02) ─────────────
describe('campuses: only an admin session edits the list', () => {
  const FALLBACK = require_('../../netlify/functions/lib/campuses.fallback.json');
  const { clearCampusCache } = require_('../../netlify/functions/lib/campuses.js');
  const MERIDA = { id: 've-futuros-merida', name: 'Futuros Mérida', city: 'Mérida, Venezuela', region: 'Venezuela', timeZone: 'America/Caracas', sundayUntil: '16:00', pcoNames: 'Futuros Merida', isNew: true };

  beforeEach(() => {
    clearCampusCache();
    tables.dw_campuses = FALLBACK.map((c) => ({
      id: c.id, name: c.name, city: c.city, region: c.region, congregation: c.congregation, time_zone: c.timeZone,
      sunday_until: '16:00:00', video_url: c.videoUrl, pco_names: c.pcoNames, sort_order: c.sortOrder, active: true, updated_by: null,
    }));
  });

  it('anon gets 401 on every campus action, and nothing changes', async () => {
    const before = JSON.stringify(tables.dw_campuses);
    for (const body of [{ action: 'campuses_list' }, { action: 'campus_save', campus: MERIDA }, { action: 'campus_move', id: 'br-rio', direction: 'up' }]) {
      expect((await call(body)).status).toBe(401);
    }
    expect(JSON.stringify(tables.dw_campuses)).toBe(before);
  });

  it('campus, hub and media staff get 403, and nothing changes', async () => {
    addRoster({ email: 'campus.tester@futures.church', role: 'campus', campus_id: 'us-gwinnett', campus_set_by: 'admin', password_hash: hashPassword(PASSWORD) });
    addRoster({ email: 'hub.tester@futures.church', role: 'hub', password_hash: hashPassword(PASSWORD) });
    addRoster({ email: 'media.tester@futures.church', role: 'media', password_hash: hashPassword(PASSWORD) });
    const before = JSON.stringify(tables.dw_campuses);
    for (const email of ['campus.tester@futures.church', 'hub.tester@futures.church', 'media.tester@futures.church']) {
      const token = await signIn(email);
      for (const body of [{ action: 'campuses_list' }, { action: 'campus_save', campus: MERIDA }, { action: 'campus_move', id: 'br-rio', direction: 'up' }]) {
        expect((await call(body, token)).status).toBe(403);
      }
    }
    expect(JSON.stringify(tables.dw_campuses)).toBe(before);
  });

  it('an admin save of a new campus appears in the public GET, stamped server-side', async () => {
    const admin = await adminToken();
    const r = await call({ action: 'campus_save', campus: MERIDA }, admin);
    expect(r.status).toBe(200);
    expect(r.body.isNew).toBe(true);
    const saved = tables.dw_campuses.find((c) => c.id === 've-futuros-merida');
    expect(saved).toMatchObject({ name: 'Futuros Mérida', time_zone: 'America/Caracas', pco_names: ['futuros merida'], active: true });
    expect(saved.updated_by).toBe('ae@futures.global');

    const { handler: campusesGet } = require_('../../netlify/functions/campuses.js');
    const res = await campusesGet({ httpMethod: 'GET', headers: {} });
    const listed = JSON.parse(res.body).campuses;
    expect(listed.map((c) => c.id)).toContain('ve-futuros-merida');
    expect(res.body).not.toContain('updated_by');

    const list = await call({ action: 'campuses_list' }, admin);
    expect(list.status).toBe(200);
    expect(list.body.campuses).toHaveLength(23);
  });

  it('an id change is refused with a reason, and so is taking a saved id', async () => {
    const admin = await adminToken();
    const rename = await call({ action: 'campus_save', campus: { ...MERIDA, id: 'us-gwinnett-new', name: 'Futures Gwinnett', isNew: false } }, admin);
    expect(rename.status).toBe(400);
    expect(rename.body.error).toBe('The id never changes once saved. Add a new campus instead.');
    const taken = await call({ action: 'campus_save', campus: { ...MERIDA, id: 'us-gwinnett' } }, admin);
    expect(taken.status).toBe(400);
    expect(taken.body.error).toMatch(/already taken/);
    expect(tables.dw_campuses).toHaveLength(22);
  });

  it('the error for an empty name says the fix', async () => {
    const admin = await adminToken();
    const r = await call({ action: 'campus_save', campus: { ...MERIDA, name: '' } }, admin);
    expect(r.status).toBe(400);
    expect(r.body.error).toBe('Add the campus name first.');
  });

  it('hiding keeps the row (never deleted) and takes it out of the public GET', async () => {
    const admin = await adminToken();
    const r = await call({ action: 'campus_save', campus: { id: 'br-rio', name: 'Futures Rio', city: 'Rio de Janeiro, Brazil', region: 'Brazil', timeZone: 'America/Sao_Paulo', active: false } }, admin);
    expect(r.status).toBe(200);
    expect(tables.dw_campuses.find((c) => c.id === 'br-rio').active).toBe(false);
    const { handler: campusesGet } = require_('../../netlify/functions/campuses.js');
    const listed = JSON.parse((await campusesGet({ httpMethod: 'GET', headers: {} })).body).campuses;
    expect(listed.map((c) => c.id)).not.toContain('br-rio');
    expect(listed).toHaveLength(21);
  });

  it('Move up swaps a campus with the one above it', async () => {
    const admin = await adminToken();
    const r = await call({ action: 'campus_move', id: 'au-adelaide-city', direction: 'up' }, admin);
    expect(r.status).toBe(200);
    const order = [...tables.dw_campuses].sort((a, b) => a.sort_order - b.sort_order).map((c) => c.id);
    expect(order.slice(0, 2)).toEqual(['au-adelaide-city', 'au-paradise']);
  });

  it('a campus the owner added is a campus for staff too (roster_save keeps it)', async () => {
    const admin = await adminToken();
    await call({ action: 'campus_save', campus: MERIDA }, admin);
    const r = await call({ action: 'roster_save', email: 'merida.pastor@futures.church', role: 'campus', campusId: 've-futuros-merida' }, admin);
    expect(r.status).toBe(200);
    expect(tables.staff_roster.find((p) => p.email === 'merida.pastor@futures.church').campus_id).toBe('ve-futuros-merida');
  });
});

describe('the staff answer names the campus from the one list (B08-06)', () => {
  const { clearCampusCache } = require_('../../netlify/functions/lib/campuses.js');
  // Fixture campuses only (a public repo): the answer must follow the table, not the code.
  const row = (id, name, congregation, sort_order) => ({
    id, name, city: '', region: 'Test', congregation, time_zone: 'UTC', sunday_until: '16:00:00',
    video_url: null, pco_names: [], sort_order, active: true,
  });

  beforeEach(() => {
    clearCampusCache();
    tables.dw_campuses = [row('zz-test-north', 'Test North', 'futures-au', 10), row('zz-test-south', 'Test South', null, 20)];
  });
  afterEach(() => { clearCampusCache(); });

  const pastor = (email, campus_id) => addRoster({ email, campus_id, campus_set_by: 'admin', password_hash: hashPassword(PASSWORD) });

  it('login and me both carry campusName and congregation from dw_campuses', async () => {
    pastor('north.pastor@futures.church', 'zz-test-north');
    const login = await call({ action: 'login', email: 'north.pastor@futures.church', password: PASSWORD });
    expect(login.status).toBe(200);
    expect(login.body.staff).toMatchObject({ campusId: 'zz-test-north', campusName: 'Test North', congregation: 'futures-au' });
    const me = await call({ action: 'me' }, login.body.token);
    expect(me.status).toBe(200);
    expect(me.body.staff).toMatchObject({ campusId: 'zz-test-north', campusName: 'Test North', congregation: 'futures-au' });
  });

  it('a renamed campus is named as the table has it, with no code change', async () => {
    pastor('north.pastor@futures.church', 'zz-test-north');
    const token = await signIn('north.pastor@futures.church');
    tables.dw_campuses[0].name = 'Test North Renamed';
    clearCampusCache();
    expect((await call({ action: 'me' }, token)).body.staff.campusName).toBe('Test North Renamed');
  });

  it('a campus with no congregation answers null; an id not on the list answers the id', async () => {
    pastor('south.pastor@futures.church', 'zz-test-south');
    pastor('gone.pastor@futures.church', 'zz-test-gone');
    const south = await call({ action: 'me' }, await signIn('south.pastor@futures.church'));
    expect(south.body.staff).toMatchObject({ campusName: 'Test South', congregation: null });
    const gone = await call({ action: 'me' }, await signIn('gone.pastor@futures.church'));
    expect(gone.body.staff).toMatchObject({ campusId: 'zz-test-gone', campusName: 'zz-test-gone', congregation: null });
  });

  it('staff with no campus get both keys as null, and nothing else changes', async () => {
    const me = await call({ action: 'me' }, await adminToken());
    expect(me.body.staff).toEqual({
      email: 'ae@futures.global', role: 'admin', campusId: null, campusName: null, congregation: null,
      name: 'Ashley Evans', isAdmin: true, campusPending: false,
    });
  });

  it('me still answers when the campus table cannot be read (the bundled list names it)', async () => {
    pastor('north.pastor@futures.church', 'us-gwinnett');
    const token = await signIn('north.pastor@futures.church');
    clearCampusCache();
    failOn.add('dw_campuses:select');
    const me = await call({ action: 'me' }, token);
    expect(me.status).toBe(200);
    expect(typeof me.body.staff.campusName).toBe('string');
    expect(me.body.staff.campusName).not.toBe('');
    expect(me.body.staff.congregation).toBe('futures-us');
  });

  it('login still signs the pastor in when the campus table cannot be read', async () => {
    pastor('north.pastor@futures.church', 'us-gwinnett');
    clearCampusCache();
    failOn.add('dw_campuses:select');
    const login = await call({ action: 'login', email: 'north.pastor@futures.church', password: PASSWORD });
    expect(login.status).toBe(200);
    expect(typeof login.body.token).toBe('string');
    expect(login.body.staff.campusId).toBe('us-gwinnett');
    expect(login.body.staff.campusName).not.toBe('');
    expect(login.body.staff.congregation).toBe('futures-us');
  });

  it('set_password still spends the code and signs in when the campus table cannot be read', async () => {
    addWithCode({ email: 'new.pastor@futures.church', campus_id: 'us-gwinnett', campus_set_by: 'admin' });
    clearCampusCache();
    failOn.add('dw_campuses:select');
    const r = await setUp('new.pastor@futures.church');
    expect(r.status).toBe(200);
    expect(typeof r.body.token).toBe('string');
    expect(r.body.staff.campusId).toBe('us-gwinnett');
    expect(r.body.staff.congregation).toBe('futures-us');
  });

  it('set_password and the form answer follow a renamed dw_campuses row', async () => {
    addWithCode({ email: 'new.pastor@futures.church', campus_id: 'zz-test-north', campus_set_by: 'admin' });
    tables.dw_campuses[0].name = 'Test North Renamed';
    clearCampusCache();
    const r = await setUp('new.pastor@futures.church');
    expect(r.status).toBe(200);
    expect(r.body.staff).toMatchObject({ campusId: 'zz-test-north', campusName: 'Test North Renamed', congregation: 'futures-au' });
    tables.dw_campuses[0].name = 'Test North Again';
    clearCampusCache();
    const form = await call({ action: 'form' }, r.body.token);
    expect(form.status).toBe(200);
    expect(form.body.staff).toMatchObject({ campusId: 'zz-test-north', campusName: 'Test North Again', congregation: 'futures-au' });
  });

  it('a campus read that never answers does not hold up sign-in: the bundled list answers in time', async () => {
    const { loadCampusesWithin, fallbackCampuses } = require_('../../netlify/functions/lib/campuses.js');
    clearCampusCache();
    const hung = { from: () => ({ select: () => ({ order: () => new Promise(() => {}) }) }) };
    const started = Date.now();
    const list = await loadCampusesWithin(hung, 20);
    expect(Date.now() - started).toBeLessThan(1000);
    expect(list.map((c) => c.id)).toEqual(fallbackCampuses().map((c) => c.id));
    // And a read that answers in time is the table's list, not the bundled one.
    const fresh = await loadCampusesWithin(fakeSupabase, 1000);
    expect(fresh.map((c) => c.id)).toEqual(['zz-test-north', 'zz-test-south']);
  });

  it('me without a session is still refused', async () => {
    expect((await call({ action: 'me' })).status).toBe(401);
    expect((await call({ action: 'me' }, 'x'.repeat(64))).status).toBe(401);
  });
});

describe('question wording changes in place (B09-03)', { timeout: 30_000 }, () => {
  async function as(role, extra = {}) {
    const email = `${role}.words@futures.church`;
    addRoster({ email, role, campus_id: role === 'campus' ? 'us-gwinnett' : null, campus_set_by: role === 'campus' ? 'admin' : null, password_hash: hashPassword(PASSWORD), ...extra });
    return signIn(email);
  }
  const q = (id) => tables.intake_questions.find((r) => r.id === id);
  const words = { label: 'One thing to do before next Sunday', help: 'A single sentence.' };

  it('anon is refused with 401 and nothing changes', async () => {
    const before = JSON.parse(JSON.stringify(tables.intake_questions));
    for (const body of [{ action: 'question_wording_save', id: 'q_hub_title', ...words }, { action: 'question_enabled_set', id: 'q_hub_title', enabled: false }]) {
      expect((await call(body)).status).toBe(401);
    }
    expect(tables.intake_questions).toEqual(before);
    expect(updateLog).toHaveLength(0);
  });

  it('a campus pastor and media are refused on every question, campus or hub', async () => {
    for (const role of ['campus', 'media']) {
      const token = await as(role);
      for (const id of ['q_title', 'q_hub_title']) {
        const r = await call({ action: 'question_wording_save', id, ...words }, token);
        expect(r.status).toBe(403);
        expect(r.body.error).toBe("Only the owner can change this question's wording.");
      }
    }
    expect(updateLog.filter((u) => u.table === 'intake_questions')).toHaveLength(0);
  });

  it('hub is refused on a campus question', async () => {
    const r = await call({ action: 'question_wording_save', id: 'q_title', ...words }, await as('hub'));
    expect(r.status).toBe(403);
    expect(q('q_title').label).toBe('Title');
  });

  it('hub on a hub question: 200, and the update writes only label, help and updated_at', async () => {
    const before = { ...q('q_hub_title') };
    const r = await call({ action: 'question_wording_save', id: 'q_hub_title', ...words, type: 'yes_no', audience: 'campus', required: true, enabled: false, sort_order: 1, config: { publish: 'campus_title' } }, await as('hub'));
    expect(r.status).toBe(200);
    expect(r.body.question.label).toBe(words.label);
    const writes = updateLog.filter((u) => u.table === 'intake_questions');
    expect(writes).toHaveLength(1);
    expect(Object.keys(writes[0].payload).sort()).toEqual(['help', 'label', 'updated_at']);
    const after = q('q_hub_title');
    for (const k of ['type', 'audience', 'required', 'enabled', 'sort_order', 'config']) expect(after[k]).toEqual(before[k]);
  });

  it('hub may reword an all-audience question', async () => {
    tables.intake_questions.push({ id: 'q_all', label: 'Anything else?', help: '', type: 'text', audience: 'all', required: false, enabled: true, sort_order: 60, config: {} });
    const r = await call({ action: 'question_wording_save', id: 'q_all', ...words }, await as('hub'));
    expect(r.status).toBe(200);
  });

  it('admin may reword any question, a campus one included', async () => {
    const r = await call({ action: 'question_wording_save', id: 'q_title', label: 'What is on this week?', help: '' }, await adminToken());
    expect(r.status).toBe(200);
    expect(q('q_title').label).toBe('What is on this week?');
  });

  it('a 1-character label is refused with a reason; tags are stripped and the caps hold', async () => {
    const token = await as('hub');
    const short = await call({ action: 'question_wording_save', id: 'q_hub_title', label: ' x ', help: '' }, token);
    expect(short.status).toBe(400);
    expect(short.body.error).toMatch(/at least 2 characters/);
    const long = await call({ action: 'question_wording_save', id: 'q_hub_title', label: '<b>Title</b>' + 'a'.repeat(400), help: 'h'.repeat(900) }, token);
    expect(long.status).toBe(200);
    expect(q('q_hub_title').label.startsWith('Title')).toBe(true);
    expect(q('q_hub_title').label).toHaveLength(200);
    expect(q('q_hub_title').help).toHaveLength(500);
  });

  it('a switched-off or missing question is not reworded', async () => {
    const token = await adminToken();
    q('q_hub_title').enabled = false;
    expect((await call({ action: 'question_wording_save', id: 'q_hub_title', ...words }, token)).status).toBe(404);
    expect((await call({ action: 'question_wording_save', id: 'nope', ...words }, token)).status).toBe(404);
    expect(updateLog.filter((u) => u.table === 'intake_questions')).toHaveLength(0);
  });

  it('the form tells each person which questions they may reword', async () => {
    const hub = await call({ action: 'form', job: 'hub' }, await as('hub'));
    expect(hub.body.rewordable).toEqual(['q_hub_title', 'q_hub_outline']);
    const campus = await call({ action: 'form', job: 'campus' }, await as('campus'));
    expect(campus.body.questions.length).toBeGreaterThan(0);
    expect(campus.body.rewordable).toEqual([]);
  });

  it('question_enabled_set: admin switches a question off and back on, writing only enabled and updated_at', async () => {
    const token = await adminToken();
    const before = { ...q('q_hub_title') };
    const off = await call({ action: 'question_enabled_set', id: 'q_hub_title', enabled: false, label: 'changed', audience: 'campus' }, token);
    expect(off.status).toBe(200);
    expect(q('q_hub_title').enabled).toBe(false);
    const writes = updateLog.filter((u) => u.table === 'intake_questions');
    expect(Object.keys(writes[0].payload).sort()).toEqual(['enabled', 'updated_at']);
    expect(q('q_hub_title').label).toBe(before.label);
    expect(q('q_hub_title').audience).toBe(before.audience);
    const form = await call({ action: 'form', job: 'hub' }, token);
    expect(form.body.questions.map((x) => x.id)).not.toContain('q_hub_title');
    expect((await call({ action: 'question_enabled_set', id: 'q_hub_title', enabled: true }, token)).status).toBe(200);
    expect(q('q_hub_title').enabled).toBe(true);
  });

  it('question_enabled_set refuses hub (403) and a missing enabled flag (400)', async () => {
    expect((await call({ action: 'question_enabled_set', id: 'q_hub_title', enabled: false }, await as('hub'))).status).toBe(403);
    expect(q('q_hub_title').enabled).toBe(true);
    expect((await call({ action: 'question_enabled_set', id: 'q_hub_title' }, await adminToken())).status).toBe(400);
  });
});

describe('prayer care on /staff: the gate three ways (B09-12)', () => {
  const HELD_HERE = '11111111-1111-4111-8111-111111111111';
  const HELD_THERE = '22222222-2222-4222-8222-222222222222';
  function seedPrayers() {
    const now = new Date().toISOString();
    tables.prayers = [
      { id: HELD_HERE, prayer: 'Call me on 0400 000 000', name: 'Jo Example', email: 'jo@example.org', campus: 'au-paradise', prayer_count: 0, created_at: now, status: 'held', held_reason: 'contact' },
      { id: HELD_THERE, prayer: 'see example.com', name: 'Anonymous', email: '', campus: 'us-kennesaw', prayer_count: 0, created_at: now, status: 'held', held_reason: 'link' },
      { id: '33333333-3333-4333-8333-333333333333', prayer: 'Healing for my mum', name: 'Anonymous', email: 'quiet@example.org', campus: 'au-paradise', prayer_count: 2, created_at: now, status: 'shown', held_reason: null },
    ];
  }

  it('anon (no session) gets 401 on both actions', async () => {
    seedPrayers();
    expect((await call({ action: 'prayers_week' })).status).toBe(401);
    expect((await call({ action: 'prayer_decide', id: HELD_HERE, decision: 'show' })).status).toBe(401);
    expect(tables.prayers.find((p) => p.id === HELD_HERE).status).toBe('held');
  });

  it("a campus pastor sees their own campus and gets 403 on another campus's post", async () => {
    seedPrayers();
    addRoster({ email: 'pastor@futures.church', role: 'campus', campus_id: 'au-paradise', campus_set_by: 'ae@futures.global', password_hash: hashPassword(PASSWORD) });
    const token = await signIn('pastor@futures.church');
    const list = await call({ action: 'prayers_week' }, token);
    expect(list.status).toBe(200);
    expect(list.body.held.map((p) => p.id)).toEqual([HELD_HERE]);
    expect(JSON.stringify(list.body)).not.toMatch(/quiet@|Jo Example|jo@|kennesaw/i);
    expect((await call({ action: 'prayer_decide', id: HELD_THERE, decision: 'show' }, token)).status).toBe(403);
    expect(tables.prayers.find((p) => p.id === HELD_THERE).status).toBe('held');
    const ok = await call({ action: 'prayer_decide', id: HELD_HERE, decision: 'private' }, token);
    expect(ok).toMatchObject({ status: 200, body: { ok: true, status: 'private' } });
    expect(tables.prayers).toHaveLength(3);
  });

  it('media is refused; admin sees every campus', async () => {
    seedPrayers();
    addRoster({ email: 'noah.terrell@futures.church', role: 'media', password_hash: hashPassword(PASSWORD) });
    const mediaToken = await signIn('noah.terrell@futures.church');
    expect((await call({ action: 'prayers_week' }, mediaToken)).status).toBe(403);
    const token = await adminToken();
    const list = await call({ action: 'prayers_week' }, token);
    expect(list.status).toBe(200);
    expect(list.body.held.map((p) => p.id).sort()).toEqual([HELD_HERE, HELD_THERE].sort());
  });
});

describe('Needs you on /staff: the gate three ways (B09-13)', () => {
  const NAMED = 'a1111111-1111-4111-8111-111111111111';
  const ANON = 'a2222222-2222-4222-8222-222222222222';
  const OTHER = 'a3333333-3333-4333-8333-333333333333';
  const HELD = 'a4444444-4444-4444-8444-444444444444';
  const hoursAgo = (h) => new Date(Date.now() - h * HOUR).toISOString();
  const OPEN = '2026-09-01T00:00:00Z';

  function seed({ mode = 'live', open = ['futures-au'] } = {}) {
    tables.prayers = [
      { id: NAMED, prayer: 'Please pray for my job interview on Thursday', name: 'Sam Example', email: 'sam+test@example.org', campus: 'au-paradise', prayer_count: 0, created_at: hoursAgo(3), status: 'shown', pastor_done_at: null },
      { id: ANON, prayer: 'For my mum’s surgery', name: 'Anonymous', email: 'quiet@example.org', campus: 'au-paradise', prayer_count: 0, created_at: hoursAgo(26), status: 'shown', pastor_done_at: null },
      { id: OTHER, prayer: 'Pray for Kennesaw', name: 'Lee Example', email: 'lee@example.org', campus: 'us-kennesaw', prayer_count: 0, created_at: hoursAgo(5), status: 'shown', pastor_done_at: null },
      { id: HELD, prayer: 'Call me on 0400 000 000', name: 'Jo Example', email: 'jo@example.org', campus: 'au-paradise', prayer_count: 0, created_at: hoursAgo(1), status: 'held', pastor_done_at: null },
    ];
    tables.dw_prompt_kind = [{ kind: 'dw_prayer_pastor_line', mode, shadow_recipients: [], note: null }];
    tables.dw_region_gate = ['futures-au', 'futures-us', 'futuros-us'].map((region) => ({ region, notices_on_at: open.includes(region) ? OPEN : null }));
  }
  async function pastor() {
    addRoster({ email: 'pastor@futures.church', role: 'campus', campus_id: 'au-paradise', campus_set_by: 'ae@futures.global', password_hash: hashPassword(PASSWORD) });
    return signIn('pastor@futures.church');
  }
  const ACTIONS = [
    { action: 'prayer_lines' },
    { action: 'prayer_write_link', id: NAMED },
    { action: 'prayer_line_done', id: NAMED, kind: 'prayed' },
    { action: 'prayer_waiting_mute', muted: true },
  ];

  it('anon (no session) gets 401 on every action, and nothing changes', async () => {
    seed();
    for (const body of ACTIONS) expect((await call(body)).status, body.action).toBe(401);
    expect(tables.prayers.every((p) => p.pastor_done_at === null)).toBe(true);
  });

  it('a campus pastor sees his own campus’s lines, oldest first, with no address in the list', async () => {
    seed();
    const token = await pastor();
    const out = await call({ action: 'prayer_lines' }, token);
    expect(out.status).toBe(200);
    expect(out.body.lines.map((l) => l.id)).toEqual([ANON, NAMED]);
    expect(out.body.lines[0]).toMatchObject({ firstName: null, canWrite: false, campusName: 'Futures Paradise' });
    expect(out.body.lines[1]).toMatchObject({ firstName: 'Sam', canWrite: true });
    expect(JSON.stringify(out.body)).not.toMatch(/@|Lee|Kennesaw|0400|Jo Example/);
    expect(out.body.waitingMuted).toBe(false);
  });

  it('another campus is 403 for the link and the close; the link is address-only; anonymous cannot be written to', async () => {
    seed();
    const token = await pastor();
    expect((await call({ action: 'prayer_write_link', id: OTHER }, token)).status).toBe(403);
    expect((await call({ action: 'prayer_line_done', id: OTHER, kind: 'prayed' }, token)).status).toBe(403);
    expect(tables.prayers.find((p) => p.id === OTHER).pastor_done_at).toBeNull();
    const link = await call({ action: 'prayer_write_link', id: NAMED }, token);
    expect(link).toMatchObject({ status: 200, body: { href: 'mailto:sam%2Btest%40example.org' } });
    expect(link.body.href).not.toContain('?');
    expect((await call({ action: 'prayer_write_link', id: ANON }, token)).status).toBe(400);
    expect((await call({ action: 'prayer_write_link', id: HELD }, token)).status).toBe(409);
    expect((await call({ action: 'prayer_line_done', id: ANON, kind: 'wrote' }, token)).status).toBe(400);
    expect((await call({ action: 'prayer_line_done', id: NAMED, kind: 'maybe' }, token)).status).toBe(400);
    expect((await call({ action: 'prayer_write_link', id: 'not-a-uuid' }, token)).status).toBe(400);
  });

  it('I wrote and I prayed close the line in both lists', async () => {
    seed();
    const token = await pastor();
    expect(await call({ action: 'prayer_line_done', id: NAMED, kind: 'wrote' }, token)).toMatchObject({ status: 200, body: { ok: true, kind: 'wrote' } });
    expect(await call({ action: 'prayer_line_done', id: ANON, kind: 'prayed' }, token)).toMatchObject({ status: 200, body: { ok: true, kind: 'prayed' } });
    const row = tables.prayers.find((p) => p.id === NAMED);
    expect(row).toMatchObject({ pastor_done_kind: 'wrote', pastor_done_by: 'pastor@futures.church' });
    expect((await call({ action: 'prayer_lines' }, token)).body.lines).toEqual([]);
    const week = await call({ action: 'prayers_week' }, token);
    expect(week.body.week.find((p) => p.id === NAMED)).toMatchObject({ done: 'wrote', canWrite: true });
    expect(week.body.week.find((p) => p.id === ANON)).toMatchObject({ done: 'prayed', canWrite: false });
    expect(JSON.stringify(week.body)).not.toMatch(/sam\+test@|quiet@/);
    // A second close answers ok and changes nothing.
    expect(await call({ action: 'prayer_line_done', id: NAMED, kind: 'prayed' }, token)).toMatchObject({ status: 200, body: { already: true, kind: 'wrote' } });
    expect(row.pastor_done_kind).toBe('wrote');
  });

  it('no line while the kind is off, or live with the nation not switched on; media is 403', async () => {
    seed({ mode: 'off' });
    const token = await pastor();
    expect((await call({ action: 'prayer_lines' }, token)).body.lines).toEqual([]);
    seed({ mode: 'live', open: ['futures-us'] });
    expect((await call({ action: 'prayer_lines' }, token)).body.lines).toEqual([]);
    addRoster({ email: 'noah.terrell@futures.church', role: 'media', password_hash: hashPassword(PASSWORD) });
    const media = await signIn('noah.terrell@futures.church');
    expect((await call({ action: 'prayer_lines' }, media)).status).toBe(403);
    expect((await call({ action: 'prayer_write_link', id: NAMED }, media)).status).toBe(403);
    expect((await call({ action: 'prayer_line_done', id: NAMED, kind: 'prayed' }, media)).status).toBe(403);
  });

  it('hub and admin get the lines of campuses with no confirmed pastor only', async () => {
    seed({ open: ['futures-au', 'futures-us'] });
    await pastor();
    const admin = await adminToken();
    const out = await call({ action: 'prayer_lines' }, admin);
    expect(out.body.lines.map((l) => l.id)).toEqual([OTHER]);
  });

  it('Stop the waiting email is per person and the card still shows', async () => {
    seed();
    const token = await pastor();
    expect(await call({ action: 'prayer_waiting_mute', muted: true }, token)).toMatchObject({ status: 200, body: { ok: true, waitingMuted: true } });
    expect(tables.staff_roster.find((r) => r.email === 'pastor@futures.church').prayer_waiting_muted).toBe(true);
    const out = await call({ action: 'prayer_lines' }, token);
    expect(out.body.waitingMuted).toBe(true);
    expect(out.body.lines).toHaveLength(2);
    expect((await call({ action: 'prayer_waiting_mute', muted: 'yes' }, token)).status).toBe(400);
  });
});

describe('text size follows the person (TEXT-SIZE-PLAN row 10)', () => {
  const pastor = async (email = 'ts.pastor@futures.church') => {
    addRoster({ email, password_hash: hashPassword(PASSWORD) });
    return signIn(email);
  };

  it('needs a staff session', async () => {
    expect((await call({ action: 'text_size_get' })).status).toBe(401);
    expect((await call({ action: 'text_size_set', size: 'l130', at: Date.now() })).status).toBe(401);
  });

  it('nothing saved yet reads as null; a Save is read back on another device', async () => {
    const token = await pastor();
    expect((await call({ action: 'text_size_get' }, token)).body).toEqual({ value: null });
    const at = Date.now() - 1000;
    const r = await call({ action: 'text_size_set', size: 'l130', at }, token);
    expect(r.body).toEqual({ value: { size: 'l130', at }, saved: true });
    const other = await signIn('ts.pastor@futures.church');
    expect((await call({ action: 'text_size_get' }, other)).body).toEqual({ value: { size: 'l130', at } });
  });

  it('newest wins: an older write never replaces a newer copy, and says what is kept', async () => {
    const token = await pastor();
    const now = Date.now();
    await call({ action: 'text_size_set', size: 's80', at: now - 1000 }, token);
    const old = await call({ action: 'text_size_set', size: 'l150', at: now - 60_000 }, token);
    expect(old.body).toEqual({ value: { size: 's80', at: now - 1000 }, saved: false });
    const same = await call({ action: 'text_size_set', size: 'l150', at: now - 1000 }, token);
    expect(same.body.saved).toBe(false);
    expect((await call({ action: 'text_size_set', size: 'xs50', at: now }, token)).body.saved).toBe(true);
  });

  it('writes only the session\'s own row, whatever address the request names', async () => {
    addRoster({ email: 'someone.else@futures.church', password_hash: hashPassword(PASSWORD) });
    const token = await pastor();
    await call({ action: 'text_size_set', size: 'l115', at: Date.now(), email: 'someone.else@futures.church' }, token);
    const other = tables.staff_roster.find((x) => x.email === 'someone.else@futures.church');
    expect(other.text_size).toBeUndefined();
    expect(tables.staff_roster.find((x) => x.email === 'ts.pastor@futures.church').text_size).toBe('l115');
  });

  it('refuses a size that is not a kit step, a bad stamp, and a stamp over a day ahead', async () => {
    const token = await pastor();
    for (const bad of [{ size: 'huge', at: Date.now() }, { size: 'l130', at: 'soon' }, { size: 'l130', at: -5 }, { size: 'l130', at: Date.now() + 25 * HOUR }]) {
      expect((await call({ action: 'text_size_set', ...bad }, token)).status).toBe(400);
    }
    expect(tables.staff_roster.find((x) => x.email === 'ts.pastor@futures.church').text_size).toBeUndefined();
  });
});
