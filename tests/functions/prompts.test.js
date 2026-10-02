/**
 * Daily Word prompt switches and send log (MOS-to-8 build B09-01):
 * netlify/functions/lib/prompts.js.
 *
 * Every helper fails closed: a database error reads as "off", a duplicate or
 * failed log insert means "do not send", and the staff email never throws.
 *
 * NOTE: this file lives in tests/, never in netlify/functions/. Netlify treats
 * every file in the functions directory as a function and rejects the name.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const prompts = require('../../netlify/functions/lib/prompts.js');
const { modeOf, switchOf, claim, deliverable, sendStaffEmail, lintStaffText, markDelivered, raiseStaffEmail } = prompts;

const OWNER = 'owner@example.com';
const STAFF = 'staff@example.com';

/** A tiny stand-in for the two tables, with dw_prompt_log.dedupe_key unique. */
function fakeDb({ kinds = {}, throwOn = null, errorOn = null } = {}) {
  const log = [];
  return {
    log,
    from(table) {
      if (throwOn === table) throw new Error('connection refused');
      if (table === 'dw_prompt_kind') {
        let kind;
        const q = {
          select() { return q; },
          eq(col, val) { if (col === 'kind') kind = val; return q; },
          async maybeSingle() {
            if (errorOn === table) return { data: null, error: { message: 'boom' } };
            const row = kinds[kind];
            return { data: row ? { mode: row.mode, shadow_recipients: row.shadow_recipients || [] } : null, error: null };
          },
        };
        return q;
      }
      if (table === 'dw_prompt_log') {
        return {
          async insert(row) {
            if (errorOn === table) return { error: { code: '42501', message: 'permission denied' } };
            if (log.some((r) => r.dedupe_key === row.dedupe_key)) {
              return { error: { code: '23505', message: 'duplicate key value violates unique constraint' } };
            }
            log.push({ delivered: false, ...row });
            return { error: null };
          },
          update(patch) {
            return {
              async eq(col, val) {
                if (errorOn === table) return { error: { code: '42501', message: 'permission denied' } };
                log.filter((r) => r[col] === val).forEach((r) => Object.assign(r, patch));
                return { error: null };
              },
            };
          },
        };
      }
      throw new Error(`unexpected table ${table}`);
    },
  };
}

const CLAIM = {
  kind: 'dw_prayer_held',
  dedupeKey: 'prayer_held:123',
  recipient: OWNER,
  writtenBy: 'template',
  title: 'A prayer post is waiting',
  body: 'Alpharetta: 1 post waiting',
  link: 'https://futuresdailyword.com/staff',
  mode: 'shadow',
};

describe('modeOf', () => {
  it('returns the row mode', async () => {
    const db = fakeDb({ kinds: { dw_prayer_held: { mode: 'shadow' } } });
    expect(await modeOf(db, 'dw_prayer_held')).toBe('shadow');
  });

  it("returns 'off' when the database throws", async () => {
    const db = fakeDb({ throwOn: 'dw_prompt_kind' });
    expect(await modeOf(db, 'dw_prayer_held')).toBe('off');
  });

  it("returns 'off' when the database answers with an error", async () => {
    const db = fakeDb({ kinds: { dw_prayer_held: { mode: 'live' } }, errorOn: 'dw_prompt_kind' });
    expect(await modeOf(db, 'dw_prayer_held')).toBe('off');
  });

  it("returns 'off' for a missing row, an unknown mode, a bad kind or no client", async () => {
    const db = fakeDb({ kinds: { dw_odd: { mode: 'everyone' } } });
    expect(await modeOf(db, 'dw_not_seeded')).toBe('off');
    expect(await modeOf(db, 'dw_odd')).toBe('off');
    expect(await modeOf(db, 'not a kind')).toBe('off');
    expect(await modeOf(db, undefined)).toBe('off');
    expect(await modeOf(null, 'dw_prayer_held')).toBe('off');
  });

  it('switchOf hands back the shadow list, trimmed and lower-cased', async () => {
    const db = fakeDb({ kinds: { dw_prayer_held: { mode: 'shadow', shadow_recipients: [' Owner@Example.com ', ''] } } });
    expect(await switchOf(db, 'dw_prayer_held')).toEqual({ mode: 'shadow', shadowRecipients: [OWNER] });
  });
});

describe('claim', () => {
  it('returns true the first time and false on the second identical key', async () => {
    const db = fakeDb();
    expect(await claim(db, CLAIM)).toBe(true);
    expect(await claim(db, CLAIM)).toBe(false);
    expect(db.log).toHaveLength(1);
    expect(db.log[0]).toMatchObject({
      kind: 'dw_prayer_held',
      dedupe_key: 'prayer_held:123',
      recipient: OWNER,
      mode: 'shadow',
      written_by: 'template',
    });
  });

  it('a different key is a different claim', async () => {
    const db = fakeDb();
    expect(await claim(db, CLAIM)).toBe(true);
    expect(await claim(db, { ...CLAIM, dedupeKey: 'prayer_held:124' })).toBe(true);
  });

  it('returns false (never throws) when the insert fails or throws', async () => {
    expect(await claim(fakeDb({ errorOn: 'dw_prompt_log' }), CLAIM)).toBe(false);
    expect(await claim(fakeDb({ throwOn: 'dw_prompt_log' }), CLAIM)).toBe(false);
  });

  it('refuses an off mode, an unknown writer, an empty key or an empty recipient', async () => {
    const db = fakeDb();
    expect(await claim(db, { ...CLAIM, mode: 'off' })).toBe(false);
    expect(await claim(db, { ...CLAIM, writtenBy: 'robot' })).toBe(false);
    expect(await claim(db, { ...CLAIM, dedupeKey: '  ' })).toBe(false);
    expect(await claim(db, { ...CLAIM, recipient: '' })).toBe(false);
    expect(await claim(db, { ...CLAIM, kind: 'prayer_held' })).toBe(false);
    expect(await claim(null, CLAIM)).toBe(false);
    expect(db.log).toHaveLength(0);
  });
});

describe('deliverable', () => {
  const list = [OWNER];
  it('live, recipient on the list: yes', () => expect(deliverable('live', OWNER, list)).toBe(true));
  it('live, recipient not on the list: yes', () => expect(deliverable('live', STAFF, list)).toBe(true));
  it('shadow, recipient on the list: yes', () => expect(deliverable('shadow', OWNER, list)).toBe(true));
  it('shadow, recipient not on the list: no', () => expect(deliverable('shadow', STAFF, list)).toBe(false));
  it('off, recipient on the list: no', () => expect(deliverable('off', OWNER, list)).toBe(false));
  it('off, recipient not on the list: no', () => expect(deliverable('off', STAFF, list)).toBe(false));

  it('matches the shadow list however the address is typed', () => {
    expect(deliverable('shadow', '  OWNER@example.COM ', list)).toBe(true);
  });

  it('an unknown mode, an empty recipient or a missing list is no', () => {
    expect(deliverable('everyone', OWNER, list)).toBe(false);
    expect(deliverable(undefined, OWNER, list)).toBe(false);
    expect(deliverable('live', '', list)).toBe(false);
    expect(deliverable('shadow', OWNER, undefined)).toBe(false);
    expect(deliverable('shadow', OWNER, [])).toBe(false);
  });
});

describe('lintStaffText', () => {
  it('passes plain words', () => {
    expect(lintStaffText("Sunday's notes for Alpharetta are not up yet.")).toEqual({ ok: true, reasons: [] });
  });

  it('rejects undefined, null and template braces', () => {
    expect(lintStaffText('Hello undefined').ok).toBe(false);
    expect(lintStaffText('Campus: null').ok).toBe(false);
    expect(lintStaffText('Hello {name}').reasons).toContain('template_braces');
    expect(lintStaffText('Hello {{name}}').reasons).toContain('template_braces');
    expect(lintStaffText('Hello ${name}').reasons).toContain('template_braces');
    expect(lintStaffText('[object Object] waiting').ok).toBe(false);
  });

  it('rejects empty or non-text', () => {
    expect(lintStaffText('').ok).toBe(false);
    expect(lintStaffText('   ').ok).toBe(false);
    expect(lintStaffText(undefined).ok).toBe(false);
    expect(lintStaffText(null).ok).toBe(false);
  });
});

describe('sendStaffEmail', () => {
  const realFetch = globalThis.fetch;
  const realKey = process.env.RESEND_API_KEY;
  const realFrom = process.env.SERMON_NOTES_FROM;
  let fetchMock;

  beforeEach(() => {
    process.env.RESEND_API_KEY = 'test-key';
    delete process.env.SERMON_NOTES_FROM;
    fetchMock = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ id: 'email_1' }) }));
    globalThis.fetch = fetchMock;
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    globalThis.fetch = realFetch;
    if (realKey === undefined) delete process.env.RESEND_API_KEY; else process.env.RESEND_API_KEY = realKey;
    if (realFrom === undefined) delete process.env.SERMON_NOTES_FROM; else process.env.SERMON_NOTES_FROM = realFrom;
    vi.restoreAllMocks();
  });

  it('sends one plain-text email from the Sermon Notes sender', async () => {
    const out = await sendStaffEmail({ to: STAFF, subject: 'Sunday notes', text: 'Put up Sunday notes.' });
    expect(out).toEqual({ ok: true, id: 'email_1' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.resend.com/emails');
    const sent = JSON.parse(init.body);
    expect(sent.from).toBe('Futures Daily Word <notes@futuresdailyword.com>');
    expect(sent.to).toEqual([STAFF]);
    expect(sent.text).toBe('Put up Sunday notes.');
    expect(sent).not.toHaveProperty('html');
  });

  it('never throws: a network failure is { ok: false }', async () => {
    globalThis.fetch = vi.fn(async () => { throw new Error('network down'); });
    await expect(sendStaffEmail({ to: STAFF, subject: 'Hi', text: 'Body' })).resolves.toEqual({ ok: false, error: 'provider' });
  });

  it('a Resend refusal is { ok: false }', async () => {
    globalThis.fetch = vi.fn(async () => ({ ok: false, status: 422, json: async () => ({ message: 'bad' }) }));
    await expect(sendStaffEmail({ to: STAFF, subject: 'Hi', text: 'Body' })).resolves.toEqual({ ok: false, error: 'provider' });
  });

  it('sends nothing without a key, to a bad address, or with unfilled text', async () => {
    delete process.env.RESEND_API_KEY;
    expect(await sendStaffEmail({ to: STAFF, subject: 'Hi', text: 'Body' })).toEqual({ ok: false, error: 'not_configured' });
    process.env.RESEND_API_KEY = 'test-key';
    expect(await sendStaffEmail({ to: 'not-an-address', subject: 'Hi', text: 'Body' })).toEqual({ ok: false, error: 'bad_recipient' });
    expect(await sendStaffEmail({ to: STAFF, subject: 'Hi {name}', text: 'Body' })).toEqual({ ok: false, error: 'lint' });
    expect(await sendStaffEmail({ to: STAFF, subject: 'Hi', text: 'Campus undefined' })).toEqual({ ok: false, error: 'lint' });
    expect(await sendStaffEmail()).toEqual({ ok: false, error: 'bad_recipient' });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('raiseStaffEmail (the one helper later builds call)', () => {
  const realFetch = globalThis.fetch;
  const realKey = process.env.RESEND_API_KEY;
  let fetchMock;
  const RAISE = { ...CLAIM, subject: 'A prayer post is waiting', text: 'Alpharetta: 1 post waiting.' };
  delete RAISE.mode;

  beforeEach(() => {
    process.env.RESEND_API_KEY = 'test-key';
    fetchMock = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ id: 'email_9' }) }));
    globalThis.fetch = fetchMock;
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    globalThis.fetch = realFetch;
    if (realKey === undefined) delete process.env.RESEND_API_KEY; else process.env.RESEND_API_KEY = realKey;
    vi.restoreAllMocks();
  });

  it('an off kind sends nothing and logs nothing', async () => {
    const db = fakeDb({ kinds: { dw_prayer_held: { mode: 'off', shadow_recipients: [OWNER] } } });
    expect(await raiseStaffEmail(db, RAISE)).toEqual({ sent: false, reason: 'off' });
    expect(db.log).toHaveLength(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('a shadow kind sends nothing to someone off the list', async () => {
    const db = fakeDb({ kinds: { dw_prayer_held: { mode: 'shadow', shadow_recipients: [OWNER] } } });
    expect(await raiseStaffEmail(db, { ...RAISE, recipient: STAFF })).toEqual({ sent: false, reason: 'off' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('a database failure reads as off and sends nothing', async () => {
    const db = fakeDb({ throwOn: 'dw_prompt_kind' });
    expect(await raiseStaffEmail(db, RAISE)).toEqual({ sent: false, reason: 'off' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('shadow to the list: sends once, marks delivered, refuses the repeat', async () => {
    const db = fakeDb({ kinds: { dw_prayer_held: { mode: 'shadow', shadow_recipients: [OWNER] } } });
    expect(await raiseStaffEmail(db, RAISE)).toEqual({ sent: true, id: 'email_9' });
    expect(db.log).toHaveLength(1);
    expect(db.log[0].delivered).toBe(true);
    expect(db.log[0].mode).toBe('shadow');
    expect(await raiseStaffEmail(db, RAISE)).toEqual({ sent: false, reason: 'duplicate' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('unfilled words are refused before the key is spent', async () => {
    const db = fakeDb({ kinds: { dw_prayer_held: { mode: 'live' } } });
    expect(await raiseStaffEmail(db, { ...RAISE, text: 'Campus {campus}' })).toEqual({ sent: false, reason: 'lint' });
    expect(db.log).toHaveLength(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('a failed send leaves the row delivered = false', async () => {
    globalThis.fetch = vi.fn(async () => ({ ok: false, status: 500, json: async () => ({}) }));
    const db = fakeDb({ kinds: { dw_prayer_held: { mode: 'live' } } });
    expect(await raiseStaffEmail(db, RAISE)).toEqual({ sent: false, reason: 'provider' });
    expect(db.log).toHaveLength(1);
    expect(db.log[0].delivered).toBe(false);
  });

  it('markDelivered never throws and refuses an empty key', async () => {
    expect(await markDelivered(fakeDb({ throwOn: 'dw_prompt_log' }), 'k')).toBe(false);
    expect(await markDelivered(fakeDb({ errorOn: 'dw_prompt_log' }), 'k')).toBe(false);
    expect(await markDelivered(fakeDb(), '')).toBe(false);
  });
});
