/**
 * The Saturday nudge when Sunday's notes are not up (MOS-to-8 build B09-10):
 * lib/sunday-notes.js and netlify/functions/sunday-notes-check.js.
 *
 * Saturday 18:00–18:59 on each congregation's clock, hub and admin roster
 * members only, one claim per congregation per Sunday per recipient, nothing
 * at all while the kind is off, and only the shadow list emailed in shadow.
 *
 * NOTE: this file lives in tests/, never in netlify/functions/.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRequire } from 'node:module';
import { createFakeSupabase } from './helpers/fake-supabase.js';

const require_ = createRequire(import.meta.url);
const sn = require_('../../netlify/functions/lib/sunday-notes.js');
const { lintStaffText } = require_('../../netlify/functions/lib/prompts.js');

const OWNER = 'owner@example.com';
const LINK = 'https://futuresdailyword.com/staff';
const SAT_NY_1810 = new Date('2026-10-03T22:10:00Z'); // Sat 3 Oct 18:10 EDT

function roster() {
  return [
    { email: OWNER, role: 'admin', campus_id: null },
    { email: 'hub.usa@example.com', role: 'hub', campus_id: 'us-alpharetta' }, // reads futures-us
    { email: 'hub.any@example.com', role: 'hub', campus_id: null }, // no campus: every congregation
    { email: 'hub.au@example.com', role: 'hub', campus_id: 'au-paradise' }, // reads futures-au
    { email: 'pastor@example.com', role: 'campus', campus_id: 'us-gwinnett' },
    { email: 'media@example.com', role: 'media', campus_id: null },
  ];
}

const lastWeek = (congregation) => ({
  id: `grace-2026-09-27-${congregation}`, congregation, is_current: true, published_at: '2026-09-24T15:00:00Z',
  sermon: { id: 'grace', title: 'Grace Upon Grace', date: '2026-09-27', speaker: 'Ps Sam Example' },
});
const thisWeek = (congregation) => ({
  id: `faith-2026-10-04-${congregation}`, congregation, is_current: true, published_at: '2026-10-01T15:00:00Z',
  sermon: { id: 'faith', title: 'Ordinary Faith', date: '2026-10-04', speaker: 'Ps Sam Example' },
});

let fake;
let sent;
let reads;

function setup({ mode = 'shadow', sermons = [lastWeek('futures-us')], shadow = [OWNER] } = {}) {
  fake = createFakeSupabase({
    dw_prompt_kind: [{ kind: 'dw_sunday_notes_missing', mode, shadow_recipients: shadow }],
    dw_prompt_log: [],
    staff_roster: roster(),
    published_sermons: sermons,
    dw_campuses: [],
  });
  reads = [];
  const from = fake.from;
  fake.from = (t) => { reads.push(t); return from(t); };
}

beforeEach(() => {
  sent = [];
  process.env.RESEND_API_KEY = 'test-key';
  vi.stubGlobal('fetch', vi.fn(async (_url, init) => {
    sent.push(JSON.parse(init.body));
    return { ok: true, status: 200, json: async () => ({ id: `msg-${sent.length}` }) };
  }));
});
afterEach(() => { vi.unstubAllGlobals(); delete process.env.RESEND_API_KEY; });

const logFor = (congregation) => fake.tables.dw_prompt_log.filter((r) => r.dedupe_key.startsWith(`notes_missing:${congregation}:`));


describe('staffLink', () => {
  const prev = process.env.URL;
  afterEach(() => { if (prev === undefined) delete process.env.URL; else process.env.URL = prev; });

  it('points the nudge ("paste the notes here") at the Sunday\u2019s notes screen, not bare /staff', () => {
    delete process.env.URL;
    expect(sn.staffLink()).toBe('https://futuresdailyword.com/staff?tab=notes');
    process.env.URL = 'https://deploy-preview-1--futures-daily-word.netlify.app/';
    expect(sn.staffLink()).toBe('https://deploy-preview-1--futures-daily-word.netlify.app/staff?tab=notes');
  });
});

describe('when it runs: Saturday 18:00 on the congregation clock, across daylight saving', () => {
  it('New York: Sat 18:10 is due, 17:59 and 19:00 are not', () => {
    expect(sn.nudgeSunday('futures-us', SAT_NY_1810)).toBe('2026-10-04');
    expect(sn.nudgeSunday('futuros-us', SAT_NY_1810)).toBe('2026-10-04');
    expect(sn.nudgeSunday('futures-au', SAT_NY_1810)).toBeNull();
    expect(sn.nudgeSunday('futures-us', new Date('2026-10-03T21:59:00Z'))).toBeNull();
    expect(sn.nudgeSunday('futures-us', new Date('2026-10-03T23:00:00Z'))).toBeNull();
  });
  it('Adelaide, the Saturday before daylight time starts (Sun 4 Oct 2026) and the one after', () => {
    expect(sn.nudgeSunday('futures-au', new Date('2026-10-03T08:40:00Z'))).toBe('2026-10-04'); // 18:10 ACST
    expect(sn.nudgeSunday('futures-au', new Date('2026-10-03T09:40:00Z'))).toBeNull(); // 19:10 ACST
    expect(sn.nudgeSunday('futures-au', new Date('2026-10-10T07:40:00Z'))).toBe('2026-10-11'); // 18:10 ACDT
    expect(sn.nudgeSunday('futures-au', new Date('2026-10-10T08:40:00Z'))).toBeNull(); // 19:10 ACDT
  });
  it('the USA, the Saturday before daylight time ends (Sun 1 Nov 2026) and the one after', () => {
    expect(sn.nudgeSunday('futures-us', new Date('2026-10-31T22:10:00Z'))).toBe('2026-11-01'); // 18:10 EDT
    expect(sn.nudgeSunday('futures-us', new Date('2026-11-07T23:10:00Z'))).toBe('2026-11-08'); // 18:10 EST
    expect(sn.nudgeSunday('futures-us', new Date('2026-11-07T22:10:00Z'))).toBeNull(); // 17:10 EST
  });
});

describe('who hears about it: hub and admin roster members only', () => {
  it('admin for every congregation, hub for their own campus\'s, a hub with no campus for all', () => {
    const list = require_('../../netlify/functions/lib/campuses.js').loadCampuses;
    expect(list).toBeTypeOf('function');
    const campuses = require_('../../netlify/functions/lib/campuses.fallback.json').map((c) => ({ ...c, pcoNames: c.pcoNames || [] }));
    expect(sn.recipientsFor('futures-us', roster(), campuses).sort()).toEqual([OWNER, 'hub.any@example.com', 'hub.usa@example.com'].sort());
    expect(sn.recipientsFor('futures-au', roster(), campuses).sort()).toEqual([OWNER, 'hub.any@example.com', 'hub.au@example.com'].sort());
    for (const c of ['futures-us', 'futures-au', 'futuros-us']) {
      const got = sn.recipientsFor(c, roster(), campuses);
      expect(got).not.toContain('pastor@example.com');
      expect(got).not.toContain('media@example.com');
    }
  });
  it('a hub row whose campus no longer resolves hears about nothing (fails closed)', () => {
    const campuses = require_('../../netlify/functions/lib/campuses.fallback.json').map((c) => ({ ...c, pcoNames: c.pcoNames || [] }));
    const rows = [{ email: 'hub.stale@example.com', role: 'hub', campus_id: 'no-such-campus' }];
    for (const c of ['futures-us', 'futures-au', 'futuros-us']) {
      expect(sn.recipientsFor(c, rows, campuses)).toEqual([]);
    }
  });
});

describe('runSundayNotesCheck', () => {
  it('off (the seeded default): reads the switch and nothing else, logs and sends nothing', async () => {
    setup({ mode: 'off' });
    const out = await sn.runSundayNotesCheck(fake, { now: SAT_NY_1810, link: LINK });
    expect(out.mode).toBe('off');
    expect(reads).toEqual(['dw_prompt_kind']);
    expect(fake.tables.dw_prompt_log).toHaveLength(0);
    expect(sent).toHaveLength(0);
  });

  it('shadow, Sat 18:10 New York, stale notes: one claim per hub/admin recipient, email to the shadow list only', async () => {
    setup({ mode: 'shadow' });
    await sn.runSundayNotesCheck(fake, { now: SAT_NY_1810, link: LINK });
    const us = logFor('futures-us');
    expect(us.map((r) => r.recipient).sort()).toEqual([OWNER, 'hub.any@example.com', 'hub.usa@example.com'].sort());
    expect(us.every((r) => r.dedupe_key.startsWith('notes_missing:futures-us:2026-10-04:'))).toBe(true);
    expect(us.every((r) => r.mode === 'shadow' && r.written_by === 'template')).toBe(true);
    // Futuros USA is set up, not launched: nothing is logged or mailed about it.
    expect(logFor('futuros-us')).toHaveLength(0);
    expect(logFor('futures-au')).toHaveLength(0); // not 18:00 in Adelaide
    // Only the owner (the shadow list) is emailed: once, for Futures USA.
    expect(sent.map((m) => m.to[0])).toEqual([OWNER]);
    expect(fake.tables.dw_prompt_log.filter((r) => r.delivered).map((r) => r.recipient)).toEqual([OWNER]);
    const english = sent.find((m) => m.subject.includes('Futures USA'));
    expect(english.subject).toBe("Sunday's notes for Futures USA aren't up yet");
    expect(english.text).toContain("still shows last week's message (“Grace Upon Grace”, 27 Sep)");
    expect(english.text).toContain(LINK);
  });

  it('Futuros USA joins only when its gate is on, in Spanish', async () => {
    expect(sn.congregationOn('futuros-us', {})).toBe(false);
    expect(sn.congregationOn('futuros-us', { DW_FUTUROS_NOTES_NUDGE: 'off' })).toBe(false);
    expect(sn.congregationOn('futures-us', {})).toBe(true);
    expect(sn.congregationOn('futures-au', {})).toBe(true);
    setup({ mode: 'shadow' });
    const out = await sn.runSundayNotesCheck(fake, { now: SAT_NY_1810, link: LINK, env: {} });
    expect(out.due).toEqual(['futures-us']);
    expect(logFor('futuros-us')).toHaveLength(0);
    setup({ mode: 'shadow' });
    sent = [];
    await sn.runSundayNotesCheck(fake, { now: SAT_NY_1810, link: LINK, env: { DW_FUTUROS_NOTES_NUDGE: 'on' } });
    // Futuros USA has nothing published: it is stale too, in Spanish.
    expect(logFor('futuros-us').map((r) => r.recipient).sort()).toEqual([OWNER, 'hub.any@example.com'].sort());
    const spanish = sent.find((m) => m.subject.includes('Futuros USA'));
    expect(spanish.subject).toBe('Las notas del domingo para Futuros USA aún no están publicadas');
  });

  it('a page two or more Sundays old says an earlier message, not last week\'s', async () => {
    const older = { ...lastWeek('futures-us'), published_at: '2026-09-17T15:00:00Z', sermon: { ...lastWeek('futures-us').sermon, title: 'Hope', date: '2026-09-20' } };
    setup({ mode: 'shadow', sermons: [older] });
    await sn.runSundayNotesCheck(fake, { now: SAT_NY_1810, link: LINK, env: {} });
    expect(sent).toHaveLength(1);
    expect(sent[0].text).toContain('still shows an earlier message (“Hope”, 20 Sep)');
    expect(sent[0].text).not.toContain("last week's");
  });

  it('a second run in the same hour claims nothing and sends nothing', async () => {
    setup({ mode: 'shadow' });
    await sn.runSundayNotesCheck(fake, { now: SAT_NY_1810, link: LINK });
    const rows = fake.tables.dw_prompt_log.length;
    const emails = sent.length;
    await sn.runSundayNotesCheck(fake, { now: new Date('2026-10-03T22:40:00Z'), link: LINK });
    expect(fake.tables.dw_prompt_log).toHaveLength(rows);
    expect(sent).toHaveLength(emails);
  });

  it('notes already up for Sunday: nothing for that congregation', async () => {
    setup({ mode: 'shadow', sermons: [thisWeek('futures-us'), thisWeek('futuros-us')] });
    const out = await sn.runSundayNotesCheck(fake, { now: SAT_NY_1810, link: LINK });
    expect(fake.tables.dw_prompt_log).toHaveLength(0);
    expect(sent).toHaveLength(0);
    expect(out.results.every((r) => r.up)).toBe(true);
  });

  it('a message published this week without a typed date counts as up', async () => {
    const row = thisWeek('futures-us');
    delete row.sermon.date;
    setup({ mode: 'shadow', sermons: [row, thisWeek('futuros-us')] });
    await sn.runSundayNotesCheck(fake, { now: SAT_NY_1810, link: LINK });
    expect(fake.tables.dw_prompt_log).toHaveLength(0);
  });

  it('outside Saturday 18:00 it does nothing, even in shadow', async () => {
    setup({ mode: 'shadow' });
    await sn.runSundayNotesCheck(fake, { now: new Date('2026-10-03T21:10:00Z'), link: LINK }); // 17:10 EDT
    await sn.runSundayNotesCheck(fake, { now: new Date('2026-10-01T22:10:00Z'), link: LINK }); // Thursday
    expect(fake.tables.dw_prompt_log).toHaveLength(0);
    expect(sent).toHaveLength(0);
  });

  it('a roster read that fails sends nothing (fail closed)', async () => {
    setup({ mode: 'shadow' });
    fake.failOn('staff_roster', 'select');
    await sn.runSundayNotesCheck(fake, { now: SAT_NY_1810, link: LINK });
    expect(fake.tables.dw_prompt_log).toHaveLength(0);
    expect(sent).toHaveLength(0);
  });

  it('Adelaide at 18:10 on the Saturday before daylight time starts', async () => {
    setup({ mode: 'shadow', sermons: [lastWeek('futures-au')] });
    await sn.runSundayNotesCheck(fake, { now: new Date('2026-10-03T08:40:00Z'), link: LINK });
    expect(logFor('futures-au').map((r) => r.recipient).sort()).toEqual([OWNER, 'hub.any@example.com', 'hub.au@example.com'].sort());
    expect(logFor('futures-us')).toHaveLength(0);
  });
});

describe('the words', () => {
  it('fill every blank, in English and in Spanish for Futuros USA', () => {
    for (const c of ['futures-us', 'futures-au', 'futuros-us']) {
      for (const current of [{ title: 'Grace Upon Grace', date: '2026-09-27' }, null]) {
        const { subject, text } = sn.nudgeEmail(c, current, LINK);
        expect(lintStaffText(subject).ok).toBe(true);
        expect(lintStaffText(text).ok).toBe(true);
        expect(text).toContain(LINK);
      }
    }
    expect(sn.nudgeEmail('futures-us', { title: 'Grace Upon Grace', date: '2026-09-27' }, LINK).text)
      .toContain("still shows last week's message (“Grace Upon Grace”, 27 Sep)");
    expect(sn.nudgeEmail('futuros-us', null, LINK).text).toContain('pega las notas aquí');
    for (const week of ['last', 'earlier', 'later']) {
      for (const c of ['futures-us', 'futuros-us']) {
        const { text } = sn.nudgeEmail(c, { title: 'Hope', date: '2026-09-20' }, LINK, week);
        expect(lintStaffText(text).ok).toBe(true);
      }
    }
    expect(sn.nudgeEmail('futures-us', { title: 'Hope', date: '2026-09-20' }, LINK, 'earlier').text).toContain('still shows an earlier message (“Hope”, 20 Sep)');
    expect(sn.nudgeEmail('futuros-us', { title: 'Hope', date: '2026-09-20' }, LINK, 'earlier').text).toContain('todavía muestra un mensaje anterior («Hope», 20 sept)');
  });

  it('which week the page shows, against the Sunday the nudge is for', () => {
    const row = (date, published_at = '2026-09-01T12:00:00Z') => ({ congregation: 'futures-us', published_at, sermon: { title: 'X', date } });
    expect(sn.whichWeek(row('2026-09-27'), 'futures-us', '2026-10-04')).toBe('last');
    expect(sn.whichWeek(row('2026-09-20'), 'futures-us', '2026-10-04')).toBe('earlier');
    expect(sn.whichWeek(row('2026-10-11'), 'futures-us', '2026-10-04')).toBe('later');
    expect(sn.whichWeek({ congregation: 'futures-us', sermon: { title: 'X' } }, 'futures-us', '2026-10-04')).toBe('earlier');
    expect(sn.whichWeek(null, 'futures-us', '2026-10-04')).toBe('earlier');
  });
});
