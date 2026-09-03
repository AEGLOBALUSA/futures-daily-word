/**
 * "Email these notes to me" — netlify/functions/lib/notes-email.js.
 * The two rules under test: only the sermon's own keys travel, and no verse text leaves.
 */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const m = require('../../netlify/functions/lib/notes-email.js');

const SERMON = {
  id: 'grace-2026-09-06',
  title: 'Grace <that> Holds',
  series: 'Held',
  date: '2026-09-06',
  speaker: 'Ashley Evans',
  keyVerse: 'Romans 8:1',
  keyVerseText: 'Therefore, there is now no condemnation for those who are in Christ Jesus,',
  sections: [
    { num: '1', title: 'Nothing left to prove', content: [
      { type: 'text', value: 'Paul writes to a church under pressure.' },
      { type: 'quote', text: 'For it is by grace you have been saved, through faith', ref: 'Ephesians 2:8' },
      { type: 'blank', before: 'Grace is', after: 'not earned.' },
      { type: 'bullet', value: 'A gift, not a wage' },
    ] },
    { num: '2', title: 'Nothing left to fear', content: [
      { type: 'quote', text: 'There is no fear in love', ref: '1 John 4:18' },
      { type: 'blank', before: 'Fear says' },
      { type: 'note', value: 'Pastor note' },
    ] },
  ],
  responsePrompts: ['Where do you need grace this week?', '', 'Who can you tell?'],
  commitments: ['Read Romans 8 this week', 'Tell one person'],
};

describe('notes email — which answers are accepted', () => {
  it('mirrors the ids the Sermon Notes page and the workspace write', () => {
    const keys = m.responseKeys(SERMON);
    expect(keys.has('blank-grace-2026-09-06-1-2')).toBe(true);
    expect(keys.has('blank-grace-2026-09-06-2-1')).toBe(true);
    expect(keys.has('resp-grace-2026-09-06-0')).toBe(true);
    expect(keys.has('resp-grace-2026-09-06-1')).toBe(true); // the empty prompt is filtered before indexing, as the page does
    expect(keys.has('resp-grace-2026-09-06-2')).toBe(false);
    expect(keys.has('commit-0')).toBe(true);
    expect(keys.has('commit-2')).toBe(false);
    expect(keys.has('ws-notes')).toBe(true);
    expect(keys.has('blank-grace-2026-09-06-1-0')).toBe(false); // a text item is not a blank
  });

  it('drops keys the sermon does not have, strips control characters and bounds every value', () => {
    const picked = m.pickResponses(SERMON, {
      'blank-grace-2026-09-06-1-2': '  free\u0000 and\r\nunearned  ',
      'resp-grace-2026-09-06-0': 'At work',
      'ws-notes': 'x'.repeat(10_000),
      'blank-other-1-2': 'someone else’s sermon',
      subject: 'hijack',
      'ws-prayer': 42,
      'commit-0': '1',
    });
    expect(Object.keys(picked).sort()).toEqual(['blank-grace-2026-09-06-1-2', 'commit-0', 'resp-grace-2026-09-06-0', 'ws-notes']);
    expect(picked['blank-grace-2026-09-06-1-2']).toBe('free and\nunearned');
    expect(picked['ws-notes'].length).toBe(m.MAX_VALUE_CHARS);
  });

  it('never throws on a bad shape', () => {
    expect(m.pickResponses(SERMON, null)).toEqual({});
    expect(m.pickResponses(SERMON, [1, 2])).toEqual({});
    expect(m.pickResponses(null, { 'ws-notes': 'hi' })).toEqual({ 'ws-notes': 'hi' });
  });
});

describe('notes email — what goes out', () => {
  const responses = {
    'blank-grace-2026-09-06-1-2': 'free & unearned',
    'resp-grace-2026-09-06-0': 'At work, honestly.',
    'ws-takeaways': 'Stop keeping score',
    'commit-1': '1',
  };
  const mail = m.renderNotesEmail({ sermon: SERMON, responses, lang: 'en', appUrl: 'https://futuresdailyword.com' });

  it('carries the references and never the verse text (licence: references only)', () => {
    for (const part of [mail.text, mail.html]) {
      expect(part).toContain('Romans 8:1');
      expect(part).toContain('Ephesians 2:8');
      expect(part).not.toContain('no condemnation');
      expect(part).not.toContain('by grace you have been saved');
      expect(part).not.toContain('no fear in love');
    }
    // The page shows one quote per article; the email mirrors it, so the second reference stays out too.
    expect(mail.text).not.toContain('1 John 4:18');
  });

  it('carries the outline, the answers, the response and the workspace boxes, with blanks kept as lines', () => {
    expect(mail.text).toContain('Nothing left to prove');
    expect(mail.text).toContain('Grace is');
    expect(mail.text).toContain('    free & unearned');
    expect(mail.text).toContain('not earned.');
    expect(mail.text).toContain('• A gift, not a wage');
    expect(mail.text).toContain('Fear says');
    expect(mail.text).toContain('________'); // the unfilled blank in section 2
    expect(mail.text).toContain('MY RESPONSE');
    expect(mail.text).toContain('Where do you need grace this week?');
    expect(mail.text).toContain('At work, honestly.');
    expect(mail.text).toContain('YOUR NOTES');
    expect(mail.text).toContain('Key takeaways');
    expect(mail.text).toContain('Stop keeping score');
    expect(mail.text).toContain('[x] Tell one person');
    expect(mail.text).not.toContain('[x] Read Romans 8');
    expect(mail.text).toContain('Pastor note'); // the page prints note items; the email keeps parity
  });

  it('escapes the person’s words and the title in the HTML part', () => {
    expect(mail.html).toContain('Grace &lt;that&gt; Holds');
    expect(mail.html).toContain('free &amp; unearned');
    expect(mail.html).not.toContain('<that>');
    expect(mail.html).not.toMatch(/var\(--/);
  });

  it('has a fixed subject, the footer line and the app link — and no unsubscribe (his ruling)', () => {
    expect(mail.subject).toBe('Your notes — Grace <that> Holds');
    expect(mail.text).toContain('because you asked for a copy of your notes');
    expect(mail.text).toContain('https://futuresdailyword.com');
    expect(mail.text.toLowerCase()).not.toContain('unsubscribe');
    expect(mail.html.toLowerCase()).not.toContain('unsubscribe');
  });

  it('speaks the app’s four languages in its labels', () => {
    expect(m.renderNotesEmail({ sermon: SERMON, responses, lang: 'es' }).subject).toBe('Tus notas — Grace <that> Holds');
    expect(m.renderNotesEmail({ sermon: SERMON, responses, lang: 'pt' }).text).toContain('MINHA RESPOSTA');
    expect(m.renderNotesEmail({ sermon: SERMON, responses, lang: 'id' }).text).toContain('CATATAN ANDA');
    expect(m.renderNotesEmail({ sermon: SERMON, responses, lang: 'xx' }).subject).toBe('Your notes — Grace <that> Holds');
  });

  it('a sermon with nothing filled in still sends its outline', () => {
    const bare = m.renderNotesEmail({ sermon: SERMON, responses: {}, lang: 'en' });
    expect(bare.text).toContain('Nothing left to prove');
    expect(bare.text).not.toContain('YOUR NOTES');
  });
});
