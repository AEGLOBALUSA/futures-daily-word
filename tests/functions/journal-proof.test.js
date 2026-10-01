/**
 * A reader's private journal must not open for someone who only knows their
 * email address.
 *
 * Before this change, `migrateRequest` (user-sync, user-profile, track-activity)
 * and `register` (for an existing email) handed a full session token to anyone
 * who typed an address that already had a profile, and user-sync then returned
 * the journal / highlights / profile picture and let the caller overwrite them.
 * Now those tokens are UNPROVEN ("u:<hash>" in profiles.session_token_hashes):
 * they identify the caller but unlock nothing until the person types a 6-digit
 * code we email to the address. Tokens that existed before the change are plain
 * hashes and stay PROVEN, and a brand-new email's first device is proven too.
 *
 * The functions are CommonJS and pull dependencies with `require`, which
 * `vi.mock` cannot intercept, so the module loader is overridden directly (the
 * same approach as claude.test.js). Supabase is an in-memory fake; Resend is a
 * stubbed `fetch`.
 *
 * NOTE: this file lives in tests/, never in netlify/functions/.
 */
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import Module, { createRequire } from 'node:module';
import crypto from 'node:crypto';
import { createFakeSupabase } from './helpers/fake-supabase.js';

const ORIGIN = 'https://futuresdailyword.com';
const VICTIM = 'victim@example.com';
const DEVICE_RAW = 'a'.repeat(64); // the reader's own, pre-existing device token
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
const DEVICE_HASH = sha(DEVICE_RAW);

const JOURNAL = [{ id: 'j1', date: '2026-09-01', text: 'PRIVATE prayer about my marriage', updatedAt: '2026-09-01T10:00:00Z' }];

let db;
let userSync;
let userProfile;
let trackActivity;
let pcoSync;
let auth;
const realLoad = Module._load;
let ipCounter = 0;
const nextIp = () => `198.51.100.${(++ipCounter % 250) + 1}.${Math.floor(ipCounter / 250)}`;

beforeAll(() => {
  Module._load = function (request, ...rest) {
    if (request === '@supabase/supabase-js') {
      return { createClient: () => ({ from: (...a) => db.from(...a), rpc: (...a) => db.rpc(...a) }) };
    }
    return realLoad.call(this, request, ...rest);
  };
  process.env.SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_KEY = 'service-key';
  const req = createRequire(import.meta.url);
  userSync = req('../../netlify/functions/user-sync.js').handler;
  userProfile = req('../../netlify/functions/user-profile.js').handler;
  trackActivity = req('../../netlify/functions/track-activity.js').handler;
  pcoSync = req('../../netlify/functions/pco-sync.js').handler;
  auth = req('../../netlify/functions/lib/auth.js');
});

afterAll(() => { Module._load = realLoad; });

const resend = vi.fn();

function seed() {
  db = createFakeSupabase({
    profiles: [{
      email: VICTIM, first_name: 'Vic', last_name: 'Tim', phone: '555-0100', church: 'Futures', city: 'Alpharetta',
      campus: 'alpharetta', persona: 'congregation', lang: 'en', push_enabled: false,
      session_token_hashes: [DEVICE_HASH],
    }],
    user_data: [{
      email: VICTIM, journal: JOURNAL, highlights: { 'John 3:16': 'gold' }, streak: { count: 4 },
      active_plans: {}, book_plans: {}, reactions: {}, pathway_progress: {}, profile_pic: 'data:image/png;base64,PRIVATEPIC',
      misc: { dw_user_story: 'my private season story' }, sync_version: 3, updated_at: '2026-09-01T10:00:00Z',
    }],
  });
}

beforeEach(() => {
  seed();
  process.env.RESEND_API_KEY = 're_test';
  resend.mockReset();
  resend.mockResolvedValue({ ok: true, status: 200, json: async () => ({ id: 'em_1' }) });
  vi.stubGlobal('fetch', resend);
});

afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

async function call(handler, body, { token, ip, origin = ORIGIN } = {}) {
  const headers = { origin, 'x-forwarded-for': ip || nextIp() };
  if (token) headers.authorization = `Bearer ${token}`;
  const res = await handler({ httpMethod: 'POST', headers, body: JSON.stringify(body) });
  let json = {};
  try { json = JSON.parse(res.body); } catch { /* empty */ }
  return { status: res.statusCode, json, raw: res.body };
}

const profileRow = (email = VICTIM) => db.tables.profiles.find((p) => p.email === email);
const dataRow = (email = VICTIM) => db.tables.user_data.find((p) => p.email === email);
const hashes = (email = VICTIM) => profileRow(email).session_token_hashes;

/** A stranger who knows only the address: a fresh UNPROVEN token via migrate. */
async function strangerToken(email = VICTIM) {
  const r = await call(userSync, { action: 'pull', email });
  expect(r.status).toBe(403);
  expect(r.json.sessionToken).toMatch(/^[0-9a-f]{64}$/);
  return r.json.sessionToken;
}

/** The six digits in the one Resend call. */
function sentCode(callIndex = 0) {
  const payload = JSON.parse(resend.mock.calls[callIndex][1].body);
  return payload.text.match(/\b(\d{6})\b/)[1];
}

describe('an unproven session (someone who only knows the email)', () => {
  it('cannot pull, push or merge a reader\'s journal through migrate', async () => {
    const before = JSON.stringify(dataRow());

    const pull = await call(userSync, { action: 'pull', email: VICTIM });
    expect(pull.status).toBe(403);
    expect(pull.json.error).toBe('proof_required');
    for (const secret of ['PRIVATE', 'journal', 'highlights', 'profilePic', 'PRIVATEPIC', 'season story']) {
      expect(pull.raw).not.toContain(secret);
    }

    const push = await call(userSync, {
      action: 'push', email: VICTIM,
      data: { journal: [{ id: 'evil', date: '2026-10-01', text: 'forged', updatedAt: '2026-10-01T00:00:00Z' }] },
    });
    expect(push.status).toBe(403);

    const merge = await call(userSync, { action: 'merge', email: VICTIM, localJournal: [{ id: 'evil2', text: 'x' }] });
    expect(merge.status).toBe(403);

    expect(JSON.stringify(dataRow())).toBe(before);
  });

  it('gets an unproven token that is stored apart from the real device tokens', async () => {
    const token = await strangerToken();
    expect(hashes()).toContain(DEVICE_HASH);
    expect(hashes()).toContain('u:' + sha(token));
    expect(hashes()).not.toContain(sha(token));
  });

  it('register for an existing email returns a token that opens nothing', async () => {
    const reg = await call(userProfile, { action: 'register', email: VICTIM, firstName: 'Mallory', phone: '999' });
    expect(reg.status).toBe(200);
    expect(reg.json.sessionToken).toMatch(/^[0-9a-f]{64}$/);
    const token = reg.json.sessionToken;
    expect(hashes()).toContain('u:' + sha(token));

    expect((await call(userSync, { action: 'pull', email: VICTIM }, { token })).status).toBe(403);
    const push = await call(userSync, { action: 'push', email: VICTIM, data: { journal: [{ id: 'e', text: 'forged' }] } }, { token });
    expect(push.status).toBe(403);
    expect(dataRow().journal).toEqual(JOURNAL);

    // the profile read returns no phone, church, city or campus
    const get = await call(userProfile, { action: 'get', email: VICTIM }, { token });
    expect(get.status).toBe(200);
    expect(get.json.proofRequired).toBe(true);
    expect(get.json.profile).toBeUndefined();
    for (const v of ['555-0100', 'Futures', 'Alpharetta', 'alpharetta']) expect(get.raw).not.toContain(v);

    // the profile write is refused and the row is unchanged
    const snapshot = JSON.stringify({ ...profileRow(), last_active_at: undefined, session_token_hashes: undefined });
    const upd = await call(userProfile, { action: 'update', email: VICTIM, firstName: 'Mallory', phone: '999', campus: 'elsewhere' }, { token });
    expect(upd.status).toBe(403);
    expect(JSON.stringify({ ...profileRow(), last_active_at: undefined, session_token_hashes: undefined })).toBe(snapshot);
  });

  it('can only say "I was active": a heartbeat drops persona, language and campus', async () => {
    const token = await strangerToken();
    const hb = await call(userProfile, { action: 'heartbeat', email: VICTIM, persona: 'comfort', lang: 'es', campus: 'elsewhere' }, { token });
    expect(hb.status).toBe(200);
    expect(profileRow().persona).toBe('congregation');
    expect(profileRow().lang).toBe('en');
    expect(profileRow().campus).toBe('alpharetta');
    expect(profileRow().last_active_at).toBeTruthy();
  });
});

describe('proving the email with a typed code', () => {
  it('sends one code to the profile address, with no link, and unlocks the journal once typed', async () => {
    const token = await strangerToken();

    // the address comes from the token, never the body
    const send = await call(userProfile, { action: 'proof-send', email: 'someone-else@example.com' }, { token });
    expect(send.status).toBe(200);
    expect(resend).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(resend.mock.calls[0][1].body);
    expect(payload.to).toEqual([VICTIM]);
    expect(payload.subject).toBe('Your Daily Word code');
    expect(payload.from).toContain('futuresdailyword.com');
    expect(payload.text).toMatch(/\b\d{6}\b/);
    expect(payload.html).toMatch(/\d{6}/);
    for (const field of [payload.text, payload.html]) {
      expect(field.toLowerCase()).not.toContain('http');
      expect(field.toLowerCase()).not.toContain('href');
    }
    expect(payload.text).toContain('If you did not ask for it, ignore this email');

    const code = sentCode();
    const wrong = String((Number(code) + 1) % 1000000).padStart(6, '0');
    const bad = await call(userProfile, { action: 'proof-verify', code: wrong }, { token });
    expect(bad.status).toBe(400);
    expect(hashes()).toContain('u:' + sha(token));
    expect((await call(userSync, { action: 'pull' }, { token })).status).toBe(403);

    const ok = await call(userProfile, { action: 'proof-verify', code }, { token });
    expect(ok.status).toBe(200);
    expect(ok.json.success).toBe(true);
    expect(hashes()).toContain(sha(token));
    expect(hashes()).not.toContain('u:' + sha(token));
    expect(hashes()).toContain(DEVICE_HASH);

    const pull = await call(userSync, { action: 'pull' }, { token });
    expect(pull.status).toBe(200);
    expect(pull.json.data.journal).toEqual(JOURNAL);

    const push = await call(userSync, {
      action: 'push',
      data: { journal: [...JOURNAL, { id: 'j2', date: '2026-10-01', text: 'new', updatedAt: '2026-10-01T00:00:00Z' }] },
    }, { token });
    expect(push.status).toBe(200);
    expect(dataRow().journal).toHaveLength(2);

    // a code works once
    const again = await call(userProfile, { action: 'proof-verify', code }, { token });
    expect(again.json.alreadyProven).toBe(true);
    expect(resend).toHaveBeenCalledTimes(1);
  });

  it('writes the email in the profile language', async () => {
    profileRow().lang = 'es';
    const token = await strangerToken();
    await call(userProfile, { action: 'proof-send' }, { token });
    const payload = JSON.parse(resend.mock.calls[0][1].body);
    expect(payload.subject).toBe('Tu código de Daily Word');
    expect(payload.text).toContain('Si no lo pediste');
  });

  it('a proven device asking for a code is told it is already proven and nothing is sent', async () => {
    const res = await call(userProfile, { action: 'proof-send' }, { token: DEVICE_RAW });
    expect(res.json.alreadyProven).toBe(true);
    expect(resend).not.toHaveBeenCalled();
  });

  it('refuses proof-send and proof-verify with no token', async () => {
    expect((await call(userProfile, { action: 'proof-send', email: VICTIM })).status).toBe(401);
    expect((await call(userProfile, { action: 'proof-verify', email: VICTIM, code: '123456' })).status).toBe(401);
    expect(resend).not.toHaveBeenCalled();
  });
});

describe('limits on the code', () => {
  it('refuses a code older than 10 minutes', async () => {
    vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-10-02T09:00:00Z') });
    const token = await strangerToken();
    await call(userProfile, { action: 'proof-send' }, { token });
    const code = sentCode();

    vi.setSystemTime(new Date('2026-10-02T09:10:30Z'));
    const late = await call(userProfile, { action: 'proof-verify', code }, { token });
    expect(late.status).toBe(400);
    expect(hashes()).not.toContain(sha(token));
  });

  it('refuses the 6th try, even with the right code', async () => {
    const token = await strangerToken();
    await call(userProfile, { action: 'proof-send' }, { token });
    const code = sentCode();
    const wrong = String((Number(code) + 1) % 1000000).padStart(6, '0');
    for (let i = 0; i < 5; i++) {
      expect((await call(userProfile, { action: 'proof-verify', code: wrong }, { token })).status).toBe(400);
    }
    const sixth = await call(userProfile, { action: 'proof-verify', code }, { token });
    expect(sixth.status).toBe(429);
    expect(hashes()).not.toContain(sha(token));
  });

  it('binds a code to the token that asked for it', async () => {
    const tokenA = await strangerToken();
    const tokenB = await strangerToken();
    await call(userProfile, { action: 'proof-send' }, { token: tokenA });
    const code = sentCode();

    const stolen = await call(userProfile, { action: 'proof-verify', code }, { token: tokenB });
    expect(stolen.status).toBe(400);
    expect(hashes()).not.toContain(sha(tokenB));

    const mine = await call(userProfile, { action: 'proof-verify', code }, { token: tokenA });
    expect(mine.status).toBe(200);
  });

  it('refuses the 4th code email in 15 minutes', async () => {
    const token = await strangerToken();
    for (let i = 0; i < 3; i++) {
      expect((await call(userProfile, { action: 'proof-send' }, { token })).status).toBe(200);
    }
    const fourth = await call(userProfile, { action: 'proof-send' }, { token });
    expect(fourth.status).toBe(429);
    expect(resend).toHaveBeenCalledTimes(3);
  });

  it('only the newest code for a token is valid', async () => {
    const token = await strangerToken();
    await call(userProfile, { action: 'proof-send' }, { token });
    await call(userProfile, { action: 'proof-send' }, { token });
    const [first, second] = [sentCode(0), sentCode(1)];
    if (first !== second) {
      expect((await call(userProfile, { action: 'proof-verify', code: first }, { token })).status).toBe(400);
    }
    expect((await call(userProfile, { action: 'proof-verify', code: second }, { token })).status).toBe(200);
  });

  it('without RESEND_API_KEY answers 503 and stores no code', async () => {
    delete process.env.RESEND_API_KEY;
    const token = await strangerToken();
    const res = await call(userProfile, { action: 'proof-send' }, { token });
    expect(res.status).toBe(503);
    expect(resend).not.toHaveBeenCalled();
    expect(db.tables.rate_limit_hits.filter((r) => r.key.startsWith('dwproof-code:'))).toHaveLength(0);
  });

  it('stores no code when Resend refuses the email', async () => {
    resend.mockResolvedValue({ ok: false, status: 422, json: async () => ({}) });
    const token = await strangerToken();
    const res = await call(userProfile, { action: 'proof-send' }, { token });
    expect(res.status).toBe(502);
    expect(db.tables.rate_limit_hits.filter((r) => r.key.startsWith('dwproof-code:'))).toHaveLength(0);
  });

  it('fails closed when the attempt cannot be recorded', async () => {
    const token = await strangerToken();
    await call(userProfile, { action: 'proof-send' }, { token });
    const code = sentCode();
    db.failOn('rate_limit_hits', 'insert');
    const res = await call(userProfile, { action: 'proof-verify', code }, { token });
    expect(res.status).toBe(503);
    expect(hashes()).not.toContain(sha(token));
  });

  it('fails closed when the send limiter cannot be read', async () => {
    const token = await strangerToken();
    db.failOn('rate_limit_hits', 'insert');
    const res = await call(userProfile, { action: 'proof-send' }, { token });
    expect(res.status).toBe(503);
    expect(resend).not.toHaveBeenCalled();
  });
});

describe('readers who are not affected', () => {
  it('a device that already holds a plain token still pulls, pushes and merges', async () => {
    const pull = await call(userSync, { action: 'pull' }, { token: DEVICE_RAW });
    expect(pull.status).toBe(200);
    expect(pull.json.data.journal).toEqual(JOURNAL);
    expect(pull.json.data.profilePic).toContain('PRIVATEPIC');

    const push = await call(userSync, {
      action: 'push',
      data: { journal: [...JOURNAL, { id: 'j3', date: '2026-10-02', text: 'more', updatedAt: '2026-10-02T00:00:00Z' }] },
    }, { token: DEVICE_RAW });
    expect(push.status).toBe(200);
    expect(dataRow().journal).toHaveLength(2);

    const merge = await call(userSync, { action: 'merge', localJournal: [{ id: 'j4', date: '2026-10-03', text: 'merged', updatedAt: '2026-10-03T00:00:00Z' }] }, { token: DEVICE_RAW });
    expect(merge.status).toBe(200);
    expect(dataRow().journal.map((e) => e.id)).toContain('j4');

    const get = await call(userProfile, { action: 'get' }, { token: DEVICE_RAW });
    expect(get.json.profile.phone).toBe('555-0100');
    const upd = await call(userProfile, { action: 'update', campus: 'newcampus' }, { token: DEVICE_RAW });
    expect(upd.status).toBe(200);
    expect(profileRow().campus).toBe('newcampus');
  });

  it('ten stranger migrations never push out the reader\'s real device token', async () => {
    for (let i = 0; i < 10; i++) await strangerToken();
    expect(hashes()).toContain(DEVICE_HASH);
    expect(hashes().filter((h) => h.startsWith('u:'))).toHaveLength(3);
    expect((await call(userSync, { action: 'pull' }, { token: DEVICE_RAW })).status).toBe(200);
  });

  it('proven tokens keep their own cap of five', async () => {
    for (let i = 0; i < 7; i++) await auth.issueToken(db, VICTIM, { proven: true });
    expect(hashes().filter((h) => !h.startsWith('u:'))).toHaveLength(5);
    await auth.issueToken(db, VICTIM, { proven: false });
    expect(hashes().filter((h) => !h.startsWith('u:'))).toHaveLength(5);
  });

  it('a brand-new reader gets a proven token and can sync straight away', async () => {
    const reg = await call(userProfile, { action: 'register', email: 'fresh@example.com', firstName: 'Fresh' });
    expect(reg.status).toBe(200);
    const token = reg.json.sessionToken;
    expect(hashes('fresh@example.com')).toContain(sha(token));

    expect((await call(userSync, { action: 'pull' }, { token })).status).toBe(404); // no cloud row yet: a normal first run
    const push = await call(userSync, {
      action: 'push', data: { journal: [{ id: 'f1', date: '2026-10-02', text: 'first', updatedAt: '2026-10-02T00:00:00Z' }] },
    }, { token });
    expect(push.status).toBe(200);
    const pull = await call(userSync, { action: 'pull' }, { token });
    expect(pull.status).toBe(200);
    expect(pull.json.data.journal).toHaveLength(1);
  });

  it('a new reader still gets a token when the migration limiter is spent for their wifi', async () => {
    const ip = '203.0.113.77';
    for (let i = 0; i < 6; i++) auth.checkMigrationRate(ip);
    const reg = await call(userProfile, { action: 'register', email: 'church-wifi@example.com', firstName: 'Wifi' }, { ip });
    expect(reg.json.sessionToken).toMatch(/^[0-9a-f]{64}$/);
    expect(hashes('church-wifi@example.com')).toContain(sha(reg.json.sessionToken));

    // ...but an existing address on that same spent wifi gets nothing
    const existing = await call(userProfile, { action: 'register', email: VICTIM, firstName: 'x' }, { ip });
    expect(existing.json.sessionToken).toBeUndefined();
  });

  it('track-activity and pco-sync still accept an unproven token', async () => {
    const token = await strangerToken();
    expect(await auth.authenticateRequest({ headers: { authorization: `Bearer ${token}` } }, db)).toBe(VICTIM);

    const track = await call(trackActivity, { events: [{ type: 'app_open' }] }, { token });
    expect(track.status).toBe(200);
    expect(db.tables.activity_events).toHaveLength(1);

    // pco-sync caps anonymous callers at 5/min per IP; a token holder is never capped
    const ip = '203.0.113.88';
    for (let i = 0; i < 8; i++) {
      const r = await call(pcoSync, { action: 'lookup', email: VICTIM }, { token, ip });
      expect(r.status).toBe(200);
    }
  });
});
