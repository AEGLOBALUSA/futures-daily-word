/**
 * DW-P08: a campus's reading week, without a code (lib/reading-week.js and
 * the intake.js action `reading_week`).
 *
 * What is proven here:
 *   - counts only: the answer's keys are exactly the campus and the four
 *     counts; whatever else the SQL row might carry never leaves, and no
 *     address appears anywhere in the answer;
 *   - the gate three ways: no session 401, another campus 403 (before the
 *     database is asked anything), the allowed campus 200; plus media and an
 *     unconfirmed campus pastor 403, and hub and admin naming any campus;
 *   - the SQL function is asked for exactly one campus id, the one the gate
 *     allowed.
 *
 * The SQL function itself (four integers, anon and authenticated refused) is
 * proven in a rolled-back rehearsal against the live schema; see the PR.
 *
 * Every name and address here is made up (this repo is public).
 * NOTE: this file lives in tests/, never in netlify/functions/.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import Module, { createRequire } from 'node:module';
import crypto from 'node:crypto';
import { createFakeSupabase } from './helpers/fake-supabase.js';

const require_ = createRequire(import.meta.url);
const rw = require_('../../netlify/functions/lib/reading-week.js');
const { fallbackCampuses } = require_('../../netlify/functions/lib/campuses.js');

const CAMPUSES = fallbackCampuses();
const RESULT_KEYS = ['campusId', 'campusName', 'first_time', 'prev_readers', 'readers', 'started_journey'];

const staffOf = (role, campusId = null, campusSetBy = 'admin') => ({ email: `${role}.person@futures.church`, role, campusId, campusSetBy, name: 'Test Person' });

describe('readingWeekScope: who may read which campus', () => {
  it('a confirmed campus pastor reads his own campus, named or not', () => {
    const me = staffOf('campus', 'us-alpharetta');
    expect(rw.readingWeekScope(me, undefined, CAMPUSES).campus.id).toBe('us-alpharetta');
    expect(rw.readingWeekScope(me, '', CAMPUSES).campus.id).toBe('us-alpharetta');
    expect(rw.readingWeekScope(me, 'us-alpharetta', CAMPUSES).campus.id).toBe('us-alpharetta');
  });

  it('a campus pastor naming another campus (or anything else) is 403 other_campus', () => {
    const me = staffOf('campus', 'us-alpharetta');
    for (const other of ['us-kennesaw', 'au-paradise', 'not-a-campus', 'other', 42, ['us-kennesaw']]) {
      const r = rw.readingWeekScope(me, other, CAMPUSES);
      expect(r.status).toBe(403);
      expect(r.code).toBe('other_campus');
    }
  });

  it('a self-picked or missing campus is 403 campus_unconfirmed; media is 403 role', () => {
    expect(rw.readingWeekScope(staffOf('campus', 'us-gwinnett', 'self'), undefined, CAMPUSES)).toMatchObject({ status: 403, code: 'campus_unconfirmed' });
    expect(rw.readingWeekScope(staffOf('campus', null), undefined, CAMPUSES)).toMatchObject({ status: 403, code: 'campus_unconfirmed' });
    expect(rw.readingWeekScope(staffOf('campus', 'no-such-campus'), undefined, CAMPUSES)).toMatchObject({ status: 403, code: 'campus_unconfirmed' });
    expect(rw.readingWeekScope(staffOf('media', 'us-alpharetta'), 'us-alpharetta', CAMPUSES)).toMatchObject({ status: 403, code: 'role' });
    expect(rw.readingWeekScope(staffOf('volunteer', 'us-alpharetta'), undefined, CAMPUSES)).toMatchObject({ status: 403, code: 'role' });
    expect(rw.readingWeekScope(null, 'us-alpharetta', CAMPUSES)).toMatchObject({ status: 401 });
  });

  it('hub and admin read any campus they name, else their own roster campus, else 400', () => {
    for (const role of ['hub', 'admin']) {
      expect(rw.readingWeekScope(staffOf(role), 'au-paradise', CAMPUSES).campus.id).toBe('au-paradise');
      expect(rw.readingWeekScope(staffOf(role, 'us-kennesaw'), undefined, CAMPUSES).campus.id).toBe('us-kennesaw');
      expect(rw.readingWeekScope(staffOf(role), undefined, CAMPUSES)).toMatchObject({ status: 400, code: 'campus' });
      expect(rw.readingWeekScope(staffOf(role), 'other', CAMPUSES)).toMatchObject({ status: 400, code: 'campus' });
      expect(rw.readingWeekScope(staffOf(role), 'nowhere', CAMPUSES)).toMatchObject({ status: 400, code: 'campus' });
      expect(rw.readingWeekScope(staffOf(role), { id: 'au-paradise' }, CAMPUSES)).toMatchObject({ status: 400, code: 'campus' });
    }
  });
});

describe('readingWeekCounts: the four counts and nothing else', () => {
  it('keeps exactly the four keys and drops anything else the row carries', () => {
    const out = rw.readingWeekCounts({ readers: 212, first_time: 31, started_journey: 4, prev_readers: 168, email: 'leak@example.org', ids: ['x'] });
    expect(out).toEqual({ readers: 212, first_time: 31, started_journey: 4, prev_readers: 168 });
  });

  it('a missing, negative, fractional or non-number count becomes 0; a digit string is read', () => {
    expect(rw.readingWeekCounts({ readers: -1, first_time: 2.5, started_journey: 'four', prev_readers: '17' }))
      .toEqual({ readers: 0, first_time: 0, started_journey: 0, prev_readers: 17 });
    expect(rw.readingWeekCounts(null)).toEqual({ readers: 0, first_time: 0, started_journey: 0, prev_readers: 0 });
  });
});

// ── intake.js: the gate three ways ─────────────────────────────────────────
const realLoad = Module._load;
let handler;
let fake;
let rpcCalls;
let rpcAnswer;
function sha(raw) { return crypto.createHash('sha256').update(raw).digest('hex'); }
const TOKENS = { campus: 'c'.repeat(64), self: 's'.repeat(64), media: 'm'.repeat(64), hub: 'h'.repeat(64), admin: 'a'.repeat(64) };

beforeAll(() => {
  Module._load = function (request, ...rest) {
    if (request === '@supabase/supabase-js') {
      return {
        createClient: () => ({
          from: (t) => fake.from(t),
          rpc: async (name, args) => { rpcCalls.push({ name, args }); return rpcAnswer(name, args); },
        }),
      };
    }
    if (request === './lib/rate-limit') return { isSharedRateLimited: async () => false };
    return realLoad.call(this, request, ...rest);
  };
  process.env.SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_KEY = 'service-key';
  ({ handler } = require_('../../netlify/functions/intake.js'));
});
afterAll(() => { Module._load = realLoad; });

beforeEach(() => {
  const future = new Date(Date.now() + 86400000).toISOString();
  rpcCalls = [];
  // The SQL function's row, with an extra column it must never pass on.
  rpcAnswer = (name, args) => (name === 'reading_week'
    ? { data: [{ readers: 212, first_time: 31, started_journey: 4, prev_readers: 168, email: `someone@${args.p_campus}.example.org` }], error: null }
    : { data: null, error: null });
  fake = createFakeSupabase({
    staff_roster: [
      { email: 'campus.person@futures.church', role: 'campus', campus_id: 'us-alpharetta', display_name: 'Campus Person', campus_set_by: 'admin' },
      { email: 'self.person@futures.church', role: 'campus', campus_id: 'us-gwinnett', display_name: 'Self Person', campus_set_by: 'self' },
      { email: 'media.person@futures.church', role: 'media', campus_id: null, display_name: 'Media Person', campus_set_by: null },
      { email: 'hub.person@futures.church', role: 'hub', campus_id: null, display_name: 'Hub Person', campus_set_by: null },
      { email: 'ae@futures.global', role: 'admin', campus_id: null, display_name: 'Owner', campus_set_by: null },
    ],
    staff_sessions: [
      { token_hash: sha(TOKENS.campus), email: 'campus.person@futures.church', expires_at: future },
      { token_hash: sha(TOKENS.self), email: 'self.person@futures.church', expires_at: future },
      { token_hash: sha(TOKENS.media), email: 'media.person@futures.church', expires_at: future },
      { token_hash: sha(TOKENS.hub), email: 'hub.person@futures.church', expires_at: future },
      { token_hash: sha(TOKENS.admin), email: 'ae@futures.global', expires_at: future },
    ],
    dw_campuses: [],
  });
});

async function call(body, token) {
  const headers = { origin: 'https://futuresdailyword.com', 'x-forwarded-for': '203.0.113.9' };
  if (token) headers.authorization = `Bearer ${token}`;
  const res = await handler({ httpMethod: 'POST', headers, body: JSON.stringify(body) });
  return { status: res.statusCode, raw: res.body, body: JSON.parse(res.body || '{}') };
}

describe('intake reading_week: no session 401, another campus 403, own campus 200', () => {
  it('no session (and a made-up token) is refused with 401, and nothing is counted', async () => {
    expect((await call({ action: 'reading_week' })).status).toBe(401);
    expect((await call({ action: 'reading_week', campusId: 'us-alpharetta' }, 'x'.repeat(64))).status).toBe(401);
    expect(rpcCalls).toHaveLength(0);
  });

  it('a campus pastor naming another campus is refused with 403, before anything is counted', async () => {
    const r = await call({ action: 'reading_week', campusId: 'us-kennesaw' }, TOKENS.campus);
    expect(r.status).toBe(403);
    expect(r.body.code).toBe('other_campus');
    expect(r.raw).not.toMatch(/readers/);
    expect(rpcCalls).toHaveLength(0);
  });

  it('a campus pastor gets his own campus: counts only, the exact keys, no address', async () => {
    const r = await call({ action: 'reading_week' }, TOKENS.campus);
    expect(r.status).toBe(200);
    expect(Object.keys(r.body).sort()).toEqual(RESULT_KEYS);
    expect(r.body).toEqual({ campusId: 'us-alpharetta', campusName: CAMPUSES.find((c) => c.id === 'us-alpharetta').name, readers: 212, first_time: 31, started_journey: 4, prev_readers: 168 });
    expect(r.raw).not.toMatch(/@/);
    expect(rpcCalls).toEqual([{ name: 'reading_week', args: { p_campus: 'us-alpharetta' } }]);
  });

  it('media and an unconfirmed campus pastor are refused with 403', async () => {
    expect((await call({ action: 'reading_week' }, TOKENS.media)).body.code).toBe('role');
    expect((await call({ action: 'reading_week', campusId: 'us-alpharetta' }, TOKENS.media)).status).toBe(403);
    expect((await call({ action: 'reading_week' }, TOKENS.self)).body.code).toBe('campus_unconfirmed');
    expect((await call({ action: 'reading_week', campusId: 'us-gwinnett' }, TOKENS.self)).status).toBe(403);
    expect(rpcCalls).toHaveLength(0);
  });

  it('hub and admin read the campus they name; with none named and no roster campus they are asked to choose', async () => {
    const a = await call({ action: 'reading_week', campusId: 'au-paradise' }, TOKENS.admin);
    expect(a.status).toBe(200);
    expect(a.body.campusId).toBe('au-paradise');
    expect(Object.keys(a.body).sort()).toEqual(RESULT_KEYS);
    const h = await call({ action: 'reading_week', campusId: 'us-kennesaw' }, TOKENS.hub);
    expect(h.body.campusId).toBe('us-kennesaw');
    expect(rpcCalls.map((c) => c.args.p_campus)).toEqual(['au-paradise', 'us-kennesaw']);
    const none = await call({ action: 'reading_week' }, TOKENS.admin);
    expect(none.status).toBe(400);
    expect(none.body.code).toBe('campus');
    expect((await call({ action: 'reading_week', campusId: 'nowhere' }, TOKENS.hub)).status).toBe(400);
    expect(rpcCalls).toHaveLength(2);
  });

  it('a database failure is a plain 500 with no detail', async () => {
    rpcAnswer = () => ({ data: null, error: { code: 'XX000', message: 'boom at someone@example.org' } });
    const r = await call({ action: 'reading_week' }, TOKENS.campus);
    expect(r.status).toBe(500);
    expect(r.body).toEqual({ error: 'The reading week did not load.', code: 'server' });
  });
});
