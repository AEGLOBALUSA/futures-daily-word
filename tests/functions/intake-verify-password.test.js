/**
 * Face ID lock: "Use your password instead" checks this session's password
 * and answers 200 either way. A missing session is still 401; a roster read
 * error is 503.
 *
 * `intake.js` is CommonJS and pulls its dependencies with `require`, which
 * `vi.mock` cannot intercept, so the module loader is overridden directly
 * (same approach as intake-blip.test.js / intake-claim.test.js) with a small
 * in-memory fake of Supabase.
 *
 * NOTE: this file lives in tests/, never in netlify/functions/.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import Module from 'node:module';
import { createRequire } from 'node:module';
import crypto from 'node:crypto';

const require_ = createRequire(import.meta.url);
const { hashPassword } = require_('../../netlify/functions/lib/intake-core.js');

const TOKEN = 'b'.repeat(64);
const EMAIL = 'pastor.verify@futures.church';
const PASSWORD = 'a-long-test-passphrase-9';
const tokenHash = crypto.createHash('sha256').update(TOKEN).digest('hex');

let tables;
let failPasswordRead = false;

function resetTables() {
  failPasswordRead = false;
  tables = {
    staff_sessions: [{
      token_hash: tokenHash,
      email: EMAIL,
      expires_at: new Date(Date.now() + 400 * 24 * 60 * 60 * 1000).toISOString(),
    }],
    staff_roster: [{
      email: EMAIL,
      role: 'campus',
      campus_id: null,
      display_name: 'Verify Pastor',
      campus_set_by: null,
      password_hash: hashPassword(PASSWORD),
    }],
  };
}

function builder(table) {
  const state = { cols: null, filters: [] };
  const hits = () => (tables[table] || []).filter((row) => state.filters.every((f) => row[f.col] === f.val));
  const b = {
    select(cols) { state.cols = cols; return b; },
    eq(col, val) { state.filters.push({ col, val }); return b; },
    update() { return b; },
    maybeSingle: async () => {
      if (table === 'staff_roster' && failPasswordRead && String(state.cols || '').includes('password_hash')) {
        return { data: null, error: { message: 'down' } };
      }
      const row = hits()[0];
      return { data: row ? { ...row } : null, error: null };
    },
    then(resolve, reject) {
      return Promise.resolve({ data: hits(), error: null }).then(resolve, reject);
    },
  };
  return b;
}

const fakeSupabase = { from: (table) => builder(table) };

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

async function call(body, token) {
  const headers = { origin: 'https://futuresdailyword.com', 'x-forwarded-for': '203.0.113.9' };
  if (token) headers.authorization = `Bearer ${token}`;
  const res = await handler({ httpMethod: 'POST', headers, body: JSON.stringify(body) });
  return { status: res.statusCode, body: JSON.parse(res.body || '{}') };
}

describe('verify_password', () => {
  it('a right password answers 200 { ok: true }', async () => {
    const res = await call({ action: 'verify_password', password: PASSWORD }, TOKEN);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it('a wrong password answers 200 { ok: false }, never 401', async () => {
    const res = await call({ action: 'verify_password', password: 'not-the-password' }, TOKEN);
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(false);
  });

  it('no Bearer answers 401', async () => {
    const res = await call({ action: 'verify_password', password: PASSWORD });
    expect(res.status).toBe(401);
  });

  it('a roster read error during verify answers 503', async () => {
    failPasswordRead = true;
    const res = await call({ action: 'verify_password', password: PASSWORD }, TOKEN);
    expect(res.status).toBe(503);
  });
});
