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
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
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
    return true;
  });
}

function builder(table) {
  const state = { op: 'select', filters: [], payload: null, opts: null, wantRows: false };
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
    select() { if (state.op !== 'select') state.wantRows = true; return b; },
    insert(p) { state.op = 'insert'; state.payload = p; return b; },
    update(p) { state.op = 'update'; state.payload = p; return b; },
    upsert(p, o) { state.op = 'upsert'; state.payload = p; state.opts = o; return b; },
    delete() { state.op = 'delete'; return b; },
    eq(col, val) { state.filters.push({ op: 'eq', col, val }); return b; },
    neq(col, val) { state.filters.push({ op: 'neq', col, val }); return b; },
    lt(col, val) { state.filters.push({ op: 'lt', col, val }); return b; },
    order() { return b; },
    limit() { return b; },
    maybeSingle: async () => ({ data: run()[0] || null, error: null }),
    single: async () => { const r = run()[0]; return r ? { data: r, error: null } : { data: null, error: { message: 'no row' } }; },
    then(resolve, reject) { return Promise.resolve({ data: run(), error: null }).then(resolve, reject); },
  };
  return b;
}

const fakeSupabase = { from: (table) => builder(table) };

// ── load the handler under the fake ───────────────────────────────────────
const realLoad = Module._load;
let handler;

beforeAll(() => {
  Module._load = function (request, ...rest) {
    if (request === '@supabase/supabase-js') return { createClient: () => fakeSupabase };
    if (request === './lib/rate-limit') return { isSharedRateLimited: async () => false };
    return realLoad.call(this, request, ...rest);
  };
  process.env.SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_KEY = 'service-key';
  ({ handler } = require_('../../netlify/functions/intake.js'));
});

afterAll(() => { Module._load = realLoad; });

beforeEach(() => { resetTables(); });

const { hashPassword } = require_('../../netlify/functions/lib/intake-core.js');
const PASSWORD = 'a-long-test-passphrase-9';

async function call(body, token) {
  const headers = { 'x-forwarded-for': '203.0.113.9', origin: 'https://futuresdailyword.com' };
  if (token) headers.authorization = `Bearer ${token}`;
  const res = await handler({ httpMethod: 'POST', headers, body: JSON.stringify(body) });
  return { status: res.statusCode, body: JSON.parse(res.body || '{}') };
}

function addRoster(row) {
  tables.staff_roster.push({ role: 'campus', campus_id: null, campus_set_by: null, display_name: '', password_hash: null, ...row });
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

  it('auth_status says setup:true for a roster row with no password, false once it has one', async () => {
    addRoster({ email: 'new.pastor@futures.church' });
    addRoster({ email: 'old.pastor@futures.church', password_hash: hashPassword(PASSWORD) });
    expect((await call({ action: 'auth_status', email: 'new.pastor@futures.church' })).body).toEqual({ setup: true });
    expect((await call({ action: 'auth_status', email: 'old.pastor@futures.church' })).body).toEqual({ setup: false });
  });

  it('set_password for a made-up address is refused and leaves no row and no session', async () => {
    const r = await call({ action: 'set_password', email: 'nobody123@futures.church', password: PASSWORD });
    expect(r.status).toBe(403);
    expect(r.body.error).toBe('Invalid email or password');
    expect(tables.staff_roster).toHaveLength(0);
    expect(tables.staff_sessions).toHaveLength(0);
  });

  it('login for a made-up address gets the plain refusal, with no setup hint', async () => {
    const r = await call({ action: 'login', email: 'nobody123@futures.church', password: PASSWORD });
    expect(r.status).toBe(403);
    expect(r.body.error).toBe('Invalid email or password');
    expect('setup' in r.body).toBe(false);
  });

  it('set_password works once for a person on the roster, then is refused', async () => {
    addRoster({ email: 'new.pastor@futures.church', role: 'campus', campus_id: 'us-gwinnett', campus_set_by: 'admin' });
    const first = await call({ action: 'set_password', email: 'new.pastor@futures.church', password: PASSWORD });
    expect(first.status).toBe(200);
    expect(typeof first.body.token).toBe('string');
    expect(tables.staff_roster[0].password_hash).toBeTruthy();
    const second = await call({ action: 'set_password', email: 'new.pastor@futures.church', password: PASSWORD });
    expect(second.status).toBe(403);
    expect(second.body.error).toMatch(/Password already set/);
  });

  it('set_password still works for a named person who has no row yet, and makes the row', async () => {
    const r = await call({ action: 'set_password', email: 'josh@futures.church', password: PASSWORD });
    expect(r.status).toBe(200);
    expect(tables.staff_roster).toHaveLength(1);
    expect(tables.staff_roster[0]).toMatchObject({ email: 'josh@futures.church', role: 'hub' });
  });

  it('a live session whose roster row was deleted is signed out', async () => {
    addRoster({ email: 'gone.pastor@futures.church', campus_id: 'us-gwinnett', campus_set_by: 'admin', password_hash: hashPassword(PASSWORD) });
    const token = await signIn('gone.pastor@futures.church');
    expect((await call({ action: 'me' }, token)).status).toBe(200);
    tables.staff_roster = [];
    expect((await call({ action: 'me' }, token)).status).toBe(401);
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
