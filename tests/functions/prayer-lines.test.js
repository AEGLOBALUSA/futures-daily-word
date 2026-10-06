/**
 * B09-13 step 3: who sees a prayer request as a line on /staff "Needs you"
 * (lib/prayer-lines.js, pure). The mode / nation gate / scope matrix of
 * SF-09-07 step 3, plus the address-only write link.
 *
 * Every name, address and prayer here is made up (this repo is public).
 * NOTE: this file lives in tests/, never in netlify/functions/.
 */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';

const require_ = createRequire(import.meta.url);
const pl = require_('../../netlify/functions/lib/prayer-lines.js');
const { fallbackCampuses } = require_('../../netlify/functions/lib/campuses.js');

const CAMPUSES = fallbackCampuses();
const NOW = new Date('2026-10-20T03:00:00Z');
const hoursBefore = (h) => new Date(NOW.getTime() - h * 3600000).toISOString();
const OPEN = '2026-10-19T00:00:00Z';
const gateOf = (...open) => Object.fromEntries(open.map((r) => [r, OPEN]));

const ROSTER = [
  { email: 'paradise.pastor@futures.church', role: 'campus', campus_id: 'au-paradise', campus_set_by: 'ae@futures.global' },
  { email: 'gwinnett.pastor@futures.church', role: 'campus', campus_id: 'us-gwinnett', campus_set_by: 'ae@futures.global' },
  { email: 'duluth.pastor@futures.church', role: 'campus', campus_id: 'us-futuros-duluth', campus_set_by: 'ae@futures.global' },
  { email: 'kennesaw.self@futures.church', role: 'campus', campus_id: 'us-kennesaw', campus_set_by: 'self' },
  { email: 'hub.person@futures.church', role: 'hub', campus_id: null, campus_set_by: null },
  { email: 'ae@futures.global', role: 'admin', campus_id: null, campus_set_by: null },
];
const VIEWERS = pl.viewersFrom(ROSTER);
const who = (email) => VIEWERS.find((v) => v.email === email);
const PARADISE = who('paradise.pastor@futures.church');
const GWINNETT = who('gwinnett.pastor@futures.church');
const DULUTH = who('duluth.pastor@futures.church');
const SELF = who('kennesaw.self@futures.church');
const HUB = who('hub.person@futures.church');
const OWNER = who('ae@futures.global');

const row = (id, campus, extra = {}) => ({ id, campus, name: 'Sam Example', email: 'sam@example.org', prayer: `Pray for ${id}`, created_at: hoursBefore(3), status: 'shown', pastor_done_at: null, ...extra });
const ROWS = [
  row('paradise', 'au-paradise'),
  row('paradise-anon', 'au-paradise', { name: 'Anonymous', created_at: hoursBefore(30) }),
  row('gwinnett', 'us-gwinnett'),
  row('duluth', 'us-futuros-duluth'),
  row('kennesaw', 'us-kennesaw'),
  row('bali', 'id-bali'),
  row('no-campus', ''),
  row('held', 'au-paradise', { status: 'held' }),
  row('closed', 'au-paradise', { pastor_done_at: hoursBefore(1), pastor_done_kind: 'prayed' }),
  row('private', 'au-paradise', { status: 'private', created_at: hoursBefore(2) }),
];
const ctx = (mode, gate = {}, shadowRecipients = []) => ({ mode, gate, shadowRecipients, viewers: VIEWERS, campuses: CAMPUSES, now: NOW });
const ids = (viewer, c) => pl.linesFor(viewer, ROWS, c).map((l) => l.id);

describe('the mode and nation gate matrix (SF-09-07 step 3)', () => {
  it('off: no lines for anyone, whatever the gate', () => {
    for (const v of VIEWERS) expect(ids(v, ctx('off', gateOf('futures-au', 'futures-us', 'futuros-us')))).toEqual([]);
    expect(ids(PARADISE, ctx(undefined, gateOf('futures-au')))).toEqual([]);
    expect(ids(PARADISE, ctx('everyone', gateOf('futures-au')))).toEqual([]);
  });

  it('shadow: only the shadow list, with no gate; the owner sees every nation campus, never Bali or no campus', () => {
    const c = ctx('shadow', {}, ['AE@futures.global ']);
    expect(ids(OWNER, c).sort()).toEqual(['duluth', 'gwinnett', 'kennesaw', 'paradise', 'paradise-anon', 'private'].sort());
    expect(ids(PARADISE, c)).toEqual([]);
    expect(ids(HUB, c)).toEqual([]);
  });

  it('shadow with a campus pastor on the list: his own campus only', () => {
    expect(ids(PARADISE, ctx('shadow', {}, ['paradise.pastor@futures.church'])).sort()).toEqual(['paradise', 'paradise-anon', 'private'].sort());
  });

  it('live with every gate null: none', () => {
    for (const v of VIEWERS) expect(ids(v, ctx('live', {}))).toEqual([]);
  });

  it('live with futures-au open: Paradise’s pastor sees Paradise, oldest first, and not Gwinnett', () => {
    const c = ctx('live', gateOf('futures-au'));
    expect(ids(PARADISE, c)).toEqual(['paradise-anon', 'paradise', 'private']);
    expect(ids(GWINNETT, c)).toEqual([]);
  });

  it('live with only futures-us open: a Futuros Duluth request raises nothing', () => {
    const c = ctx('live', gateOf('futures-us'));
    expect(ids(DULUTH, c)).toEqual([]);
    expect(ids(GWINNETT, c)).toEqual(['gwinnett']);
    expect(ids(OWNER, c)).toEqual(['kennesaw']);
  });

  it('a gate set for later is still closed', () => {
    expect(ids(PARADISE, ctx('live', { 'futures-au': '2026-10-21T00:00:00Z' }))).toEqual([]);
  });

  it('an id-bali request (no congregation) raises nothing in any mode, shadow included', () => {
    const all = gateOf('futures-au', 'futures-us', 'futuros-us');
    for (const c of [ctx('live', all), ctx('shadow', all, ['ae@futures.global'])]) {
      for (const v of VIEWERS) expect(ids(v, c)).not.toContain('bali');
      for (const v of VIEWERS) expect(ids(v, c)).not.toContain('no-campus');
    }
  });

  it('hub and admin see a campus with no confirmed pastor (a self-set campus is not confirmed); the pastors’ campuses do not double', () => {
    const c = ctx('live', gateOf('futures-au', 'futures-us', 'futuros-us'));
    expect(ids(HUB, c)).toEqual(['kennesaw']);
    expect(ids(OWNER, c)).toEqual(['kennesaw']);
    expect(ids(SELF, c)).toEqual([]);
  });

  it('a held post and a closed request are never lines', () => {
    const c = ctx('live', gateOf('futures-au'));
    expect(ids(PARADISE, c)).not.toContain('held');
    expect(ids(PARADISE, c)).not.toContain('closed');
  });
});

describe('what a line carries', () => {
  const lines = pl.linesFor(PARADISE, ROWS, ctx('live', gateOf('futures-au')));
  it('the first name and the ask; never an address', () => {
    const named = lines.find((l) => l.id === 'paradise');
    expect(named).toEqual({ id: 'paradise', firstName: 'Sam', campusId: 'au-paradise', campusName: 'Futures Paradise', text: 'Pray for paradise', createdAt: hoursBefore(3), waitingDays: 0, canWrite: true });
    expect(JSON.stringify(lines)).not.toContain('@');
  });
  it('an anonymous request has no name and cannot be written to', () => {
    expect(lines.find((l) => l.id === 'paradise-anon')).toMatchObject({ firstName: null, canWrite: false, waitingDays: 1 });
  });
  it('a named request with no usable address shows the name and cannot be written to', () => {
    const [l] = pl.linesFor(PARADISE, [row('x', 'au-paradise', { email: 'not an address' })], ctx('live', gateOf('futures-au')));
    expect(l).toMatchObject({ firstName: 'Sam', canWrite: false });
  });
});

describe('the address-only write link', () => {
  it('mailto: plus the encoded address, nothing else', () => {
    expect(pl.mailtoFor({ name: 'Sam', email: ' sam+x@example.org ' })).toBe('mailto:sam%2Bx%40example.org');
    expect(pl.mailtoFor({ name: 'Sam', email: 'sam@example.org' })).not.toContain('?');
  });
  it('never for an anonymous request, or an address that could carry a header', () => {
    expect(pl.mailtoFor({ name: 'Anonymous', email: 'sam@example.org' })).toBe('');
    expect(pl.mailtoFor({ name: 'Sam', email: 'sam@example.org?subject=hi' })).toBe('');
    expect(pl.mailtoFor({ name: 'Sam', email: 'a@b.org&body=x' })).toBe('');
    expect(pl.mailtoFor({ name: 'Sam', email: '' })).toBe('');
  });
});

describe('the waiting email words', () => {
  it('campus and link only, English and Spanish', () => {
    expect(pl.waitingEmail('Futures Paradise', 'https://futuresdailyword.com/staff')).toEqual({
      subject: 'A prayer request at Futures Paradise has waited two days',
      text: 'A prayer request at Futures Paradise has waited two days.\n\nhttps://futuresdailyword.com/staff',
    });
    expect(pl.waitingEmail('Futuros Duluth', 'https://futuresdailyword.com/staff', 'es').subject).toBe('Una petición de oración en Futuros Duluth lleva dos días esperando');
  });
});
