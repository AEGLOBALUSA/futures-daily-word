/**
 * Sunday's notes, pasted once (MOS-to-8 build B09-10): lib/quick-notes.js and
 * intake.js `notes_quick` / `notes_quick_status`.
 *
 * The quick path works out the date (next Sunday on the congregation's clock,
 * across the Adelaide and USA daylight-saving changes), the title, speaker,
 * series and YouTube link, fills the hub form's answers BY CONFIG, and never
 * publishes. Publishing reuses `submit` with those answers.
 *
 * NOTE: this file lives in tests/, never in netlify/functions/.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import Module from 'node:module';
import { createRequire } from 'node:module';
import crypto from 'node:crypto';
import { createFakeSupabase } from './helpers/fake-supabase.js';

const require_ = createRequire(import.meta.url);
const qn = require_('../../netlify/functions/lib/quick-notes.js');
const { formatSermon } = require_('../../netlify/functions/lib/sermon-format.js');

// The hub form as the live table has it (ids made up on purpose: matching is by config).
const HUB_QUESTIONS = [
  { id: 'x-date', sort_order: 100, label: 'Date preached', type: 'date', audience: 'hub', required: true, enabled: true, config: { publish: 'sermon_field', sermonKey: 'date' } },
  { id: 'x-title', sort_order: 110, label: 'Sermon title', type: 'text', audience: 'hub', required: true, enabled: true, config: { publish: 'sermon_field', sermonKey: 'title' } },
  { id: 'x-speaker', sort_order: 120, label: 'Speaker', type: 'text', audience: 'hub', required: true, enabled: true, config: { publish: 'sermon_field', sermonKey: 'speaker' } },
  { id: 'x-series', sort_order: 130, label: 'Series', type: 'text', audience: 'hub', required: false, enabled: true, config: { publish: 'sermon_field', sermonKey: 'series' } },
  { id: 'x-yt', sort_order: 170, label: 'YouTube URL', type: 'text', audience: 'hub', required: false, enabled: true, config: { publish: 'sermon_field', sermonKey: 'youtubeUrl' } },
  { id: 'x-have', sort_order: 250, label: 'Do you have your notes?', type: 'yes_no', audience: 'hub', required: true, enabled: true, config: { flow: 'notes_have' } },
  { id: 'x-paste', sort_order: 260, label: 'Paste your notes.', type: 'long_text', audience: 'hub', required: false, enabled: true, config: { flow: 'notes_paste', publish: 'sermon_field', sermonKey: 'outline' } },
  { id: 'x-ai', sort_order: 270, label: 'Would you like AI to format these?', type: 'yes_no', audience: 'hub', required: false, enabled: true, config: { flow: 'notes_ai', publish: 'sermon_reformat' } },
  { id: 'x-media-pick', sort_order: 200, label: 'Which sermon are you updating?', type: 'sermon_pick', audience: 'media', required: true, enabled: true, config: { publish: 'sermon_target' } },
  { id: 'x-media-yt', sort_order: 210, label: 'YouTube URL', type: 'text', audience: 'media', required: false, enabled: true, config: { publish: 'sermon_field', sermonKey: 'youtubeUrl' } },
  { id: 'x-media-paste', sort_order: 410, label: 'Paste notes if you are cleaning them up.', type: 'long_text', audience: 'media', required: false, enabled: true, config: { flow: 'notes_paste', publish: 'sermon_field', sermonKey: 'outline' } },
];
const MEDIA_QUESTIONS = qn.mediaQuestions(HUB_QUESTIONS, 'hub');

const NOTES = [
  'Title: Ordinary Faith',
  'Ps Sam Example',
  'Series: Built to Last',
  '',
  'Key verse: Hebrews 11:1',
  '',
  '1. Faith starts small',
  '- It is a seed',
  '2. Faith keeps going',
  'https://youtu.be/dQw4w9WgXcQ',
].join('\n');

const deterministic = (fields, opts) => formatSermon(fields, { ...opts, useAI: false });

describe('nextSundayFor: the congregation clock, both daylight-saving changes', () => {
  it('a Thursday in Atlanta gives that week\'s Sunday', () => {
    expect(qn.nextSundayFor('futures-us', new Date('2026-10-01T16:00:00Z'))).toBe('2026-10-04');
  });
  it('the date line: Sunday afternoon in Atlanta is already Monday in Adelaide', () => {
    const now = new Date('2026-10-04T20:00:00Z'); // Sun 16:00 New York, Mon 06:30 Adelaide (ACDT)
    expect(qn.nextSundayFor('futures-us', now)).toBe('2026-10-04');
    expect(qn.nextSundayFor('futuros-us', now)).toBe('2026-10-04');
    expect(qn.nextSundayFor('futures-au', now)).toBe('2026-10-11');
  });
  it('Adelaide moves to daylight time on Sun 4 Oct 2026: before and after the switch', () => {
    expect(qn.nextSundayFor('futures-au', new Date('2026-10-03T16:00:00Z'))).toBe('2026-10-04'); // Sun 01:30 ACST
    expect(qn.nextSundayFor('futures-au', new Date('2026-10-03T17:00:00Z'))).toBe('2026-10-04'); // Sun 03:30 ACDT
    expect(qn.nextSundayFor('futures-au', new Date('2026-10-03T13:00:00Z'))).toBe('2026-10-04'); // Sat 22:30 ACST
  });
  it('the USA leaves daylight time on Sun 1 Nov 2026: before and after the switch', () => {
    expect(qn.nextSundayFor('futures-us', new Date('2026-11-01T03:30:00Z'))).toBe('2026-11-01'); // Sat 23:30 EDT -> Sunday
    expect(qn.nextSundayFor('futures-us', new Date('2026-11-01T05:30:00Z'))).toBe('2026-11-01'); // Sun 01:30 EDT
    expect(qn.nextSundayFor('futures-us', new Date('2026-11-01T06:30:00Z'))).toBe('2026-11-01'); // Sun 01:30 EST
    expect(qn.nextSundayFor('futures-us', new Date('2026-11-02T04:30:00Z'))).toBe('2026-11-01'); // Sun 23:30 EST
    expect(qn.nextSundayFor('futures-us', new Date('2026-11-02T05:30:00Z'))).toBe('2026-11-08'); // Mon 00:30 EST
  });
});

describe('parseQuickText', () => {
  it('takes the labelled details and the link out of the notes, and keeps the rest as typed', () => {
    const p = qn.parseQuickText(NOTES);
    expect(p.labelled).toEqual({ title: 'Ordinary Faith', speaker: 'Ps Sam Example', series: 'Built to Last' });
    expect(p.youtubeUrl).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    expect(p.youtubeOnly).toBe(false);
    expect(p.notes).toContain('Key verse: Hebrews 11:1');
    expect(p.notes).toContain('1. Faith starts small');
    expect(p.notes).not.toMatch(/Title:|Series:|Ps Sam|youtu/);
  });
  it('a YouTube link on its own is YouTube only', () => {
    for (const link of ['https://youtu.be/dQw4w9WgXcQ', '  https://www.youtube.com/watch?v=dQw4w9WgXcQ  ', 'youtube.com/shorts/dQw4w9WgXcQ']) {
      const p = qn.parseQuickText(link);
      expect(p.youtubeOnly).toBe(true);
      expect(p.youtubeUrl).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    }
  });
  it('a broken YouTube link alone is flagged, not published', () => {
    const p = qn.parseQuickText('https://youtube.com/watch?v=short');
    expect(p.badLink).toBe(true);
    expect(p.notes).toBe('');
  });
  it('the first line reads as a title only when it looks like one', () => {
    expect(qn.titleFromFirstLine('Ordinary Faith\n- point')).toBe('Ordinary Faith');
    expect(qn.titleFromFirstLine('Good morning everyone, today we are going to talk about faith and what it means.')).toBe('');
    expect(qn.titleFromFirstLine('- a bullet\nmore')).toBe('');
    expect(qn.titleFromFirstLine('John 3:16')).toBe('');
  });
});

describe('quickNotes: works it out, fills by config, never publishes', () => {
  const NOW = new Date('2026-10-01T16:00:00Z'); // Thursday

  it('fills every hub answer from one paste, by config, with the next Sunday', async () => {
    const calls = [];
    const format = async (fields, opts) => { calls.push({ fields, opts }); return deterministic(fields, opts); };
    const out = await qn.quickNotes({ questions: qn.hubQuestions(HUB_QUESTIONS, 'hub'), text: NOTES, congregation: 'futures-us', now: NOW, current: null, format });
    expect(out.error).toBeUndefined();
    expect(out.sunday).toBe('2026-10-04');
    expect(out.details).toMatchObject({ title: 'Ordinary Faith', speaker: 'Ps Sam Example', series: 'Built to Last', date: '2026-10-04', youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', keyVerse: 'Hebrews 11:1' });
    expect(out.answers).toMatchObject({
      'x-date': '2026-10-04', 'x-title': 'Ordinary Faith', 'x-speaker': 'Ps Sam Example', 'x-series': 'Built to Last',
      'x-yt': 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'x-have': true, 'x-ai': true,
    });
    expect(out.answers['x-paste']).toContain('Faith starts small');
    expect(out.answers['x-media-yt']).toBeUndefined(); // the media job's question is not on the hub form
    expect(out.needs).toBeNull();
    expect(out.preview).toMatchObject({ id: 'ordinary-faith-2026-10-04', title: 'Ordinary Faith', date: '2026-10-04' });
    // One model call at most, and it sees the pasted notes only.
    expect(calls).toHaveLength(1);
    expect(calls[0].opts).toMatchObject({ useAI: true, base: null, retry: false });
    expect(calls[0].fields.outline).not.toMatch(/Title:|Series:|youtu/);
  });

  it('a media question with the same config is not part of the hub form passed in', () => {
    const visible = qn.hubQuestions(HUB_QUESTIONS, 'hub');
    expect(visible.map((q) => q.id)).not.toContain('x-media-yt');
  });

  it('matches by config, never by id: renamed ids fill the same', async () => {
    const renamed = HUB_QUESTIONS.map((q, i) => ({ ...q, id: `renamed-${i}` }));
    const out = await qn.quickNotes({ questions: renamed, text: NOTES, congregation: 'futures-us', now: NOW, current: null, format: deterministic });
    expect(out.answers['renamed-1']).toBe('Ordinary Faith');
    expect(out.answers['renamed-0']).toBe('2026-10-04');
  });

  it('YouTube only, nothing up for Sunday yet: asks for the title and shows no preview', async () => {
    let called = 0;
    const out = await qn.quickNotes({ questions: HUB_QUESTIONS, text: 'https://youtu.be/dQw4w9WgXcQ', congregation: 'futures-us', now: NOW, current: null, format: async () => { called++; return null; } });
    expect(out.youtubeOnly).toBe(true);
    expect(out.needs).toMatchObject({ key: 'title', questionId: 'x-title' });
    expect(out.preview).toBeNull();
    expect(called).toBe(0); // fetches nothing, calls no model
    expect(out.answers['x-have']).toBe(false);
  });

  it('YouTube only, then the title: the preview is built without a model, dated the Sunday just preached', async () => {
    // A link on its own is the video of a message already preached: on
    // Thursday 1 Oct with nothing up, that is Sunday 27 Sep, never the coming one.
    const out = await qn.quickNotes({ questions: HUB_QUESTIONS, text: 'https://youtu.be/dQw4w9WgXcQ', congregation: 'futures-us', now: NOW, current: null, overrides: { title: 'Ordinary Faith', speaker: 'Ps Sam Example' }, format: deterministic });
    expect(out.needs).toBeNull();
    expect(out.preview).toMatchObject({ title: 'Ordinary Faith', youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', date: '2026-09-27' });
    expect(out.attach).toBeNull();
  });

  it('YouTube only when this Sunday\'s message is already up: the link joins it, nothing to ask', async () => {
    const current = { id: 'faith-2026-10-04', congregation: 'futures-us', published_at: '2026-10-01T12:00:00Z', is_current: true, sermon: { id: 'faith-2026-10-04', title: 'Faith', speaker: 'Ps Sam Example', date: '2026-10-04', series: 'Built to Last', sections: [{ num: '1', title: 'Notes', content: [] }] } };
    const out = await qn.quickNotes({ questions: HUB_QUESTIONS, text: 'https://youtu.be/dQw4w9WgXcQ', congregation: 'futures-us', now: NOW, current, format: deterministic });
    expect(out.needs).toBeNull();
    expect(out.answers).toMatchObject({ 'x-title': 'Faith', 'x-speaker': 'Ps Sam Example', 'x-date': '2026-10-04', 'x-yt': 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' });
    expect(out.preview.id).toBe('faith-2026-10-04');
  });

  it('YouTube only when this Sunday\'s message is already up, with the media form: it attaches through the media merge', async () => {
    const current = { id: 'faith-2026-10-04', congregation: 'futures-us', published_at: '2026-10-01T12:00:00Z', is_current: true, sermon: { id: 'faith-2026-10-04', title: 'Faith', speaker: 'Ps Sam Example', date: '2026-10-04', sections: [{ num: '1', title: 'Notes', content: [] }] } };
    const out = await qn.quickNotes({ questions: HUB_QUESTIONS, mediaQuestions: MEDIA_QUESTIONS, text: 'https://youtu.be/dQw4w9WgXcQ', congregation: 'futures-us', now: NOW, current, format: deterministic });
    expect(out.needs).toBeNull();
    expect(out.attach).toEqual({ id: 'faith-2026-10-04', title: 'Faith', job: 'media', answers: { 'x-media-pick': 'faith-2026-10-04', 'x-media-yt': 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' } });
  });

  it('no speaker in the notes: offers last week\'s, marked as a guess', async () => {
    const current = { id: 'old', congregation: 'futures-us', published_at: '2026-09-24T12:00:00Z', is_current: true, sermon: { id: 'old', title: 'Grace', speaker: 'Ps Sam Example', date: '2026-09-27' } };
    const out = await qn.quickNotes({ questions: HUB_QUESTIONS, text: 'Ordinary Faith\n\n- Faith starts small', congregation: 'futures-us', now: NOW, current, format: deterministic });
    expect(out.details.title).toBe('Ordinary Faith');
    expect(out.details.speaker).toBe('Ps Sam Example');
    expect(out.guessed).toEqual(['speaker']);
  });

  it('no speaker anywhere: asks for the speaker, one question', async () => {
    const out = await qn.quickNotes({ questions: HUB_QUESTIONS, text: 'Ordinary Faith\n\n- Faith starts small', congregation: 'futures-us', now: NOW, current: null, format: deterministic });
    expect(out.needs).toMatchObject({ key: 'speaker', questionId: 'x-speaker' });
    expect(out.preview).not.toBeNull();
  });

  it('a follow-up answer reuses the preview and calls no model', async () => {
    const first = await qn.quickNotes({ questions: HUB_QUESTIONS, text: 'Ordinary Faith\n\n- Faith starts small', congregation: 'futures-us', now: NOW, current: null, format: deterministic });
    let called = 0;
    const second = await qn.quickNotes({ questions: HUB_QUESTIONS, text: 'Ordinary Faith\n\n- Faith starts small', congregation: 'futures-us', now: NOW, current: null, overrides: { speaker: 'Ps Sam Example' }, preview: first.preview, format: async () => { called++; return null; } });
    expect(called).toBe(0);
    expect(second.needs).toBeNull();
    expect(second.preview.speaker).toBe('Ps Sam Example');
  });

  it('nothing pasted: a plain refusal with a code', async () => {
    const out = await qn.quickNotes({ questions: HUB_QUESTIONS, text: '   ', congregation: 'futures-us', now: NOW, current: null, format: deterministic });
    expect(out).toMatchObject({ code: 'empty' });
  });

  it('a model that answers with a title and speaker fills them when the notes did not label them', async () => {
    const format = async () => ({ sermon: { id: 'x', title: 'Ordinary Faith', speaker: 'Ps Sam Example', series: '', date: '2026-10-04', keyVerse: 'Hebrews 11:1', sections: [{ num: '1', title: 'One', content: [] }] }, source: 'ai' });
    const out = await qn.quickNotes({ questions: HUB_QUESTIONS, text: 'Faith that keeps going\nlots of words here.', congregation: 'futures-us', now: NOW, current: null, format });
    expect(out.details).toMatchObject({ title: 'Ordinary Faith', speaker: 'Ps Sam Example', keyVerse: 'Hebrews 11:1' });
    expect(out.preview.id).toBe('ordinary-faith-2026-10-04');
  });
});

// Review of B09-10 (4 Oct 2026), the MUST: the card's own done line says
// "paste the YouTube link here after Sunday". On Monday that link is
// yesterday's video and must join yesterday's message, never become a new
// message for next Sunday.
describe('quickNotes: a link on Monday joins the message just preached', () => {
  const MONDAY = new Date('2026-10-05T14:00:00Z'); // Mon 5 Oct, 10:00 in New York
  const yesterday = () => ({
    id: 'ordinary-faith-2026-10-04', congregation: 'futures-us', is_current: true, published_at: '2026-10-01T15:00:00Z',
    sermon: { id: 'ordinary-faith-2026-10-04', title: 'Ordinary Faith', speaker: 'Ps Sam Example', series: 'Built to Last', date: '2026-10-04', keyVerse: 'Hebrews 11:1', sections: [{ num: '1', title: 'Faith starts small', content: [{ type: 'text', value: 'the notes' }] }] },
  });

  it('the Sunday just preached is yesterday on Monday, and today on a Sunday', () => {
    expect(qn.nextSundayFor('futures-us', MONDAY)).toBe('2026-10-11');
    expect(qn.lastSundayFor('futures-us', MONDAY)).toBe('2026-10-04');
    expect(qn.lastSundayFor('futures-us', new Date('2026-10-04T15:00:00Z'))).toBe('2026-10-04');
    expect(qn.lastSundayFor('futures-au', new Date('2026-10-04T15:00:00Z'))).toBe('2026-10-04'); // 01:30 Mon 5 Oct in Adelaide: the Sunday just gone
  });

  it('attaches to yesterday\'s message: its own date and id, no title asked, the media answers only', async () => {
    let called = 0;
    const out = await qn.quickNotes({ questions: qn.hubQuestions(HUB_QUESTIONS, 'hub'), mediaQuestions: MEDIA_QUESTIONS, text: 'https://youtu.be/dQw4w9WgXcQ', congregation: 'futures-us', now: MONDAY, current: yesterday(), format: async () => { called++; return null; } });
    expect(called).toBe(0);
    expect(out.needs).toBeNull();
    expect(out.sunday).toBe('2026-10-11');
    expect(out.details).toMatchObject({ title: 'Ordinary Faith', date: '2026-10-04', youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' });
    expect(out.preview).toMatchObject({ id: 'ordinary-faith-2026-10-04', date: '2026-10-04', title: 'Ordinary Faith', youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' });
    expect(out.preview.sections[0].title).toBe('Faith starts small'); // the notes stay
    expect(out.attach).toEqual({
      id: 'ordinary-faith-2026-10-04', title: 'Ordinary Faith', job: 'media',
      answers: { 'x-media-pick': 'ordinary-faith-2026-10-04', 'x-media-yt': 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
    });
    expect(out.attach.answers['x-media-paste']).toBeUndefined();
  });

  it('without a media question for the link it still keeps yesterday\'s date and id, and asks nothing', async () => {
    const out = await qn.quickNotes({ questions: qn.hubQuestions(HUB_QUESTIONS, 'hub'), mediaQuestions: [], text: 'https://youtu.be/dQw4w9WgXcQ', congregation: 'futures-us', now: MONDAY, current: yesterday(), format: deterministic });
    expect(out.attach).toBeNull();
    expect(out.needs).toBeNull();
    expect(out.preview).toMatchObject({ id: 'ordinary-faith-2026-10-04', date: '2026-10-04' });
    expect(out.answers).toMatchObject({ 'x-title': 'Ordinary Faith', 'x-date': '2026-10-04' });
  });

  it('a message older than last Sunday (past its week) is not the target: asks the title, dated yesterday', async () => {
    const old = { ...yesterday(), id: 'grace-2026-09-27', published_at: '2026-09-24T15:00:00Z', sermon: { ...yesterday().sermon, id: 'grace-2026-09-27', title: 'Grace', date: '2026-09-27' } };
    const out = await qn.quickNotes({ questions: qn.hubQuestions(HUB_QUESTIONS, 'hub'), mediaQuestions: MEDIA_QUESTIONS, text: 'https://youtu.be/dQw4w9WgXcQ', congregation: 'futures-us', now: MONDAY, current: old, format: deterministic });
    expect(out.attach).toBeNull();
    expect(out.needs).toMatchObject({ key: 'title' });
    expect(out.details.date).toBe('2026-10-04');
  });

  it('notes pasted on Monday are still for the coming Sunday', async () => {
    const out = await qn.quickNotes({ questions: qn.hubQuestions(HUB_QUESTIONS, 'hub'), mediaQuestions: MEDIA_QUESTIONS, text: NOTES, congregation: 'futures-us', now: MONDAY, current: yesterday(), format: deterministic });
    expect(out.attach).toBeNull();
    expect(out.details.date).toBe('2026-10-11');
    expect(out.preview.id).toBe('ordinary-faith-2026-10-11');
  });
});

// ── intake.js: who may call it, and that it never publishes ────────────────
const realLoad = Module._load;
let handler;
let fake;

function sha(raw) { return crypto.createHash('sha256').update(raw).digest('hex'); }

beforeAll(() => {
  Module._load = function (request, ...rest) {
    if (request === '@supabase/supabase-js') return { createClient: () => ({ from: (t) => fake.from(t), rpc: fake.rpc }) };
    if (request === './lib/rate-limit') return { isSharedRateLimited: async () => false };
    return realLoad.call(this, request, ...rest);
  };
  process.env.SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_KEY = 'service-key';
  delete process.env.ANTHROPIC_API_KEY; // the rule-based formatter: no network in tests
  ({ handler } = require_('../../netlify/functions/intake.js'));
});
afterAll(() => { Module._load = realLoad; });

const TOKENS = { hub: 'h'.repeat(64), campus: 'c'.repeat(64), media: 'm'.repeat(64), admin: 'a'.repeat(64) };

beforeEach(() => {
  const future = new Date(Date.now() + 86400000).toISOString();
  fake = createFakeSupabase({
    staff_roster: [
      { email: 'hub.person@futures.church', role: 'hub', campus_id: 'au-paradise', display_name: 'Hub Person', campus_set_by: 'admin' },
      { email: 'campus.person@futures.church', role: 'campus', campus_id: 'us-gwinnett', display_name: 'Campus Person', campus_set_by: 'admin' },
      { email: 'media.person@futures.church', role: 'media', campus_id: null, display_name: 'Media Person', campus_set_by: null },
      { email: 'ae@futures.global', role: 'admin', campus_id: null, display_name: 'Owner', campus_set_by: null },
    ],
    staff_sessions: [
      { token_hash: sha(TOKENS.hub), email: 'hub.person@futures.church', expires_at: future },
      { token_hash: sha(TOKENS.campus), email: 'campus.person@futures.church', expires_at: future },
      { token_hash: sha(TOKENS.media), email: 'media.person@futures.church', expires_at: future },
      { token_hash: sha(TOKENS.admin), email: 'ae@futures.global', expires_at: future },
    ],
    intake_questions: HUB_QUESTIONS.map((q) => ({ ...q })),
    intake_submissions: [],
    published_sermons: [],
    dw_campuses: [],
  });
});

async function call(body, token) {
  const headers = { origin: 'https://futuresdailyword.com', 'x-forwarded-for': '203.0.113.9' };
  if (token) headers.authorization = `Bearer ${token}`;
  const res = await handler({ httpMethod: 'POST', headers, body: JSON.stringify(body) });
  return { status: res.statusCode, body: JSON.parse(res.body || '{}') };
}

describe('notes_quick: the gate', () => {
  it('anon is refused with 401', async () => {
    expect((await call({ action: 'notes_quick', text: NOTES })).status).toBe(401);
    expect((await call({ action: 'notes_quick_status' })).status).toBe(401);
  });
  it('a campus pastor is refused with 403', async () => {
    const r = await call({ action: 'notes_quick', text: NOTES, congregation: 'futures-us' }, TOKENS.campus);
    expect(r.status).toBe(403);
    expect((await call({ action: 'notes_quick_status' }, TOKENS.campus)).status).toBe(403);
  });
  it('hub, media and admin staff get a preview', async () => {
    for (const who of ['hub', 'media', 'admin']) {
      const r = await call({ action: 'notes_quick', text: NOTES, congregation: 'futures-us' }, TOKENS[who]);
      expect(r.status).toBe(200);
      expect(r.body.published).toBe(false);
      expect(r.body.preview.title).toBe('Ordinary Faith');
    }
  });
});

describe('notes_quick: drafts first', () => {
  it('never writes a submission or a published row, however often it is called', async () => {
    await call({ action: 'notes_quick', text: NOTES, congregation: 'futures-us' }, TOKENS.hub);
    await call({ action: 'notes_quick', text: 'https://youtu.be/dQw4w9WgXcQ', congregation: 'futures-us' }, TOKENS.hub);
    expect(fake.tables.intake_submissions).toHaveLength(0);
    expect(fake.tables.published_sermons).toHaveLength(0);
  });

  it('the church defaults to the staff member\'s own campus\'s congregation', async () => {
    const r = await call({ action: 'notes_quick_status' }, TOKENS.hub);
    expect(r.status).toBe(200);
    expect(r.body.congregation).toBe('futures-au');
    expect(r.body.up).toBe(false);
  });

  it('the confirmed preview publishes through submit with the answers it returned', async () => {
    const q = await call({ action: 'notes_quick', text: NOTES, congregation: 'futures-us' }, TOKENS.hub);
    const s = await call({ action: 'submit', job: 'hub', congregation: 'futures-us', answers: q.body.answers, formatted_sermon: q.body.preview }, TOKENS.hub);
    expect(s.status).toBe(200);
    expect(s.body.published).toBe(true);
    const row = fake.tables.published_sermons.find((r) => r.is_current);
    expect(row.sermon).toMatchObject({ title: 'Ordinary Faith', speaker: 'Ps Sam Example', series: 'Built to Last' });
    expect(row.id).toBe(q.body.preview.id);
    const status = await call({ action: 'notes_quick_status', congregation: 'futures-us' }, TOKENS.hub);
    expect(status.body.up).toBe(true);
  });

  it('a new week\'s message never overwrites last week\'s row (the archive keeps both)', async () => {
    fake.tables.published_sermons.push({
      id: 'grace-2026-09-27', congregation: 'futures-us', is_current: true, published_at: new Date(Date.now() - 2 * 86400000).toISOString(),
      sermon: { id: 'grace-2026-09-27', title: 'Grace', speaker: 'Ps Sam Example', date: new Date(Date.now() - 86400000).toISOString().slice(0, 10), sections: [{ num: '1', title: 'Old notes', content: [{ type: 'text', value: 'last week' }] }] },
    });
    const q = await call({ action: 'notes_quick', text: NOTES, congregation: 'futures-us' }, TOKENS.hub);
    const s = await call({ action: 'submit', job: 'hub', congregation: 'futures-us', answers: q.body.answers, formatted_sermon: q.body.preview }, TOKENS.hub);
    expect(s.status).toBe(200);
    const rows = fake.tables.published_sermons;
    expect(rows).toHaveLength(2);
    expect(rows.find((r) => r.id === 'grace-2026-09-27').sermon.title).toBe('Grace');
    expect(rows.find((r) => r.is_current).sermon.title).toBe('Ordinary Faith');
  });

  it('a new title with no notes yet does not publish last week\'s notes under it', async () => {
    fake.tables.published_sermons.push({
      id: 'grace-2026-09-27', congregation: 'futures-us', is_current: true, published_at: new Date(Date.now() - 2 * 86400000).toISOString(),
      sermon: { id: 'grace-2026-09-27', title: 'Grace', speaker: 'Ps Sam Example', date: new Date(Date.now() - 86400000).toISOString().slice(0, 10), sections: [{ num: '1', title: 'Old notes', content: [{ type: 'text', value: 'last week' }] }] },
    });
    const answers = { 'x-date': '2026-10-04', 'x-title': 'Ordinary Faith', 'x-speaker': 'Ps Sam Example', 'x-have': false, 'x-yt': 'https://youtu.be/dQw4w9WgXcQ' };
    const s = await call({ action: 'submit', job: 'hub', congregation: 'futures-us', answers }, TOKENS.hub);
    expect(s.status).toBe(200);
    const now = fake.tables.published_sermons.find((r) => r.is_current);
    expect(now.sermon.title).toBe('Ordinary Faith');
    expect(JSON.stringify(now.sermon.sections)).not.toContain('last week');
    expect(fake.tables.published_sermons.find((r) => r.id === 'grace-2026-09-27').sermon.title).toBe('Grace');
  });
});

describe('notes_quick then submit on a frozen Monday: the link joins yesterday\'s row', () => {
  afterEach(() => { vi.useRealTimers(); });

  it('keeps the row\'s id, date, notes and published_at, adds only the link, and the Saturday check still sees next Sunday as missing', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-05T14:00:00Z')); // Mon 5 Oct, 10:00 in New York
    const publishedAt = '2026-10-01T15:00:00.000Z';
    fake.tables.published_sermons.push({
      id: 'ordinary-faith-2026-10-04', congregation: 'futures-us', is_current: true, published_at: publishedAt,
      sermon: { id: 'ordinary-faith-2026-10-04', title: 'Ordinary Faith', speaker: 'Ps Sam Example', date: '2026-10-04', sections: [{ num: '1', title: 'Faith starts small', content: [{ type: 'text', value: 'the notes' }] }] },
    });
    const q = await call({ action: 'notes_quick', text: 'https://youtu.be/dQw4w9WgXcQ', congregation: 'futures-us' }, TOKENS.hub);
    expect(q.status).toBe(200);
    expect(q.body.needs).toBeNull();
    expect(q.body.details.date).toBe('2026-10-04');
    expect(q.body.attach).toMatchObject({ id: 'ordinary-faith-2026-10-04', job: 'media' });
    // What quickNotesPublish sends for an attach: the media job, the media answers only.
    const s = await call({ action: 'submit', job: q.body.attach.job, congregation: 'futures-us', answers: q.body.attach.answers }, TOKENS.hub);
    expect(s.status).toBe(200);
    expect(s.body.published).toBe(true);
    const rows = fake.tables.published_sermons;
    expect(rows).toHaveLength(1);
    const row = rows[0];
    expect(row.id).toBe('ordinary-faith-2026-10-04');
    expect(row.is_current).toBe(true);
    expect(row.published_at).toBe(publishedAt);
    expect(row.sermon).toMatchObject({ id: 'ordinary-faith-2026-10-04', title: 'Ordinary Faith', date: '2026-10-04', youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' });
    expect(row.sermon.sections[0].title).toBe('Faith starts small');
    expect(row.sermon.youtubeOnly).toBeUndefined();
    expect(qn.isForSunday(row, '2026-10-11', 'futures-us')).toBe(false);
    const status = await call({ action: 'notes_quick_status', congregation: 'futures-us' }, TOKENS.hub);
    expect(status.body).toMatchObject({ sunday: '2026-10-11', up: false });
  });
});
