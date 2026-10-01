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
 * hashes and stay PROVEN. A brand-new email's first device gets a provisional
 * "r:<hash>" token: it syncs straight away, and it is revoked the moment anyone
 * types a code for that address (so registering a stranger's address first buys
 * nothing).
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
let intake;
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
  intake = req('../../netlify/functions/intake.js').handler;
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

async function call(handler, body, { token, ip, origin = ORIGIN, headers: extra = {} } = {}) {
  const headers = { origin, 'x-forwarded-for': ip || nextIp(), ...extra };
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

  it('refuses the 4th code email in 15 minutes from one connection', async () => {
    const token = await strangerToken();
    const ip = '203.0.113.40';
    for (let i = 0; i < 3; i++) {
      expect((await call(userProfile, { action: 'proof-send' }, { token, ip })).status).toBe(200);
    }
    const fourth = await call(userProfile, { action: 'proof-send' }, { token, ip });
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
    // fresh unproven tokens get 10 minutes' grace, but never past the hard ceiling of five
    expect(hashes().filter((h) => h.startsWith('u:'))).toHaveLength(5);
    expect((await call(userSync, { action: 'pull' }, { token: DEVICE_RAW })).status).toBe(200);
  });

  it('proven tokens keep their own cap of five', async () => {
    for (let i = 0; i < 7; i++) await auth.issueToken(db, VICTIM, { proven: true });
    expect(hashes().filter((h) => !h.startsWith('u:'))).toHaveLength(5);
    await auth.issueToken(db, VICTIM, { proven: false });
    expect(hashes().filter((h) => !h.startsWith('u:'))).toHaveLength(5);
  });

  it('a brand-new reader gets a first-device token and can sync straight away', async () => {
    const reg = await call(userProfile, { action: 'register', email: 'fresh@example.com', firstName: 'Fresh' });
    expect(reg.status).toBe(200);
    const token = reg.json.sessionToken;
    expect(hashes('fresh@example.com')).toEqual(['r:' + sha(token)]);

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
    expect(hashes('church-wifi@example.com')).toContain('r:' + sha(reg.json.sessionToken));

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

    // pco-sync caps anonymous and unproven callers at 5/min per IP; only a proven
    // device token lifts the cap
    const ip = '203.0.113.88';
    for (let i = 0; i < 8; i++) {
      const r = await call(pcoSync, { action: 'lookup', email: VICTIM }, { token: DEVICE_RAW, ip });
      expect(r.status).toBe(200);
    }
  });

  it('pco-sync keeps its 5 a minute limit for an unproven token (free to mint for any known address)', async () => {
    const token = await strangerToken();
    const ip = '203.0.113.89';
    const statuses = [];
    for (let i = 0; i < 8; i++) statuses.push((await call(pcoSync, { action: 'lookup', email: VICTIM }, { token, ip })).status);
    expect(statuses.slice(0, 5)).toEqual([200, 200, 200, 200, 200]);
    expect(statuses.slice(5)).toEqual([429, 429, 429]);
  });

  it('pco-sync does not lift the limit for a first-device token either (new addresses are free to register)', async () => {
    const reg = await call(userProfile, { action: 'register', email: 'squatter@example.com', firstName: 'S' });
    const ip = '203.0.113.90';
    const statuses = [];
    for (let i = 0; i < 7; i++) statuses.push((await call(pcoSync, { action: 'lookup', email: VICTIM }, { token: reg.json.sessionToken, ip })).status);
    expect(statuses.slice(5)).toEqual([429, 429]);
  });
});

describe('registering an address before its owner does (the squat)', () => {
  const NEWBIE = 'newbie@example.com';

  async function attackerRegistersFirst() {
    const reg = await call(userProfile, { action: 'register', email: NEWBIE, firstName: 'Mallory' });
    expect(reg.status).toBe(200);
    return reg.json.sessionToken;
  }

  /** The real owner turns up later: register (existing email) gives an unproven token, then the typed code. */
  async function ownerProves() {
    const reg = await call(userProfile, { action: 'register', email: NEWBIE, firstName: 'Nora' });
    const token = reg.json.sessionToken;
    expect(token).toMatch(/^[0-9a-f]{64}$/);
    expect((await call(userProfile, { action: 'proof-send' }, { token })).status).toBe(200);
    const code = sentCode(resend.mock.calls.length - 1);
    const ok = await call(userProfile, { action: 'proof-verify', code }, { token });
    expect(ok.status).toBe(200);
    return token;
  }

  it('the squatter syncs until the owner proves the inbox, then the squatter is locked out', async () => {
    const attacker = await attackerRegistersFirst();
    // before any proof the squatter's token works (it is the first device) ...
    const push = await call(userSync, { action: 'push', data: { journal: [{ id: 'm1', date: '2026-10-02', text: 'planted', updatedAt: '2026-10-02T00:00:00Z' }] } }, { token: attacker });
    expect(push.status).toBe(200);

    // ... the owner registers later and gets only an unproven token
    const owner = await ownerProves();

    // the squatter's token is gone: pull and push both refuse, and the stored copy is not theirs to read
    const pull = await call(userSync, { action: 'pull', email: NEWBIE }, { token: attacker });
    expect(pull.status).toBe(403);
    expect(pull.json.error).toBe('proof_required');
    const push2 = await call(userSync, { action: 'push', email: NEWBIE, data: { journal: [{ id: 'm2', text: 'again' }] } }, { token: attacker });
    expect(push2.status).toBe(403);
    expect(hashes(NEWBIE).some((h) => h.startsWith('r:'))).toBe(false);

    // the owner is in
    expect((await call(userSync, { action: 'pull' }, { token: owner })).status).toBe(200);
  });

  it('revokes every first-device token for the address, and leaves proven device tokens alone', async () => {
    await attackerRegistersFirst();
    await auth.issueToken(db, NEWBIE, { first: true });
    // a device token proven before this change (issuing a proven token now ends every "r:" token, so seed it)
    const plain = 'p'.repeat(64);
    db.tables.profiles.find((p) => p.email === NEWBIE).session_token_hashes.push(sha(plain));
    expect(hashes(NEWBIE).filter((h) => h.startsWith('r:'))).toHaveLength(2);

    await ownerProves();
    expect(hashes(NEWBIE).filter((h) => h.startsWith('r:'))).toHaveLength(0);
    expect(hashes(NEWBIE)).toContain(sha(plain));
  });

  it('the real first device only pays one code: its revoked token falls back to the code sheet', async () => {
    const first = await attackerRegistersFirst(); // here "attacker" is the genuine first device
    expect((await call(userSync, { action: 'push', data: { journal: [] } }, { token: first })).status).toBe(200);
    await ownerProves(); // their second device
    const back = await call(userSync, { action: 'pull', email: NEWBIE }, { token: first });
    expect(back.status).toBe(403);
  });

  it('a proof on another address never touches this address\'s first-device token', async () => {
    const mine = await attackerRegistersFirst();
    const token = await strangerToken(); // proves VICTIM, not NEWBIE
    await call(userProfile, { action: 'proof-send' }, { token });
    await call(userProfile, { action: 'proof-verify', code: sentCode() }, { token });
    expect(hashes(NEWBIE)).toContain('r:' + sha(mine));
  });

  it('caps first-device tokens at three and does not touch other classes', async () => {
    // an address nobody has proved yet (a proven device would make it no longer "first")
    const FRESH = 'cap@example.com';
    const waiting = 'u:' + 'e'.repeat(64);
    db.tables.profiles.push({ email: FRESH, first_name: 'Cap', session_token_hashes: [waiting] });
    for (let i = 0; i < 5; i++) await auth.issueToken(db, FRESH, { first: true });
    expect(hashes(FRESH).filter((h) => h.startsWith('r:'))).toHaveLength(3);
    expect(hashes(FRESH)).toContain(waiting);
  });

  it('an address that already has a proven device never gets a first-device token', async () => {
    const t = await auth.issueToken(db, VICTIM, { first: true });
    expect(hashes()).toContain('u:' + sha(t));
    expect(hashes().some((h) => h.startsWith('r:'))).toBe(false);
    expect(hashes()).toContain(DEVICE_HASH);
  });

  it('a first-device token reads as proven but provisional', async () => {
    const token = await attackerRegistersFirst();
    const session = await auth.authenticateSession({ headers: { authorization: `Bearer ${token}` } }, db);
    expect(session).toMatchObject({ email: NEWBIE, proven: true, provisional: true });
    const plain = await auth.authenticateSession({ headers: { authorization: `Bearer ${DEVICE_RAW}` } }, db);
    expect(plain).toMatchObject({ proven: true, provisional: false });
  });
});

describe('register does not reveal a stored name', () => {
  it('for an existing address echoes only what the request sent', async () => {
    const reg = await call(userProfile, { action: 'register', email: VICTIM });
    expect(reg.status).toBe(200);
    expect(reg.raw).not.toContain('Vic');
    expect(reg.raw).not.toContain('Tim');
    expect(reg.json.profile).toEqual({ firstName: '', lastName: '', email: VICTIM });

    const named = await call(userProfile, { action: 'register', email: VICTIM, firstName: 'Mallory', lastName: 'X' });
    expect(named.json.profile).toEqual({ firstName: 'Mallory', lastName: 'X', email: VICTIM });
    expect(profileRow().first_name).toBe('Vic'); // and still fill-only
  });
});

describe('a stranger cannot stop the real reader from proving', () => {
  it('a token with a live emailed code is not pushed out by stranger migrations', async () => {
    const reader = await strangerToken();
    await call(userProfile, { action: 'proof-send' }, { token: reader });
    const code = sentCode();
    for (let i = 0; i < 6; i++) await strangerToken();
    expect(hashes()).toContain('u:' + sha(reader));
    expect(hashes().filter((h) => h.startsWith('u:')).length).toBeLessThanOrEqual(5);
    const ok = await call(userProfile, { action: 'proof-verify', code }, { token: reader });
    expect(ok.status).toBe(200);
  });

  it('a token with no live code, minted over 10 minutes ago, is still evicted first', async () => {
    vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-10-02T09:00:00Z') });
    const idle = await strangerToken();
    vi.setSystemTime(new Date('2026-10-02T09:11:00Z'));
    for (let i = 0; i < 3; i++) await strangerToken();
    expect(hashes()).not.toContain('u:' + sha(idle));
    expect(hashes().filter((h) => h.startsWith('u:'))).toHaveLength(3);
  });

  it('an expired code no longer protects its token', async () => {
    vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-10-02T09:00:00Z') });
    const reader = await strangerToken();
    await call(userProfile, { action: 'proof-send' }, { token: reader });
    vi.setSystemTime(new Date('2026-10-02T09:11:00Z'));
    for (let i = 0; i < 4; i++) await strangerToken();
    expect(hashes()).not.toContain('u:' + sha(reader));
  });

  it('wrong tries on a stranger\'s token do not use up the reader\'s tries', async () => {
    const stranger = await strangerToken();
    await call(userProfile, { action: 'proof-send' }, { token: stranger });
    const wrong = String((Number(sentCode()) + 1) % 1000000).padStart(6, '0');
    for (let i = 0; i < 5; i++) await call(userProfile, { action: 'proof-verify', code: wrong }, { token: stranger });
    // the stranger is stopped on their own token...
    expect((await call(userProfile, { action: 'proof-verify', code: wrong }, { token: stranger })).status).toBe(429);
    // ...but the reader, on another token for the same address, can still prove
    const reader = await strangerToken();
    await call(userProfile, { action: 'proof-send' }, { token: reader });
    const ok = await call(userProfile, { action: 'proof-verify', code: sentCode(1) }, { token: reader });
    expect(ok.status).toBe(200);
  });

  it('one IP cannot ask for more than 20 code emails an hour, across addresses', async () => {
    const ip = '203.0.113.150';
    let refused = 0;
    for (let i = 0; i < 24; i++) {
      const email = `reader${i}@example.com`;
      db.tables.profiles.push({ email, session_token_hashes: [], lang: 'en' });
      const token = await auth.issueToken(db, email, { proven: false });
      const r = await call(userProfile, { action: 'proof-send' }, { token, ip });
      if (r.status === 429) refused++;
    }
    expect(refused).toBe(4);
    expect(resend).toHaveBeenCalledTimes(20);

    // another IP is unaffected
    db.tables.profiles.push({ email: 'other@example.com', session_token_hashes: [], lang: 'en' });
    const t2 = await auth.issueToken(db, 'other@example.com', { proven: false });
    expect((await call(userProfile, { action: 'proof-send' }, { token: t2, ip: '203.0.113.151' })).status).toBe(200);
  });
});

describe('a pastor who signs in with a staff password keeps the one-step sync', () => {
  const STAFF = 'pastor@futures.church';
  const STAFF_RAW = 'b'.repeat(64);

  function seedStaff({ withProfile = true } = {}) {
    db.tables.staff_roster = [{ email: STAFF, role: 'campus', campus_id: 'alpharetta', display_name: 'Pat Pastor' }];
    db.tables.staff_sessions = [{ token_hash: sha(STAFF_RAW), email: STAFF, expires_at: new Date(Date.now() + 3600e3).toISOString() }];
    if (withProfile) db.tables.profiles.push({ email: STAFF, first_name: 'Pat', session_token_hashes: [] });
    db.tables.user_data.push({ email: STAFF, journal: JOURNAL, sync_version: 1 });
  }

  it('hands a proven Daily Word token for the staff address, so sync needs no code', async () => {
    seedStaff();
    const r = await call(intake, { action: 'sync_token' }, { token: STAFF_RAW });
    expect(r.status).toBe(200);
    expect(r.json.token).toMatch(/^[0-9a-f]{64}$/);
    expect(hashes(STAFF)).toEqual([sha(r.json.token)]);
    expect((await call(userSync, { action: 'pull' }, { token: r.json.token })).status).toBe(200);
  });

  it('ends a squatter who registered the staff address first', async () => {
    seedStaff({ withProfile: false });
    // Mallory registers the pastor's address before the pastor has a profile and gets a first-device token
    const reg = await call(userProfile, { action: 'register', email: STAFF, firstName: 'Mallory' });
    expect(reg.status).toBe(200);
    const squat = reg.json.sessionToken;
    expect(hashes(STAFF)).toEqual(['r:' + sha(squat)]);
    // the pastor signs in with the staff password and swaps for a proven token
    const r = await call(intake, { action: 'sync_token' }, { token: STAFF_RAW });
    expect(r.status).toBe(200);
    expect(hashes(STAFF)).toEqual([sha(r.json.token)]);
    // Mallory is out: no pull, no push; the pastor is in
    expect((await call(userSync, { action: 'pull' }, { token: squat })).status).not.toBe(200);
    expect((await call(userSync, { action: 'push', data: { journal: [{ id: 'x', text: 'planted' }] } }, { token: squat })).status).not.toBe(200);
    expect((await call(userSync, { action: 'pull' }, { token: r.json.token })).status).toBe(200);
  });

  it('a register that retries after the owner proved gets an unproven token, never a first-device one', async () => {
    seedStaff();
    // the pastor has already signed in with the staff password and holds a proven token
    const proven = await call(intake, { action: 'sync_token' }, { token: STAFF_RAW });
    expect(hashes(STAFF)).toEqual([sha(proven.json.token)]);
    // a squatter's register that was mid-flight re-reads and appends: it must not be "r:"
    const late = await auth.issueToken(db, STAFF, { first: true });
    expect(hashes(STAFF)).toContain('u:' + sha(late));
    expect(hashes(STAFF).some((h) => h.startsWith('r:'))).toBe(false);
    expect((await call(userSync, { action: 'pull' }, { token: late })).status).toBe(403);
  });

  it('takes the address from the staff session, never from the request', async () => {
    seedStaff();
    const r = await call(intake, { action: 'sync_token', email: VICTIM }, { token: STAFF_RAW });
    expect(hashes(VICTIM)).toEqual([DEVICE_HASH]);
    expect(hashes(STAFF)).toContain(sha(r.json.token));
  });

  it('is refused without a staff session', async () => {
    seedStaff();
    expect((await call(intake, { action: 'sync_token' })).status).toBe(401);
    expect((await call(intake, { action: 'sync_token' }, { token: 'c'.repeat(64) })).status).toBe(401);
    expect(hashes(STAFF)).toEqual([]);
  });

  it('gives nothing when there is no profile yet (register creates it and its first-device token)', async () => {
    seedStaff({ withProfile: false });
    const r = await call(intake, { action: 'sync_token' }, { token: STAFF_RAW });
    expect(r.status).toBe(200);
    expect(r.json.token).toBeNull();
    expect(db.tables.profiles.find((p) => p.email === STAFF)).toBeUndefined();
  });
});

// ── Hardening, 1 Oct 2026 (adversarial check F1-F6) ──────────────────────────

/** Netlify's own connection address (x-nf-client-connection-ip), with a different, client-chosen x-forwarded-for each call. */
const fromNetlify = (nfIp) => ({ headers: { 'x-nf-client-connection-ip': nfIp } });

describe('F1: per-IP limits key on an address the client cannot choose', () => {
  it('proof-send: 20 an hour per connection, however x-forwarded-for is spoofed', async () => {
    const nf = '198.18.1.1';
    let refused = 0;
    for (let i = 0; i < 24; i++) {
      const email = `spoof${i}@example.com`;
      db.tables.profiles.push({ email, session_token_hashes: [], lang: 'en' });
      const token = await auth.issueToken(db, email, { proven: false });
      const r = await call(userProfile, { action: 'proof-send' }, { token, ...fromNetlify(nf) });
      if (r.status === 429) refused++;
    }
    expect(refused).toBe(4);
    expect(resend).toHaveBeenCalledTimes(20);
  });

  it('migrate (user-sync): five unproven tokens a minute per connection, however x-forwarded-for is spoofed', async () => {
    const nf = '198.18.1.2';
    const tokens = [];
    for (let i = 0; i < 6; i++) tokens.push((await call(userSync, { action: 'pull', email: VICTIM }, fromNetlify(nf))).json.sessionToken);
    expect(tokens.slice(0, 5).every((t) => /^[0-9a-f]{64}$/.test(t))).toBe(true);
    expect(tokens[5]).toBeUndefined();
  });

  it('register of an existing address: the migration limit holds per connection', async () => {
    const nf = '198.18.1.3';
    const tokens = [];
    for (let i = 0; i < 6; i++) tokens.push((await call(userProfile, { action: 'register', email: VICTIM }, fromNetlify(nf))).json.sessionToken);
    expect(tokens.filter(Boolean)).toHaveLength(5);
    expect(tokens[5]).toBeUndefined();
  });

  it('pco-sync: the anonymous 5 a minute holds per connection', async () => {
    const nf = '198.18.1.4';
    const statuses = [];
    for (let i = 0; i < 8; i++) statuses.push((await call(pcoSync, { action: 'lookup', email: VICTIM }, fromNetlify(nf))).status);
    expect(statuses.slice(5)).toEqual([429, 429, 429]);
  });

  it('falls back to client-ip, then x-forwarded-for', () => {
    const { clientIp } = createRequire(import.meta.url)('../../netlify/functions/lib/client-ip.js');
    expect(clientIp({ headers: { 'x-nf-client-connection-ip': '1.1.1.1', 'client-ip': '2.2.2.2', 'x-forwarded-for': '3.3.3.3, 4.4.4.4' } })).toBe('1.1.1.1');
    expect(clientIp({ headers: { 'client-ip': '2.2.2.2', 'x-forwarded-for': '3.3.3.3' } })).toBe('2.2.2.2');
    expect(clientIp({ headers: { 'x-forwarded-for': '3.3.3.3, 4.4.4.4' } })).toBe('3.3.3.3');
    expect(clientIp({ headers: {} })).toBe('unknown');
  });

  it('an address that has never held a proven token gets one code per 15 minutes and two a day', async () => {
    vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-10-02T09:00:00Z') });
    const STRANGER = 'never-signed-up@example.com';
    // anyone can do this for any address: register it (new), register it again (existing) for an unproven token
    expect((await call(userProfile, { action: 'register', email: STRANGER })).status).toBe(200);
    const unproven = async () => (await call(userProfile, { action: 'register', email: STRANGER })).json.sessionToken;

    const a = await unproven();
    expect((await call(userProfile, { action: 'proof-send' }, { token: a })).status).toBe(200);
    const b = await unproven();
    const second = await call(userProfile, { action: 'proof-send' }, { token: b });
    expect(second.status).toBe(429);
    expect(resend).toHaveBeenCalledTimes(1);

    vi.setSystemTime(new Date('2026-10-02T09:16:00Z'));
    expect((await call(userProfile, { action: 'proof-send' }, { token: b })).status).toBe(200);

    vi.setSystemTime(new Date('2026-10-02T09:32:00Z'));
    const c = await unproven();
    expect((await call(userProfile, { action: 'proof-send' }, { token: c })).status).toBe(429);
    expect(resend).toHaveBeenCalledTimes(2);
    expect(db.tables.rate_limit_hits.filter((r) => r.key === `dwproof-send-new:${STRANGER}`)).toHaveLength(2);
  });

  it('an address with a proven device keeps the ordinary budget (three in 15 minutes)', async () => {
    const statuses = [];
    for (let i = 0; i < 3; i++) {
      const token = await strangerToken();
      statuses.push((await call(userProfile, { action: 'proof-send' }, { token })).status);
    }
    expect(statuses).toEqual([200, 200, 200]);
    expect(db.tables.rate_limit_hits.filter((r) => r.key.startsWith('dwproof-send-new:'))).toHaveLength(0);
  });

  it('fails closed when the proven-history read fails', async () => {
    const { sendProofCode } = createRequire(import.meta.url)('../../netlify/functions/lib/email-proof.js');
    db.failOn('profiles', 'select');
    const r = await sendProofCode(db, VICTIM, 'e'.repeat(64), 'en', '198.18.1.9');
    expect(r).toMatchObject({ ok: false, status: 503 });
    expect(resend).not.toHaveBeenCalled();
    expect(db.tables.rate_limit_hits).toHaveLength(0);
  });
});

describe('F3: a failed guarded write in issueToken stores nothing', () => {
  it('throws instead of writing a stale array blind, so a revoked squatter token never comes back', async () => {
    const NEWBIE = 'squat-f3@example.com';
    const squat = (await call(userProfile, { action: 'register', email: NEWBIE, firstName: 'Mallory' })).json.sessionToken;
    const stale = [...hashes(NEWBIE)]; // ['r:<squatter>'], what a slow concurrent issue read
    // the owner proves the inbox: the squatter's "r:" token is revoked
    const owner = (await call(userProfile, { action: 'register', email: NEWBIE })).json.sessionToken;
    await call(userProfile, { action: 'proof-send' }, { token: owner });
    expect((await call(userProfile, { action: 'proof-verify', code: sentCode() }, { token: owner })).status).toBe(200);
    const after = [...hashes(NEWBIE)];
    expect(after).toEqual([sha(owner)]);

    // a token issue that read the stale array, and whose guarded write errors
    db.answerOnce('profiles', 'select', { data: { session_token_hashes: stale }, error: null });
    db.failOnce('profiles', 'update');
    await expect(auth.issueToken(db, NEWBIE, { proven: false })).rejects.toThrow('Failed to store token');

    expect(hashes(NEWBIE)).toEqual(after);
    expect((await call(userSync, { action: 'pull' }, { token: squat })).status).not.toBe(200);
    expect((await call(userSync, { action: 'pull' }, { token: owner })).status).not.toBe(403);
  });

  it('sync_token answers { token: null } when the write fails', async () => {
    const STAFF = 'pastor-f3@futures.church';
    const RAW = 'd'.repeat(64);
    db.tables.staff_roster = [{ email: STAFF, role: 'campus', campus_id: 'alpharetta', display_name: 'P' }];
    db.tables.staff_sessions = [{ token_hash: sha(RAW), email: STAFF, expires_at: new Date(Date.now() + 3600e3).toISOString() }];
    db.tables.profiles.push({ email: STAFF, session_token_hashes: ['r:' + 'f'.repeat(64)] });
    db.failOnce('profiles', 'update');
    const r = await call(intake, { action: 'sync_token' }, { token: RAW });
    expect(r.status).toBe(200);
    expect(r.json.token).toBeNull();
    expect(hashes(STAFF)).toEqual(['r:' + 'f'.repeat(64)]);
  });
});

describe('F4: register by a stranger only says "active" for an existing address', () => {
  beforeEach(() => {
    Object.assign(profileRow(), { phone: '', church: '', city: '', push_enabled: false });
  });

  it('with no token: no empty field is filled and push stays off', async () => {
    const r = await call(userProfile, { action: 'register', email: VICTIM, phone: '999', church: 'Evil', city: 'Elsewhere', pushEnabled: true });
    expect(r.status).toBe(200);
    expect(profileRow()).toMatchObject({ phone: '', church: '', city: '', push_enabled: false, first_name: 'Vic' });
    expect(profileRow().last_active_at).toBeTruthy();
  });

  it('with an unproven token for the address: still nothing', async () => {
    const token = await strangerToken();
    await call(userProfile, { action: 'register', email: VICTIM, phone: '999', pushEnabled: true }, { token });
    expect(profileRow()).toMatchObject({ phone: '', push_enabled: false });
  });

  it('with a proven token for ANOTHER address: still nothing', async () => {
    const OTHER_RAW = '9'.repeat(64);
    db.tables.profiles.push({ email: 'other-f4@example.com', session_token_hashes: [sha(OTHER_RAW)] });
    await call(userProfile, { action: 'register', email: VICTIM, phone: '999', pushEnabled: true }, { token: OTHER_RAW });
    expect(profileRow()).toMatchObject({ phone: '', push_enabled: false });
  });

  it('the proven owner still fills empty fields and turns push on', async () => {
    await call(userProfile, { action: 'register', email: VICTIM, phone: '999', city: 'Roswell', firstName: 'Mallory', pushEnabled: true }, { token: DEVICE_RAW });
    expect(profileRow()).toMatchObject({ phone: '999', city: 'Roswell', push_enabled: true, first_name: 'Vic' });
  });
});

describe('F5: register never overwrites an existing profile', () => {
  it('a failed existence read is a 500, not a full overwrite', async () => {
    const before = JSON.stringify(profileRow());
    db.failOnce('profiles', 'select');
    const r = await call(userProfile, { action: 'register', email: VICTIM, firstName: 'Mallory', phone: '999', campus: 'elsewhere', pushEnabled: true });
    expect(r.status).toBe(500);
    expect(r.json.sessionToken).toBeUndefined();
    expect(JSON.stringify(profileRow())).toBe(before);
  });

  it('a register race (the read misses a row another request just wrote) falls back to the existing-address branch', async () => {
    db.answerOnce('profiles', 'select', { data: null, error: null });
    const r = await call(userProfile, { action: 'register', email: VICTIM, firstName: 'Mallory', phone: '999', campus: 'elsewhere' });
    expect(r.status).toBe(200);
    expect(profileRow()).toMatchObject({ first_name: 'Vic', phone: '555-0100', campus: 'alpharetta', push_enabled: false });
    // and the loser gets an unproven token, never a first-device one
    expect(hashes()).toContain('u:' + sha(r.json.sessionToken));
    expect(hashes().some((h) => h.startsWith('r:'))).toBe(false);
    expect(db.tables.profiles.filter((p) => p.email === VICTIM)).toHaveLength(1);
  });
});

describe('F6: pco-sync only copies a PCO person who holds this exact address, and only for its proven owner', () => {
  /** A PCO search answer: one person, holding `address`. */
  function pcoAnswers(address, { first = 'Victoria', last = 'Timms', campus = 'Gwinnett' } = {}) {
    const data = {
      data: [{ id: 'p1', type: 'Person', attributes: { first_name: first, last_name: last },
        relationships: { emails: { data: [{ id: 'e1' }] }, primary_campus: { data: { id: 'c1' } } } }],
      included: [
        { type: 'Email', id: 'e1', attributes: { address }, relationships: { person: { data: { id: 'p1' } } } },
        { type: 'Campus', id: 'c1', attributes: { name: campus } },
      ],
    };
    resend.mockImplementation(async () => ({ ok: true, status: 200, json: async () => data, text: async () => '' }));
  }

  beforeEach(() => { process.env.PCO_APP_ID = 'test-app'; process.env.PCO_SECRET = 'test-secret'; });
  afterEach(() => { delete process.env.PCO_APP_ID; delete process.env.PCO_SECRET; });

  it('a single search hit whose email is someone else\'s is not a match', async () => {
    pcoAnswers('someone.else@example.com', { first: 'Mallory' });
    const look = await call(pcoSync, { action: 'lookup', email: VICTIM });
    expect(look.json.found).toBe(false);
    expect(look.raw).not.toContain('Mallory');
    const sync = await call(pcoSync, { action: 'sync', email: VICTIM }, { token: DEVICE_RAW });
    expect(sync.json.synced).toBe(false);
    expect(profileRow().first_name).toBe('Vic');
  });

  it('with no token, sync returns the lookup and writes nothing to an existing profile', async () => {
    pcoAnswers(VICTIM);
    const before = JSON.stringify(profileRow());
    const r = await call(pcoSync, { action: 'sync', email: VICTIM });
    expect(r.status).toBe(200);
    expect(r.json.synced).toBe(false);
    expect(r.json.profile).toMatchObject({ firstName: 'Victoria', campus: 'us-gwinnett' });
    expect(JSON.stringify(profileRow())).toBe(before);
  });

  it('an unproven token, or a proven one for another address, writes nothing either', async () => {
    pcoAnswers(VICTIM);
    const before = JSON.stringify({ ...profileRow(), session_token_hashes: undefined });
    const token = await strangerToken();
    await call(pcoSync, { action: 'sync', email: VICTIM }, { token });
    const OTHER_RAW = '8'.repeat(64);
    db.tables.profiles.push({ email: 'other-f6@example.com', session_token_hashes: [sha(OTHER_RAW)] });
    await call(pcoSync, { action: 'sync', email: VICTIM }, { token: OTHER_RAW });
    expect(JSON.stringify({ ...profileRow(), session_token_hashes: undefined })).toBe(before);
  });

  it('the proven owner\'s own sync still updates name and campus', async () => {
    pcoAnswers(VICTIM);
    const r = await call(pcoSync, { action: 'sync', email: VICTIM }, { token: DEVICE_RAW });
    expect(r.json.synced).toBe(true);
    expect(profileRow()).toMatchObject({ first_name: 'Victoria', last_name: 'Timms', campus: 'us-gwinnett' });
  });
});

// ── Hardening, 1 Oct 2026 (adversarial check F8-F10, server) ─────────────────

describe('F8: a staff sign-in promotes the device\'s own token instead of minting a new one', () => {
  const STAFF = 'pastor-f8@futures.church';
  const STAFF_RAW = '7'.repeat(64);

  function seedStaff(sessionHashes = []) {
    db.tables.staff_roster = [{ email: STAFF, role: 'campus', campus_id: 'alpharetta', display_name: 'Pat' }];
    db.tables.staff_sessions = [{ token_hash: sha(STAFF_RAW), email: STAFF, expires_at: new Date(Date.now() + 3600e3).toISOString() }];
    db.tables.profiles.push({ email: STAFF, first_name: 'Pat', session_token_hashes: sessionHashes });
    db.tables.user_data.push({ email: STAFF, journal: JOURNAL, sync_version: 1 });
  }
  const signIn = (currentToken) => call(intake, { action: 'sync_token', currentToken }, { token: STAFF_RAW });

  it('an unproven "u:" device token is made proven in place and handed back', async () => {
    seedStaff([sha('1'.repeat(64))]);
    const device = (await call(userSync, { action: 'pull', email: STAFF })).json.sessionToken;
    expect(hashes(STAFF)).toContain('u:' + sha(device));
    const r = await signIn(device);
    expect(r.status).toBe(200);
    expect(r.json.token).toBe(device);
    expect(hashes(STAFF)).toEqual([sha('1'.repeat(64)), sha(device)]);
    expect((await call(userSync, { action: 'pull' }, { token: device })).status).toBe(200);
  });

  it('a first-device "r:" token is made proven in place, and every other "r:" is removed', async () => {
    const SQUAT = 's'.repeat(64);
    const device = '6'.repeat(64);
    seedStaff(['r:' + sha(SQUAT), 'r:' + sha(device)]);
    const r = await signIn(device);
    expect(r.json.token).toBe(device);
    expect(hashes(STAFF)).toEqual([sha(device)]);
  });

  it('an already proven device token is handed back unchanged, and any "r:" is still removed', async () => {
    const device = '5'.repeat(64);
    seedStaff([sha(device), 'r:' + 'f'.repeat(64)]);
    const r = await signIn(device);
    expect(r.json.token).toBe(device);
    expect(hashes(STAFF)).toEqual([sha(device)]);
  });

  it('six sign-ins on one device never push out the oldest other device', async () => {
    const others = ['1', '2', '3', '4'].map((c) => sha(c.repeat(64)));
    const device = '5'.repeat(64);
    seedStaff([...others, sha(device)]);
    for (let i = 0; i < 6; i++) expect((await signIn(device)).json.token).toBe(device);
    expect(hashes(STAFF)).toEqual([...others, sha(device)]);
  });

  it('a token that is not this staff address\'s (another reader\'s, or junk) gets a fresh token and touches nothing else', async () => {
    seedStaff([]);
    const r = await signIn(DEVICE_RAW); // the victim reader's own device token
    expect(r.json.token).not.toBe(DEVICE_RAW);
    expect(hashes(STAFF)).toEqual([sha(r.json.token)]);
    expect(hashes(VICTIM)).toEqual([DEVICE_HASH]);
    const junk = await signIn('not-a-token');
    expect(junk.json.token).toMatch(/^[0-9a-f]{64}$/);
    expect(hashes(STAFF)).toHaveLength(2);
  });

  it('fails closed: a failed write answers { token: null } and stores nothing', async () => {
    const device = '6'.repeat(64);
    seedStaff(['u:' + sha(device), 'r:' + 'f'.repeat(64)]);
    db.failOnce('profiles', 'update');
    const r = await signIn(device);
    expect(r.json.token).toBeNull();
    expect(hashes(STAFF)).toEqual(['u:' + sha(device), 'r:' + 'f'.repeat(64)]);
  });
});

describe('F9: junk addresses cannot spend the send budget of readers who have proved before', () => {
  const fill = (key, n) => {
    const at = new Date().toISOString();
    for (let i = 0; i < n; i++) db.tables.rate_limit_hits.push({ key, created_at: at });
  };

  it('addresses with no proven history share a bucket of 150 an hour, apart from the 300 for proven addresses', async () => {
    fill('dwproof-send-all-new', 150);
    const NEW = 'brand-new-f9@example.com';
    expect((await call(userProfile, { action: 'register', email: NEW })).status).toBe(200);
    const unproven = (await call(userProfile, { action: 'register', email: NEW })).json.sessionToken;
    const refused = await call(userProfile, { action: 'proof-send' }, { token: unproven });
    expect(refused.status).toBe(429);
    expect(refused.json.error).toBe('busy');

    // the reader with a proven device still gets a code
    const reader = await strangerToken();
    expect((await call(userProfile, { action: 'proof-send' }, { token: reader })).status).toBe(200);
    expect(db.tables.rate_limit_hits.filter((r) => r.key === 'dwproof-send-all')).toHaveLength(1);
    expect(db.tables.rate_limit_hits.filter((r) => r.key === 'dwproof-send-all-new')).toHaveLength(150);
  });

  it('a full proven bucket still refuses proven addresses', async () => {
    fill('dwproof-send-all', 300);
    const reader = await strangerToken();
    const r = await call(userProfile, { action: 'proof-send' }, { token: reader });
    expect(r.status).toBe(429);
    expect(r.json.error).toBe('busy');
  });
});

describe('F10: lockouts a stranger can cause', () => {
  it('(a) a stranger on another connection cannot use up the reader\'s eight sends a day', async () => {
    vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-10-02T09:00:00Z') });
    const evil = '203.0.113.60';
    const statuses = [];
    for (let i = 0; i < 9; i++) {
      vi.setSystemTime(new Date(Date.parse('2026-10-02T09:00:00Z') + i * 16 * 60e3));
      const t = await strangerToken();
      statuses.push((await call(userProfile, { action: 'proof-send' }, { token: t, ip: evil })).status);
    }
    expect(statuses).toEqual([200, 200, 200, 200, 200, 200, 200, 200, 429]);
    // the reader, from their own connection, still gets a code and can prove
    const reader = await strangerToken();
    resend.mockClear();
    expect((await call(userProfile, { action: 'proof-send' }, { token: reader, ip: '203.0.113.61' })).status).toBe(200);
    expect((await call(userProfile, { action: 'proof-verify', code: sentCode() }, { token: reader })).status).toBe(200);
  });

  it('(a) a loose address-wide backstop of 30 a day still holds across connections', async () => {
    const at = new Date().toISOString();
    for (let i = 0; i < 30; i++) db.tables.rate_limit_hits.push({ key: `dwproof-send:${VICTIM}`, created_at: at });
    const t = await strangerToken();
    expect((await call(userProfile, { action: 'proof-send' }, { token: t, ip: '203.0.113.62' })).status).toBe(429);
    expect(resend).not.toHaveBeenCalled();
  });

  it('(b) tries on a token with no code, or over its own limit, cost the address nothing', async () => {
    // a stranger token that never asked for a code: 70 tries
    const stranger = await strangerToken();
    for (let i = 0; i < 70; i++) {
      const r = await call(userProfile, { action: 'proof-verify', code: '000000' }, { token: stranger });
      expect([400, 429]).toContain(r.status);
    }
    expect(db.tables.rate_limit_hits.filter((r) => r.key === `dwproof-try:${VICTIM}`)).toHaveLength(0);

    // a stranger token WITH a code, past its 5 tries, writes nothing more against the address
    const withCode = await strangerToken();
    await call(userProfile, { action: 'proof-send' }, { token: withCode });
    const wrong = String((Number(sentCode(0)) + 1) % 1000000).padStart(6, '0');
    for (let i = 0; i < 20; i++) await call(userProfile, { action: 'proof-verify', code: wrong }, { token: withCode });
    expect(db.tables.rate_limit_hits.filter((r) => r.key === `dwproof-try:${VICTIM}`)).toHaveLength(5);

    // the reader's right code still works
    const reader = await strangerToken();
    await call(userProfile, { action: 'proof-send' }, { token: reader });
    expect((await call(userProfile, { action: 'proof-verify', code: sentCode(1) }, { token: reader })).status).toBe(200);
  });

  it('(b) the per-address backstop of 60 tries an hour still applies to tokens with a code', async () => {
    const at = new Date().toISOString();
    for (let i = 0; i < 60; i++) db.tables.rate_limit_hits.push({ key: `dwproof-try:${VICTIM}`, created_at: at });
    const reader = await strangerToken();
    await call(userProfile, { action: 'proof-send' }, { token: reader });
    expect((await call(userProfile, { action: 'proof-verify', code: sentCode() }, { token: reader })).status).toBe(429);
  });

  it('(c) a pending token that has not asked for a code yet survives three stranger tokens', async () => {
    const reader = await strangerToken();
    expect(db.tables.rate_limit_hits.some((r) => r.key === `dwproof-mint:${sha(reader)}`)).toBe(true);
    for (let i = 0; i < 3; i++) await strangerToken();
    expect(hashes()).toContain('u:' + sha(reader));
    await call(userProfile, { action: 'proof-send' }, { token: reader });
    expect((await call(userProfile, { action: 'proof-verify', code: sentCode() }, { token: reader })).status).toBe(200);
  });

  it('(c) under a flood the hard ceiling of five holds, and a token with a live code outlasts merely fresh ones', async () => {
    const reader = await strangerToken();
    await call(userProfile, { action: 'proof-send' }, { token: reader });
    for (let i = 0; i < 8; i++) await strangerToken();
    expect(hashes().filter((h) => h.startsWith('u:'))).toHaveLength(5);
    expect(hashes()).toContain('u:' + sha(reader));
    expect(hashes()).toContain(DEVICE_HASH);
  });
});
