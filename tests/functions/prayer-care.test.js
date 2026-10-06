/**
 * B09-12: the staff side of the prayer wall (lib/prayer-care.js).
 *
 *   - "Prayer requests this week": anonymous rows carry no name and no email;
 *     a campus pastor sees their own campus only; hub and admin see all.
 *   - Show it on the wall | Keep it private: another campus's post is 403;
 *     a post decided already is 409; nothing is ever deleted.
 *   - The held email: kind dw_prayer_held; nothing while off; campus and link
 *     only, never the text or a name; one per post per person.
 *
 * Every name, address and prayer here is made up (this repo is public).
 * NOTE: this file lives in tests/, never in netlify/functions/.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createRequire } from 'node:module';

const require_ = createRequire(import.meta.url);
const care = require_('../../netlify/functions/lib/prayer-care.js');
const { fallbackCampuses } = require_('../../netlify/functions/lib/campuses.js');

const CAMPUSES = fallbackCampuses();
const NOW = new Date('2026-10-05T12:00:00Z');
const daysBefore = (n) => new Date(NOW.getTime() - n * 86400000).toISOString();

const ID = {
  named: '11111111-1111-4111-8111-111111111111',
  anon: '22222222-2222-4222-8222-222222222222',
  held: '33333333-3333-4333-8333-333333333333',
  otherCampus: '44444444-4444-4444-8444-444444444444',
  old: '55555555-5555-4555-8555-555555555555',
  priv: '66666666-6666-4666-8666-666666666666',
  heldOther: '77777777-7777-4777-8777-777777777777',
};

let tables;
let sent;
function reset() {
  sent = [];
  tables = {
    prayers: [
      { id: ID.named, prayer: 'Please pray for my job interview on Thursday', name: 'Sam Example', email: 'sam@example.org', campus: 'au-paradise', prayer_count: 4, created_at: daysBefore(2), status: 'shown', held_reason: null },
      { id: ID.anon, prayer: 'Healing for my mum', name: 'Anonymous', email: 'quiet@example.org', campus: 'au-paradise', prayer_count: 1, created_at: daysBefore(1), status: 'shown', held_reason: null },
      { id: ID.held, prayer: 'Call me on 0400 000 000', name: 'Jo Example', email: 'jo@example.org', campus: 'au-paradise', prayer_count: 0, created_at: daysBefore(0), status: 'held', held_reason: 'contact' },
      { id: ID.otherCampus, prayer: 'Pray for Kennesaw', name: 'Lee Example', email: 'lee@example.org', campus: 'us-kennesaw', prayer_count: 2, created_at: daysBefore(3), status: 'shown', held_reason: null },
      { id: ID.old, prayer: 'An old one', name: 'Old Example', email: 'old@example.org', campus: 'au-paradise', prayer_count: 9, created_at: daysBefore(9), status: 'shown', held_reason: null },
      { id: ID.priv, prayer: 'Kept private', name: 'anonymous', email: 'p@example.org', campus: 'au-paradise', prayer_count: 0, created_at: daysBefore(1), status: 'private', held_reason: 'link' },
      { id: ID.heldOther, prayer: 'see example.com', name: 'Anonymous', email: '', campus: 'us-kennesaw', prayer_count: 0, created_at: daysBefore(0), status: 'held', held_reason: 'link' },
    ],
    staff_roster: [],
    dw_prompt_kind: [],
    dw_prompt_log: [],
    // B09-13: live sends only in a switched-on nation; these tests stand for
    // after switch-on unless they say otherwise.
    dw_region_gate: ['futures-au', 'futures-us', 'futuros-us'].map((region) => ({ region, notices_on_at: '2026-09-01T00:00:00Z' })),
  };
}

function db() {
  return {
    from(table) {
      const st = { op: 'select', filters: [], payload: null, returning: false };
      const run = () => {
        const rows = tables[table] || [];
        const hits = rows.filter((r) => st.filters.every(([op, col, val]) => {
          if (op === 'eq') return r[col] === val;
          if (op === 'in') return val.includes(r[col]);
          if (op === 'gte') return r[col] >= val;
          return true;
        }));
        if (st.op === 'insert') {
          if (table === 'dw_prompt_log' && rows.some((r) => r.dedupe_key === st.payload.dedupe_key)) return { data: null, error: { code: '23505' } };
          rows.push({ ...st.payload });
          return { data: [st.payload], error: null };
        }
        if (st.op === 'update') {
          hits.forEach((r) => Object.assign(r, st.payload));
          return { data: hits.map((r) => ({ id: r.id })), error: null };
        }
        return { data: hits.map((r) => ({ ...r })), error: null };
      };
      const b = {
        select() { if (st.op !== 'select') st.returning = true; return b; },
        insert(p) { st.op = 'insert'; st.payload = p; return b; },
        update(p) { st.op = 'update'; st.payload = p; return b; },
        delete() { throw new Error('nothing may be deleted'); },
        eq(c, v) { st.filters.push(['eq', c, v]); return b; },
        in(c, v) { st.filters.push(['in', c, v]); return b; },
        gte(c, v) { st.filters.push(['gte', c, v]); return b; },
        order() { return b; },
        limit() { return b; },
        maybeSingle() { const r = run(); return Promise.resolve({ data: (r.data || [])[0] || null, error: r.error }); },
        then(res, rej) { return Promise.resolve(run()).then(res, rej); },
      };
      return b;
    },
  };
}

const admin = { email: 'ae@futures.global', role: 'admin', campusId: null };
const hub = { email: 'hub@futures.church', role: 'hub', campusId: null };
const media = { email: 'media@futures.church', role: 'media', campusId: null };
const pastor = { email: 'pastor@futures.church', role: 'campus', campusId: 'au-paradise', campusSetBy: 'ae@futures.global' };
const unconfirmed = { email: 'new@futures.church', role: 'campus', campusId: 'au-paradise', campusSetBy: 'self' };

const realFetch = globalThis.fetch;
beforeEach(() => {
  reset();
  process.env.RESEND_API_KEY = 'test-key';
  globalThis.fetch = async (url, init) => {
    sent.push({ url, body: JSON.parse(init.body) });
    return { ok: true, json: async () => ({ id: 'email-1' }) };
  };
});
afterEach(() => { globalThis.fetch = realFetch; delete process.env.RESEND_API_KEY; });

describe('prayers_week: who sees what', () => {
  it('a campus pastor sees their own campus only: held posts and the last 7 days', async () => {
    const out = await care.listPrayerCare(db(), pastor, CAMPUSES, NOW);
    expect(out.scope).toEqual({ all: false, campusId: 'au-paradise', campusName: expect.any(String) });
    expect(out.held.map((r) => r.id)).toEqual([ID.held]);
    expect(out.week.map((r) => r.id).sort()).toEqual([ID.named, ID.anon, ID.priv].sort());
    expect(JSON.stringify(out)).not.toMatch(/Kennesaw|us-kennesaw|lee@/);
  });

  it('hub and admin see every campus', async () => {
    for (const who of [hub, admin]) {
      const out = await care.listPrayerCare(db(), who, CAMPUSES, NOW);
      expect(out.scope).toEqual({ all: true });
      expect(out.held.map((r) => r.id).sort()).toEqual([ID.held, ID.heldOther].sort());
      expect(out.week.map((r) => r.id)).toContain(ID.otherCampus);
      expect(out.week.map((r) => r.id)).not.toContain(ID.old);
    }
  });

  it('media and an unconfirmed campus pastor are refused with 403', async () => {
    expect(await care.listPrayerCare(db(), media, CAMPUSES, NOW)).toMatchObject({ status: 403 });
    expect(await care.listPrayerCare(db(), unconfirmed, CAMPUSES, NOW)).toMatchObject({ status: 403 });
  });

  it('an anonymous request carries no name and no email, in any case', async () => {
    const out = await care.listPrayerCare(db(), admin, CAMPUSES, NOW);
    for (const id of [ID.anon, ID.priv]) {
      const row = out.week.find((r) => r.id === id);
      expect(row.anonymous).toBe(true);
      expect(row).not.toHaveProperty('firstName');
      expect(row).not.toHaveProperty('email');
    }
    expect(JSON.stringify(out)).not.toMatch(/quiet@|p@example/);
  });

  it('a named request gives the first name and canWrite, never the address (B09-13: the address comes from prayer_write_link)', async () => {
    const out = await care.listPrayerCare(db(), pastor, CAMPUSES, NOW);
    const row = out.week.find((r) => r.id === ID.named);
    expect(row).toMatchObject({ anonymous: false, firstName: 'Sam', canWrite: true, done: null, prayed: 4, daysAgo: 2, status: 'shown' });
    expect(row).not.toHaveProperty('email');
    expect(JSON.stringify(out)).not.toMatch(/@/);
  });

  it('a held post shows its text and why it waits, never a name or email', async () => {
    const out = await care.listPrayerCare(db(), pastor, CAMPUSES, NOW);
    expect(out.held[0]).toMatchObject({ id: ID.held, heldReason: 'contact', text: 'Call me on 0400 000 000' });
    expect(out.held[0]).not.toHaveProperty('firstName');
    expect(out.held[0]).not.toHaveProperty('email');
    expect(JSON.stringify(out.held)).not.toMatch(/Jo Example|jo@/);
  });
});

describe('prayer_decide', () => {
  it('Show it on the wall moves a held post to shown; Keep it private to private', async () => {
    expect(await care.decidePrayer(db(), pastor, CAMPUSES, ID.held, 'show')).toEqual({ ok: true, id: ID.held, status: 'shown' });
    reset();
    expect(await care.decidePrayer(db(), pastor, CAMPUSES, ID.held, 'private')).toEqual({ ok: true, id: ID.held, status: 'private' });
    expect(tables.prayers).toHaveLength(7);
  });

  it("another campus's post is 403 for a campus pastor; hub may decide it", async () => {
    expect(await care.decidePrayer(db(), pastor, CAMPUSES, ID.heldOther, 'show')).toMatchObject({ status: 403 });
    expect(tables.prayers.find((r) => r.id === ID.heldOther).status).toBe('held');
    expect(await care.decidePrayer(db(), hub, CAMPUSES, ID.heldOther, 'private')).toMatchObject({ ok: true, status: 'private' });
  });

  it('refuses media, bad ids, bad decisions, missing rows and a post decided already', async () => {
    expect(await care.decidePrayer(db(), media, CAMPUSES, ID.held, 'show')).toMatchObject({ status: 403 });
    expect(await care.decidePrayer(db(), admin, CAMPUSES, 'not-a-uuid', 'show')).toMatchObject({ status: 400 });
    expect(await care.decidePrayer(db(), admin, CAMPUSES, ID.held, 'delete')).toMatchObject({ status: 400 });
    expect(await care.decidePrayer(db(), admin, CAMPUSES, '99999999-9999-4999-8999-999999999999', 'show')).toMatchObject({ status: 404 });
    expect(await care.decidePrayer(db(), admin, CAMPUSES, ID.named, 'private')).toMatchObject({ status: 409 });
    expect(tables.prayers.find((r) => r.id === ID.named).status).toBe('shown');
  });
});

describe('the held email (kind dw_prayer_held)', () => {
  const roster = () => [
    { email: 'pastor@futures.church', role: 'campus', campus_id: 'au-paradise', campus_set_by: 'ae@futures.global' },
    { email: 'pastor2@futures.church', role: 'campus', campus_id: 'au-paradise', campus_set_by: null },
    { email: 'self@futures.church', role: 'campus', campus_id: 'au-paradise', campus_set_by: 'self' },
    { email: 'hub@futures.church', role: 'hub', campus_id: null, campus_set_by: null },
    { email: 'ae@futures.global', role: 'admin', campus_id: null, campus_set_by: null },
  ];

  it('while off: nothing is read, logged or sent', async () => {
    tables.dw_prompt_kind = [{ kind: 'dw_prayer_held', mode: 'off', shadow_recipients: [] }];
    tables.staff_roster = roster();
    const out = await care.notifyHeld(db(), { id: ID.held, campus: 'au-paradise' }, { campuses: CAMPUSES });
    expect(out).toMatchObject({ mode: 'off', sent: 0, logged: 0 });
    expect(tables.dw_prompt_log).toHaveLength(0);
    expect(sent).toHaveLength(0);
  });

  it('confirmed campus pastors hear, once each; the email carries campus and link only', async () => {
    tables.dw_prompt_kind = [{ kind: 'dw_prayer_held', mode: 'live', shadow_recipients: [] }];
    tables.staff_roster = roster();
    const out = await care.notifyHeld(db(), { id: ID.held, campus: 'au-paradise' }, { campuses: CAMPUSES });
    expect(out.sent).toBe(2);
    expect(sent.map((s) => s.body.to[0]).sort()).toEqual(['pastor2@futures.church', 'pastor@futures.church']);
    for (const s of sent) {
      expect(s.body.subject).toMatch(/^A prayer request at .+ is waiting for a look$/);
      expect(s.body.text).toMatch(/\/staff$/m);
      expect(s.body.subject + s.body.text).not.toMatch(/0400|Call me|Jo Example|jo@/);
    }
    for (const row of tables.dw_prompt_log) {
      expect(row.kind).toBe('dw_prayer_held');
      expect(row.dedupe_key).toMatch(new RegExp(`^prayer_held:${ID.held}:`));
      expect(`${row.title} ${row.body}`).not.toMatch(/0400|Call me|Jo Example/);
    }
    // The same post again: raised already, nobody hears twice.
    const again = await care.notifyHeld(db(), { id: ID.held, campus: 'au-paradise' }, { campuses: CAMPUSES });
    expect(again.sent).toBe(0);
    expect(sent).toHaveLength(2);
  });

  it('no confirmed pastor (or no campus): hub and admin hear', async () => {
    tables.dw_prompt_kind = [{ kind: 'dw_prayer_held', mode: 'live', shadow_recipients: [] }];
    tables.staff_roster = roster().filter((r) => r.role !== 'campus' || r.campus_set_by === 'self');
    await care.notifyHeld(db(), { id: ID.held, campus: 'au-paradise' }, { campuses: CAMPUSES });
    expect(sent.map((s) => s.body.to[0]).sort()).toEqual(['ae@futures.global', 'hub@futures.church']);
    // B09-13: a post with no campus belongs to no nation, so live never
    // emails about it (it still waits on /staff for hub and admin).
    sent = [];
    tables.staff_roster = roster();
    await care.notifyHeld(db(), { id: ID.heldOther, campus: '' }, { campuses: CAMPUSES });
    expect(sent).toHaveLength(0);
  });

  it('live with the nation not switched on: nobody hears (B09-13)', async () => {
    tables.dw_prompt_kind = [{ kind: 'dw_prayer_held', mode: 'live', shadow_recipients: [] }];
    tables.staff_roster = roster();
    tables.dw_region_gate = tables.dw_region_gate.map((r) => ({ ...r, notices_on_at: r.region === 'futures-us' ? r.notices_on_at : null }));
    const out = await care.notifyHeld(db(), { id: ID.held, campus: 'au-paradise' }, { campuses: CAMPUSES });
    expect(out.sent).toBe(0);
    expect(tables.dw_prompt_log).toHaveLength(0);
    expect(sent).toHaveLength(0);
  });

  it('shadow with no campus: the owner on the shadow list still sees it', async () => {
    tables.dw_prompt_kind = [{ kind: 'dw_prayer_held', mode: 'shadow', shadow_recipients: ['ae@futures.global'] }];
    tables.staff_roster = roster();
    await care.notifyHeld(db(), { id: ID.heldOther, campus: '' }, { campuses: CAMPUSES });
    expect(sent.map((s) => s.body.to[0])).toEqual(['ae@futures.global']);
    expect(sent[0].body.subject).toBe('A prayer request is waiting for a look');
  });

  it('shadow: the owner on the shadow list gets the email; the pastors are logged, not sent', async () => {
    tables.dw_prompt_kind = [{ kind: 'dw_prayer_held', mode: 'shadow', shadow_recipients: ['ae@futures.global', 'stranger@example.org'] }];
    tables.staff_roster = roster();
    const out = await care.notifyHeld(db(), { id: ID.held, campus: 'au-paradise' }, { campuses: CAMPUSES });
    expect(out).toMatchObject({ mode: 'shadow', sent: 1, logged: 2 });
    expect(sent.map((s) => s.body.to[0])).toEqual(['ae@futures.global']);
  });
});
