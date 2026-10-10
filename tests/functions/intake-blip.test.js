/**
 * A database error on a session lookup is not "signed out".
 *
 * `intake.js` is CommonJS and pulls its dependencies with `require`, which
 * `vi.mock` cannot intercept, so the module loader is overridden directly
 * (same approach as intake-claim.test.js) with a small in-memory fake of Supabase.
 *
 * NOTE: this file lives in tests/, never in netlify/functions/.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Module from 'node:module';
import { createRequire } from 'node:module';

const require_ = createRequire(import.meta.url);

let sessionRead = { data: null, error: null };

const fakeSupabase = {
  from: (table) => ({
    select: () => ({
      eq: () => ({
        maybeSingle: async () => (table === 'staff_sessions' ? sessionRead : { data: null, error: null }),
      }),
    }),
  }),
};

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

const TOKEN = 'a'.repeat(64);

async function callMe() {
  const res = await handler({
    httpMethod: 'POST',
    headers: { authorization: `Bearer ${TOKEN}`, origin: 'https://futuresdailyword.com', 'x-forwarded-for': '203.0.113.9' },
    body: JSON.stringify({ action: 'me' }),
  });
  return { status: res.statusCode, body: JSON.parse(res.body || '{}') };
}

describe('intake session lookup — a database blip is 503, a missing row is 401', () => {
  it('a staff_sessions read error answers 503, not 401', async () => {
    sessionRead = { data: null, error: { message: 'down' } };
    const res = await callMe();
    expect(res.status).toBe(503);
    expect(res.body.error).toBe('Sign-in is unavailable right now. Try again shortly.');
  });

  it('a missing session row still answers 401', async () => {
    sessionRead = { data: null, error: null };
    const res = await callMe();
    expect(res.status).toBe(401);
  });
});

describe('findByEntry via authenticateSession', () => {
  const { authenticateSession } = require_('../../netlify/functions/lib/auth.js');
  const event = { headers: { authorization: `Bearer ${TOKEN}` } };

  function dbReturning(error) {
    return {
      from: () => ({
        select: () => ({
          contains: () => ({
            single: async () => ({ data: null, error }),
          }),
        }),
      }),
    };
  }

  it('{error:{code:PGRST116}} is a missing row and returns null', async () => {
    const session = await authenticateSession(event, dbReturning({ code: 'PGRST116' }));
    expect(session).toBeNull();
  });

  it('{error:{code:XX000}} throws with status 503', async () => {
    await expect(authenticateSession(event, dbReturning({ code: 'XX000' }))).rejects.toMatchObject({
      status: 503,
      message: 'Sign-in is unavailable right now. Try again shortly.',
    });
  });
});
