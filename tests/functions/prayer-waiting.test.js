/**
 * B09-13 step 5: the one nameless email when a prayer request waits
 * (lib/prayer-waiting.js, run hourly by netlify/functions/prayer-waiting.js).
 *
 *   47 hours: nothing. 49 hours: once. The same local day again: nothing. The
 *   next day, still open: nothing (escalated once, ever). 22:00 on the
 *   campus's clock: nothing. Across Sun 4 Oct 2026 (Adelaide's clocks go
 *   forward): real hours, campus-local date. Muted: no email. Off: the switch
 *   is the only read. A deploy preview: nothing at all. The email and the log
 *   carry the campus, the link and a count; never a name, address or prayer.
 *
 * Every name, address and prayer here is made up (this repo is public).
 * NOTE: this file lives in tests/, never in netlify/functions/.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRequire } from 'node:module';
import { createFakeSupabase } from './helpers/fake-supabase.js';

const require_ = createRequire(import.meta.url);
const { runPrayerWaiting } = require_('../../netlify/functions/lib/prayer-waiting.js');

const LINK = 'https://futuresdailyword.com/staff';
const ENV = { CONTEXT: 'production' };
const PASTOR = 'paradise.pastor@futures.church';
const OPEN = '2026-09-01T00:00:00Z';
const ID = 'b1111111-1111-4111-8111-111111111111';
const H = 3600000;

let fake;
let sent;
let reads;

function setup({ waiting = 'live', line = 'live', open = ['futures-au'], created, muted = false, roster, shadow = [] } = {}) {
  fake = createFakeSupabase({
    dw_prompt_kind: [
      { kind: 'dw_prayer_waiting', mode: waiting, shadow_recipients: shadow, note: null },
      { kind: 'dw_prayer_pastor_line', mode: line, shadow_recipients: shadow, note: null },
    ],
    dw_prompt_log: [],
    dw_campuses: [],
    dw_region_gate: ['futures-au', 'futures-us', 'futuros-us'].map((region) => ({ region, notices_on_at: open.includes(region) ? OPEN : null })),
    staff_roster: roster || [
      { email: PASTOR, role: 'campus', campus_id: 'au-paradise', campus_set_by: 'ae@futures.global', prayer_waiting_muted: muted },
      { email: 'ae@futures.global', role: 'admin', campus_id: null, campus_set_by: null, prayer_waiting_muted: false },
    ],
    prayers: [
      { id: ID, name: 'Sam Example', email: 'sam@example.org', prayer: 'Please pray for my job interview on Thursday', campus: 'au-paradise', created_at: created, status: 'shown', pastor_done_at: null, escalated_on: null },
    ],
  });
  reads = [];
  const from = fake.from;
  fake.from = (t) => { reads.push(t); return from(t); };
}

const run = (now) => runPrayerWaiting(fake, { now, env: ENV, link: LINK });
const prayer = () => fake.tables.prayers[0];

beforeEach(() => {
  sent = [];
  process.env.RESEND_API_KEY = 'test-key';
  vi.stubGlobal('fetch', vi.fn(async (_url, init) => {
    sent.push(JSON.parse(init.body));
    return { ok: true, status: 200, json: async () => ({ id: `msg-${sent.length}` }) };
  }));
});
afterEach(() => { vi.unstubAllGlobals(); delete process.env.RESEND_API_KEY; });

// Tue 6 Oct 2026 10:00 in Adelaide (ACDT, UTC+10:30).
const TUE_10 = new Date('2026-10-05T23:30:00Z');

describe('the waiting email, with a fixed clock (SF-09-07 step 5)', () => {
  it('47 hours: nothing', async () => {
    setup({ created: new Date(TUE_10.getTime() - 47 * H).toISOString() });
    expect(await run(TUE_10)).toMatchObject({ planned: 0, sent: 0 });
    expect(sent).toHaveLength(0);
    expect(fake.tables.dw_prompt_log).toHaveLength(0);
  });

  it('49 hours: once, campus and link only; the log holds the count', async () => {
    setup({ created: new Date(TUE_10.getTime() - 49 * H).toISOString() });
    expect(await run(TUE_10)).toMatchObject({ planned: 1, sent: 1, escalated: 1 });
    expect(sent.map((m) => m.to[0])).toEqual([PASTOR]);
    expect(sent[0].subject).toBe('A prayer request at Futures Paradise has waited two days');
    expect(sent[0].text).toBe(`A prayer request at Futures Paradise has waited two days.\n\n${LINK}`);
    expect(JSON.stringify(sent)).not.toMatch(/Sam|sam@|interview/);
    const [log] = fake.tables.dw_prompt_log;
    expect(log).toMatchObject({ kind: 'dw_prayer_waiting', dedupe_key: `prayer_waiting:${PASTOR}:2026-10-06`, body: '1', delivered: true });
    expect(JSON.stringify(log)).not.toMatch(/Sam|sam@|interview/);
    expect(prayer().escalated_on).toBe('2026-10-06');
  });

  it('a second run the same local day: nothing', async () => {
    setup({ created: new Date(TUE_10.getTime() - 49 * H).toISOString() });
    await run(TUE_10);
    await run(new Date(TUE_10.getTime() + 3 * H));
    expect(sent).toHaveLength(1);
  });

  it('the next day, the same request still open: nothing (one email, not a drip)', async () => {
    setup({ created: new Date(TUE_10.getTime() - 49 * H).toISOString() });
    await run(TUE_10);
    expect(await run(new Date(TUE_10.getTime() + 24 * H))).toMatchObject({ planned: 0, sent: 0 });
    expect(sent).toHaveLength(1);
  });

  it('22:00 on the campus clock: nothing; 06:59 nothing; 07:00 sends', async () => {
    const tue22 = new Date('2026-10-06T11:30:00Z'); // 22:00 ACDT
    setup({ created: new Date(tue22.getTime() - 60 * H).toISOString() });
    expect((await run(tue22)).planned).toBe(0);
    const wed0659 = new Date('2026-10-06T20:29:00Z');
    expect((await run(wed0659)).planned).toBe(0);
    const wed0700 = new Date('2026-10-06T20:30:00Z');
    expect(await run(wed0700)).toMatchObject({ sent: 1 });
    expect(prayer().escalated_on).toBe('2026-10-07');
  });

  it('across Sun 4 Oct 2026 (Adelaide clocks go forward): real hours count, the local date is Sunday', async () => {
    // Posted Fri 2 Oct 09:00 ACST (UTC+9:30).
    const created = new Date('2026-10-01T23:30:00Z');
    setup({ created: created.toISOString() });
    // 47 real hours later is Sun 4 Oct 09:30 ACDT on the wall (48.5 by the wall clock): nothing.
    expect((await run(new Date(created.getTime() + 47 * H))).planned).toBe(0);
    // 49 real hours later: Sun 4 Oct 11:30 ACDT. Once.
    expect(await run(new Date(created.getTime() + 49 * H))).toMatchObject({ sent: 1 });
    expect(fake.tables.dw_prompt_log[0].dedupe_key).toBe(`prayer_waiting:${PASTOR}:2026-10-04`);
    expect(prayer().escalated_on).toBe('2026-10-04');
  });

  it('a muted pastor gets no email', async () => {
    setup({ created: new Date(TUE_10.getTime() - 49 * H).toISOString(), muted: true });
    expect(await run(TUE_10)).toMatchObject({ planned: 0, sent: 0 });
    expect(prayer().escalated_on).toBeNull();
  });

  it('a request a pastor closed, or one held for a look, never waits', async () => {
    setup({ created: new Date(TUE_10.getTime() - 49 * H).toISOString() });
    prayer().pastor_done_at = TUE_10.toISOString();
    expect((await run(TUE_10)).planned).toBe(0);
    setup({ created: new Date(TUE_10.getTime() - 49 * H).toISOString() });
    prayer().status = 'held';
    expect((await run(TUE_10)).planned).toBe(0);
  });
});

describe('fail closed (acceptance 4: with every kind off it writes nothing)', () => {
  const created = new Date(TUE_10.getTime() - 72 * H).toISOString();

  it('waiting off (the seeded default): the switch is the only read; no log, no escalated_on', async () => {
    setup({ waiting: 'off', created });
    expect(await run(TUE_10)).toMatchObject({ mode: 'off', planned: 0 });
    expect(reads).toEqual(['dw_prompt_kind']);
    expect(fake.tables.dw_prompt_log).toHaveLength(0);
    expect(prayer().escalated_on).toBeNull();
  });

  it('the line kind off: nothing waits, nothing else is read', async () => {
    setup({ line: 'off', created });
    expect(await run(TUE_10)).toMatchObject({ lineMode: 'off', planned: 0 });
    expect(reads).toEqual(['dw_prompt_kind', 'dw_prompt_kind']);
  });

  it('live with the nation not switched on: nothing sent, nothing marked', async () => {
    setup({ open: ['futures-us'], created });
    expect(await run(TUE_10)).toMatchObject({ planned: 0, sent: 0 });
    expect(sent).toHaveLength(0);
    expect(fake.tables.dw_prompt_log).toHaveLength(0);
    expect(prayer().escalated_on).toBeNull();
  });

  it('waiting live but the line only in shadow: only the shadow list hears', async () => {
    setup({ line: 'shadow', shadow: ['ae@futures.global'], created, open: [] });
    await run(TUE_10);
    // The owner sees every nation campus in shadow; the email is live, but the
    // nation is closed, so even he is not sent one. Nothing is marked.
    expect(sent).toHaveLength(0);
    expect(prayer().escalated_on).toBeNull();
  });

  it('both in shadow: the owner on the list gets the one email; the pastor nothing', async () => {
    setup({ waiting: 'shadow', line: 'shadow', shadow: ['ae@futures.global'], created, open: [] });
    expect(await run(TUE_10)).toMatchObject({ sent: 1 });
    expect(sent.map((m) => m.to[0])).toEqual(['ae@futures.global']);
  });

  it('a deploy preview (production keys) reads nothing and sends nothing', async () => {
    setup({ created });
    const out = await runPrayerWaiting(fake, { now: TUE_10, env: { CONTEXT: 'deploy-preview' }, link: LINK });
    expect(out.mode).toBe('preview');
    expect(reads).toEqual([]);
    expect(sent).toHaveLength(0);
  });

  it('a failed send marks nothing, so the next day can try again', async () => {
    setup({ created });
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 500, json: async () => ({}) })));
    expect(await run(TUE_10)).toMatchObject({ sent: 0, skipped: 1 });
    expect(prayer().escalated_on).toBeNull();
  });

  it('the hourly handler is scheduled and wired to the same run', () => {
    const fs = require_('node:fs');
    const path = require_('node:path');
    const root = path.dirname(require_.resolve('../../package.json'));
    const toml = fs.readFileSync(path.join(root, 'netlify.toml'), 'utf8');
    expect(toml).toMatch(/\[functions\."prayer-waiting"\]\s*\n\s*schedule = "@hourly"/);
    const src = fs.readFileSync(path.join(root, 'netlify/functions/prayer-waiting.js'), 'utf8');
    expect(src).toContain('runPrayerWaiting');
  });
});
