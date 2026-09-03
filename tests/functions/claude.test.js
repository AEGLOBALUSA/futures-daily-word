/**
 * The Claude proxy's origin and staff-session gates.
 *
 * This endpoint spends the organisation's Anthropic key, and `Origin` is
 * forgeable, so the pastor-only origin (Pastors Sermon Prep) must present a live
 * staff session. Daily Word's own congregation origins stay anonymous — those
 * readers have no session and never will.
 *
 * `claude.js` is CommonJS and pulls its dependencies with `require`, which
 * `vi.mock` cannot intercept, so the module loader is overridden directly —
 * the same approach the intake harness uses.
 *
 * NOTE: this file lives in tests/, never in netlify/functions/. Netlify treats
 * every file in the functions directory as a function and rejects the name.
 */
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import Module from 'node:module';
import { createRequire } from 'node:module';

const SERMON_PREP = 'https://pastors-sermon-prep.netlify.app';
const DAILY_WORD = 'https://futuresdailyword.com';
const LIVE_TOKEN = 'a'.repeat(64);

let sessionRow;    // what staff_sessions returns for the looked-up hash
let sessionError;  // or an error, to prove the gate fails closed
let lookedUpHash;  // the hash the function actually queried

const fakeSupabase = {
  from: () => ({
    select: () => ({
      eq: (_col, value) => {
        lookedUpHash = value;
        return { maybeSingle: async () => ({ data: sessionRow, error: sessionError }) };
      },
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
  process.env.ANTHROPIC_API_KEY = 'test-key';
  process.env.SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_KEY = 'service-key';
  ({ handler } = createRequire(import.meta.url)('../../netlify/functions/claude.js'));
});

afterAll(() => { Module._load = realLoad; });

const anthropic = vi.fn();

function event({ origin, body }) {
  return {
    httpMethod: 'POST',
    headers: { origin, 'x-forwarded-for': '203.0.113.9' },
    body: JSON.stringify(body),
  };
}

const validBody = (extra = {}) => ({ messages: [{ role: 'user', content: 'hi' }], ...extra });

beforeEach(() => {
  sessionRow = null;
  sessionError = null;
  lookedUpHash = null;
  anthropic.mockReset();
  anthropic.mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ content: [{ text: 'an answer' }] }),
  });
  vi.stubGlobal('fetch', anthropic);
});

afterEach(() => { vi.unstubAllGlobals(); });

describe('claude proxy — the pastor-only origin must prove a session', () => {
  it('refuses the Sermon Prep origin with no token, and never calls Anthropic', async () => {
    const res = await handler(event({ origin: SERMON_PREP, body: validBody() }));
    expect(res.statusCode).toBe(401);
    expect(anthropic).not.toHaveBeenCalled();
  });

  it('refuses a token that matches no session row', async () => {
    sessionRow = null;
    const res = await handler(event({ origin: SERMON_PREP, body: validBody({ staffToken: LIVE_TOKEN }) }));
    expect(res.statusCode).toBe(401);
    expect(anthropic).not.toHaveBeenCalled();
  });

  it('looks the token up by its SHA-256 hash, never by the token itself', async () => {
    sessionRow = { expires_at: new Date(Date.now() + 3600_000).toISOString() };
    await handler(event({ origin: SERMON_PREP, body: validBody({ staffToken: LIVE_TOKEN }) }));
    expect(lookedUpHash).toMatch(/^[0-9a-f]{64}$/);
    expect(lookedUpHash).not.toBe(LIVE_TOKEN);
  });

  it('refuses an EXPIRED session', async () => {
    sessionRow = { expires_at: new Date(Date.now() - 1000).toISOString() };
    const res = await handler(event({ origin: SERMON_PREP, body: validBody({ staffToken: LIVE_TOKEN }) }));
    expect(res.statusCode).toBe(401);
    expect(anthropic).not.toHaveBeenCalled();
  });

  it('fails CLOSED when the session lookup errors — an outage is not free completions', async () => {
    sessionError = { message: 'database unavailable' };
    const res = await handler(event({ origin: SERMON_PREP, body: validBody({ staffToken: LIVE_TOKEN }) }));
    expect(res.statusCode).toBe(401);
    expect(anthropic).not.toHaveBeenCalled();
  });

  it('refuses a token too short to be a session, without touching the database', async () => {
    const res = await handler(event({ origin: SERMON_PREP, body: validBody({ staffToken: 'short' }) }));
    expect(res.statusCode).toBe(401);
    expect(lookedUpHash).toBeNull();
    expect(anthropic).not.toHaveBeenCalled();
  });

  it('allows a live session, and never forwards the token to Anthropic', async () => {
    sessionRow = { expires_at: new Date(Date.now() + 3600_000).toISOString() };
    const res = await handler(event({
      origin: SERMON_PREP,
      body: validBody({ staffToken: LIVE_TOKEN, system: 'be helpful', max_tokens: 300 }),
    }));

    expect(res.statusCode).toBe(200);
    expect(anthropic).toHaveBeenCalledTimes(1);
    const sent = JSON.parse(anthropic.mock.calls[0][1].body);
    expect(sent.staffToken).toBeUndefined();
    expect(JSON.stringify(sent)).not.toContain(LIVE_TOKEN);
    expect(sent.system).toBe('be helpful');
    expect(sent.max_tokens).toBe(300);
  });
});

describe('claude proxy — Daily Word itself is unchanged', () => {
  it("serves Daily Word's own origin with no token at all", async () => {
    const res = await handler(event({ origin: DAILY_WORD, body: validBody() }));
    expect(res.statusCode).toBe(200);
    expect(anthropic).toHaveBeenCalledTimes(1);
  });

  it('does not consult the database for a congregation origin', async () => {
    await handler(event({ origin: DAILY_WORD, body: validBody() }));
    expect(lookedUpHash).toBeNull();
  });

  it('still refuses an origin that is not on the allow-list', async () => {
    const res = await handler(event({ origin: 'https://evil.example', body: validBody() }));
    expect(res.statusCode).toBe(403);
    expect(anthropic).not.toHaveBeenCalled();
  });
});
