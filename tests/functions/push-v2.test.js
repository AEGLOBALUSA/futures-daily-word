/**
 * The v2 daily reminder (MOS-to-8 build B09-17): netlify/functions/lib/push-v2.js
 * and the reading-state whitelist in netlify/functions/push-subscribe.js.
 *
 *   - the send decision: her hour only, never Comfort, not on a day she read,
 *     no Sunday for pastors while NO_SUNDAY_FOR_PASTORS, nothing within 12 h of
 *     the last send, every third day after three unopened; her plan and day in
 *     the title, "{passage} is ready when you are." in her language;
 *   - daylight saving: South Australia (Sun 4 Oct 2026) and the USA (Sun 1 Nov
 *     2026) send at the same local hour either side of the change;
 *   - what a device may store: a whitelist, length caps, no identity;
 *   - no streak, missed, amazing or flame in any push string.
 *
 * NOTE: this file lives in tests/, never in netlify/functions/.
 */
import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const v2 = require('../../netlify/functions/lib/push-v2.js');
const templates = require('../../netlify/functions/lib/push-templates.js');

const ID = '0b6f1d2e-3c4a-4b5c-8d9e-0f1a2b3c4d5e';

/** A row due at 7 am New York on Tue 6 Oct 2026 (11:00 UTC, EDT). */
const NY_7AM = new Date('2026-10-06T11:00:00Z');
function row(over = {}) {
  return {
    id: ID,
    timezone: 'America/New_York',
    preferred_hour: 7,
    lang: 'en',
    persona: 'congregation',
    journey_day: 12,
    next_passage: 'John 3',
    next_label: 'Day 12 of Bible Basics',
    next_for_date: '2026-10-06',
    last_read_date: '2026-10-05',
    last_sent_at: null,
    unopened_streak: 0,
    ...over,
  };
}

describe('planV2: who gets the reminder, and when', () => {
  it('sends at her hour with her plan and day as the title and her passage in the body', () => {
    const p = v2.planV2(row(), NY_7AM);
    expect(p).toMatchObject({ send: true, localDate: '2026-10-06', title: 'Day 12 of Bible Basics', body: 'John 3 is ready when you are.' });
  });

  it('is silent before her hour and more than two hours after it', () => {
    expect(v2.planV2(row(), new Date('2026-10-06T14:00:00Z'))).toEqual({ send: false, reason: 'not_hour' });
    expect(v2.planV2(row(), new Date('2026-10-06T10:00:00Z'))).toEqual({ send: false, reason: 'not_hour' });
  });

  it('a missed hourly run still sends up to two hours late (today\'s catch-up window), once', () => {
    expect(v2.planV2(row(), new Date('2026-10-06T12:00:00Z')).send).toBe(true);
    expect(v2.planV2(row(), new Date('2026-10-06T13:00:00Z')).send).toBe(true);
    // Already sent today (the old sender's ledger or this one's): nothing more.
    expect(v2.planV2(row({ last_sent_date: '2026-10-06' }), new Date('2026-10-06T12:00:00Z'))).toEqual({ send: false, reason: 'sent_today' });
    expect(v2.planV2(row({ last_sent_at: NY_7AM.toISOString() }), new Date('2026-10-06T12:00:00Z'))).toEqual({ send: false, reason: 'sent_recently' });
  });

  it('a null preferred hour means 7 am, as today', () => {
    expect(v2.planV2(row({ preferred_hour: null }), NY_7AM).send).toBe(true);
  });

  it('never sends to a Comfort reader (either name)', () => {
    expect(v2.planV2(row({ persona: 'comfort' }), NY_7AM)).toEqual({ send: false, reason: 'comfort' });
    expect(v2.planV2(row({ persona: 'difficult' }), NY_7AM)).toEqual({ send: false, reason: 'comfort' });
  });

  it('skips a day she already read (her local date)', () => {
    expect(v2.planV2(row({ last_read_date: '2026-10-06' }), NY_7AM)).toEqual({ send: false, reason: 'read_today' });
  });

  it('read yesterday in New York is not read today, even when it is already the 6th in UTC', () => {
    // 01:00 UTC on the 7th is 9 pm on the 6th in New York.
    const p = v2.planV2(row({ preferred_hour: 21, last_read_date: '2026-10-06' }), new Date('2026-10-07T01:00:00Z'));
    expect(p).toEqual({ send: false, reason: 'read_today' });
  });

  it('no Sunday reminder for pastors while NO_SUNDAY_FOR_PASTORS (decision 14), and every other path still gets Sunday', () => {
    expect(v2.NO_SUNDAY_FOR_PASTORS).toBe(true);
    const sunday = new Date('2026-10-11T11:00:00Z'); // Sun 11 Oct, 7 am New York
    const r = { next_for_date: '2026-10-11' };
    expect(v2.planV2(row({ ...r, persona: 'pastor_leader' }), sunday)).toEqual({ send: false, reason: 'sunday_pastor' });
    expect(v2.planV2(row({ ...r, persona: 'pastor' }), sunday)).toEqual({ send: false, reason: 'sunday_pastor' });
    expect(v2.planV2(row({ ...r, persona: 'congregation' }), sunday).send).toBe(true);
    expect(v2.planV2(row({ persona: 'pastor_leader' }), NY_7AM).send).toBe(true); // a Tuesday
  });

  it('never twice: nothing within 12 hours of the last v2 send, whatever the clock says', () => {
    const elevenHoursAgo = new Date(NY_7AM.getTime() - 11 * 3600_000).toISOString();
    expect(v2.planV2(row({ last_sent_at: elevenHoursAgo }), NY_7AM)).toEqual({ send: false, reason: 'sent_recently' });
    const yesterday = new Date(NY_7AM.getTime() - 24 * 3600_000).toISOString();
    expect(v2.planV2(row({ last_sent_at: yesterday }), NY_7AM).send).toBe(true);
  });

  it('a time-zone change cannot bring a second reminder the same day', () => {
    // Sent at 7 am London (06:00 UTC, BST); she flies to New York and her row moves.
    const sentLondon = '2026-10-06T06:00:00Z';
    expect(v2.planV2(row({ last_sent_at: sentLondon }), NY_7AM)).toEqual({ send: false, reason: 'sent_recently' });
  });

  it('backs off after three unopened: the next comes three days after the last, and an open (streak 0) brings daily back', () => {
    // Three sent and unopened, the third on Mon 5 Oct: nothing Tue or Wed, then Thu 8 Oct.
    const lastSent = new Date(NY_7AM.getTime() - 86400_000).toISOString();
    const days = [];
    let state = { unopened_streak: 3, last_sent_at: lastSent };
    for (let i = 0; i < 9; i++) {
      const now = new Date(NY_7AM.getTime() + i * 86400_000);
      const date = now.toISOString().slice(0, 10);
      const p = v2.planV2(row({ ...state, next_for_date: date }), now);
      if (p.send) {
        days.push(date);
        state = { unopened_streak: state.unopened_streak + 1, last_sent_at: now.toISOString() };
      }
    }
    expect(days).toEqual(['2026-10-08', '2026-10-11', '2026-10-14']);
    expect(v2.planV2(row({ unopened_streak: 3, last_sent_at: lastSent }), NY_7AM)).toEqual({ send: false, reason: 'backoff' });
    expect(v2.planV2(row({ unopened_streak: 2, last_sent_at: lastSent }), NY_7AM).send).toBe(true);
    expect(v2.planV2(row({ unopened_streak: 0, last_sent_at: lastSent }), NY_7AM).send).toBe(true);
  });

  it('names her plan only on the day the device said it is due; any other day it is today\'s template', () => {
    const stale = v2.planV2(row({ next_for_date: '2026-10-05' }), NY_7AM);
    expect(stale).toMatchObject({ send: true, title: null, body: null, passage: null });
    const none = v2.planV2(row({ next_for_date: null, next_passage: null, next_label: null }), NY_7AM);
    expect(none).toMatchObject({ send: true, title: null, body: null });
  });

  it('a passage with no label keeps a template title', () => {
    const p = v2.planV2(row({ next_label: null }), NY_7AM);
    const titles = templates.TEMPLATES.en.map((x) => x.title);
    expect(titles).toContain(p.title);
    expect(p.body).toBe('John 3 is ready when you are.');
  });

  it('speaks her language', () => {
    expect(v2.planV2(row({ lang: 'es', next_passage: 'Juan 3', next_label: 'Día 12 de Bible Basics' }), NY_7AM).body)
      .toBe('Juan 3 te espera cuando quieras.');
    expect(v2.planV2(row({ lang: 'pt-BR', next_passage: 'João 3' }), NY_7AM).body).toBe('João 3 está pronto quando você quiser.');
    expect(v2.planV2(row({ lang: 'id', next_passage: 'Yohanes 3' }), NY_7AM).body).toBe('Yohanes 3 siap kapan pun kamu mau.');
  });

  it('never shows stored text that is too long or carries control characters', () => {
    expect(v2.planV2(row({ next_label: 'x'.repeat(81) }), NY_7AM).title).not.toBe('x'.repeat(81));
    expect(v2.planV2(row({ next_passage: 'John\n3' }), NY_7AM)).toMatchObject({ body: null });
    expect(v2.planV2(row({ next_passage: '$& 3' }), NY_7AM).body).toBe('$& 3 is ready when you are.');
  });

  it('an unknown time zone reads as New York', () => {
    expect(v2.planV2(row({ timezone: 'Not/AZone' }), NY_7AM).send).toBe(true);
  });
});

describe('daylight saving: the same local hour either side of the change', () => {
  it('Australia/Adelaide across Sun 4 Oct 2026 (ACST +9:30 → ACDT +10:30)', () => {
    const r = (date) => row({ timezone: 'Australia/Adelaide', next_for_date: date, last_read_date: null });
    // 7 am Adelaide is 21:30 UTC before the change and 20:30 UTC after; the
    // hourly run lands on :00 UTC, so her reminder comes at 7:30 local both sides.
    expect(v2.planV2(r('2026-10-03'), new Date('2026-10-02T22:00:00Z'))).toMatchObject({ send: true, localDate: '2026-10-03' });
    expect(v2.planV2(r('2026-10-03'), new Date('2026-10-02T21:00:00Z')).send).toBe(false);
    expect(v2.planV2(r('2026-10-05'), new Date('2026-10-04T21:00:00Z'))).toMatchObject({ send: true, localDate: '2026-10-05' });
    expect(v2.planV2(r('2026-10-05'), new Date('2026-10-04T20:00:00Z')).send).toBe(false);
    expect(v2.localNow('Australia/Adelaide', new Date('2026-10-02T22:00:00Z')).hour).toBe(7);
    expect(v2.localNow('Australia/Adelaide', new Date('2026-10-04T21:00:00Z')).hour).toBe(7);
  });

  it('America/New_York across Sun 1 Nov 2026 (EDT -4 → EST -5)', () => {
    const r = (date) => row({ next_for_date: date, last_read_date: null });
    expect(v2.planV2(r('2026-10-31'), new Date('2026-10-31T11:00:00Z'))).toMatchObject({ send: true, localDate: '2026-10-31' });
    expect(v2.planV2(r('2026-10-31'), new Date('2026-10-31T10:00:00Z')).send).toBe(false);
    expect(v2.planV2(r('2026-11-02'), new Date('2026-11-02T12:00:00Z'))).toMatchObject({ send: true, localDate: '2026-11-02' });
    expect(v2.planV2(r('2026-11-02'), new Date('2026-11-02T11:00:00Z')).send).toBe(false);
  });

  it('the day of the change itself sends once, at 7 local', () => {
    const at = [];
    let lastSent = null;
    for (let h = 0; h < 24; h++) {
      const now = new Date(Date.UTC(2026, 10, 1, h));
      if (v2.planV2(row({ next_for_date: '2026-11-01', last_sent_at: lastSent }), now).send) {
        at.push(v2.localNow('America/New_York', now).hour);
        lastSent = now.toISOString();
      }
    }
    expect(at).toEqual([7]);
  });
});

describe('the shadow list', () => {
  it('is the shadow_recipients plus any push row id in the note, lower-cased', () => {
    const ids = v2.shadowIds([' AB ', ''], `test device: ${ID.toUpperCase()} (owner's phone)`);
    expect([...ids].sort()).toEqual(['ab', ID].sort());
  });

  it('live is everyone; shadow is the list only; off and anything else is no one', () => {
    const ids = v2.shadowIds([], ID);
    expect(v2.inScope('live', 'other', ids)).toBe(true);
    expect(v2.inScope('shadow', ID, ids)).toBe(true);
    expect(v2.inScope('shadow', 'other', ids)).toBe(false);
    expect(v2.inScope('off', ID, ids)).toBe(false);
    expect(v2.inScope('LIVE', ID, ids)).toBe(false);
  });
});

describe('stateUpdates: what a device may store on its own push row', () => {
  const NOW = new Date('2026-10-06T11:00:00Z');

  it('takes the whitelisted fields and an open resets the unopened count', () => {
    const r = v2.stateUpdates({
      persona: 'congregation', journey_day: 12, next_passage: ' John 3 ', next_label: 'Day 12 of Bible Basics',
      next_for_date: '2026-10-06', last_read_date: '2026-10-05', opened: true,
    }, NOW);
    expect(r).toEqual({
      ok: true,
      updates: {
        persona: 'congregation', journey_day: 12, next_passage: 'John 3', next_label: 'Day 12 of Bible Basics',
        next_for_date: '2026-10-06', last_read_date: '2026-10-05',
        last_opened_at: NOW.toISOString(), unopened_streak: 0,
      },
    });
  });

  it('leaves absent fields alone, and opened: false changes nothing', () => {
    expect(v2.stateUpdates({ last_read_date: '2026-10-06', opened: false }, NOW)).toEqual({ ok: true, updates: { last_read_date: '2026-10-06' } });
    expect(v2.stateUpdates({}, NOW)).toEqual({ ok: true, updates: {} });
  });

  it('refuses unknown fields: no name, email or account id can ride along', () => {
    for (const extra of ['email', 'name', 'firstName', 'user_id', 'userId', 'phone', 'unopened_streak', 'last_opened_at', 'timezone']) {
      expect(v2.stateUpdates({ [extra]: 'x' }, NOW), extra).toEqual({ ok: false, error: 'unknown_field' });
    }
  });

  it('refuses long labels and passages, wrong types, bad dates and unknown paths', () => {
    expect(v2.stateUpdates({ next_label: 'x'.repeat(81) })).toEqual({ ok: false, error: 'too_long' });
    expect(v2.stateUpdates({ next_label: 'x'.repeat(80) }).ok).toBe(true);
    expect(v2.stateUpdates({ next_passage: 'x'.repeat(41) })).toEqual({ ok: false, error: 'too_long' });
    expect(v2.stateUpdates({ next_label: 'Day 1\nof' }).ok).toBe(false);
    expect(v2.stateUpdates({ next_label: 12 }).ok).toBe(false);
    expect(v2.stateUpdates({ journey_day: 0 }).ok).toBe(false);
    expect(v2.stateUpdates({ journey_day: 1.5 }).ok).toBe(false);
    expect(v2.stateUpdates({ journey_day: '12' }).ok).toBe(false);
    expect(v2.stateUpdates({ last_read_date: '2026-02-31' }).ok).toBe(false);
    expect(v2.stateUpdates({ next_for_date: 'tomorrow' }).ok).toBe(false);
    expect(v2.stateUpdates({ persona: 'admin' }).ok).toBe(false);
    expect(v2.stateUpdates({ opened: 'yes' }).ok).toBe(false);
    expect(v2.stateUpdates(null).ok).toBe(false);
    expect(v2.stateUpdates(['persona']).ok).toBe(false);
  });

  it('null clears a field', () => {
    expect(v2.stateUpdates({ next_label: null, persona: null, journey_day: null, next_for_date: null })).toEqual({
      ok: true, updates: { next_label: null, persona: null, journey_day: null, next_for_date: null },
    });
  });
});

describe('push words: no streak, missed, amazing or flame', () => {
  const GUILT = /streak|missed|amazing|🔥|racha|sequ[eê]ncia|perdi|incr[ií]vel|asombros|luar biasa|terlewat/i;

  it('holds for every template and the push_ready line in all four languages', () => {
    for (const lang of ['en', 'es', 'pt', 'id']) {
      for (const tpl of templates.TEMPLATES[lang]) {
        expect(tpl.title).not.toMatch(GUILT);
        expect(tpl.body).not.toMatch(GUILT);
      }
      expect(templates.PUSH_READY[lang]).toContain('{passage}');
      expect(templates.PUSH_READY[lang]).not.toMatch(GUILT);
    }
  });
});

describe('push-subscribe update: the whitelist at the door', () => {
  const ENDPOINT = 'https://push.example.test/sub/abc';
  let supa;
  let realCreate;
  let writes;
  let handler;

  beforeEach(() => {
    writes = [];
    supa = require('@supabase/supabase-js');
    realCreate = supa.createClient;
    supa.createClient = () => ({
      from(table) {
        return {
          update(patch) {
            return {
              async eq(col, val) {
                writes.push({ table, patch, col, val });
                return { error: null };
              },
            };
          },
        };
      },
    });
    delete require.cache[require.resolve('../../netlify/functions/push-subscribe.js')];
    handler = require('../../netlify/functions/push-subscribe.js').handler;
  });

  afterEach(() => {
    supa.createClient = realCreate;
    delete require.cache[require.resolve('../../netlify/functions/push-subscribe.js')];
  });

  const call = (body) => handler({ httpMethod: 'POST', headers: { origin: 'https://futuresdailyword.com' }, body: JSON.stringify(body) });

  it('stores the reading state apart from the hour and language, with no identity', async () => {
    const res = await call({
      action: 'update', subscription: { endpoint: ENDPOINT }, preferredHour: 6,
      state: { persona: 'congregation', next_label: 'Day 12 of Bible Basics', opened: true },
    });
    expect(res.statusCode).toBe(200);
    expect(writes).toHaveLength(2);
    expect(writes[0].patch).toEqual({ preferred_hour: 6 });
    expect(Object.keys(writes[1].patch).sort()).toEqual(['last_opened_at', 'next_label', 'persona', 'unopened_streak']);
    expect(writes[1].col).toBe('endpoint_hash');
  });

  it('refuses an unknown field or a long label before writing anything', async () => {
    for (const state of [{ email: 'reader@example.com' }, { next_label: 'x'.repeat(81) }]) {
      writes.length = 0;
      const res = await call({ action: 'update', subscription: { endpoint: ENDPOINT }, preferredHour: 6, state });
      expect(res.statusCode).toBe(400);
      expect(writes).toHaveLength(0);
    }
  });

  it('an update without state behaves exactly as before', async () => {
    const res = await call({ action: 'update', subscription: { endpoint: ENDPOINT }, lang: 'es' });
    expect(res.statusCode).toBe(200);
    expect(writes).toEqual([{ table: 'push_subscriptions', patch: { lang: 'es' }, col: 'endpoint_hash', val: expect.any(String) }]);
  });
});
