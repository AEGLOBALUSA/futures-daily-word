import { describe, it, expect } from 'vitest';
import { buildAnswers, outlineNotes, publishJobFor, type IntakeQuestion, type PreachOutline, type StaffLike } from './preachPublish';

// A fixture covering the real intake_questions shapes for both jobs at once —
// buildAnswers must pick only what's relevant to the resolved job.
const QUESTIONS: IntakeQuestion[] = [
  { id: 'q_date', label: 'Date', type: 'date', audience: 'hub', required: true, enabled: true, config: { publish: 'sermon_field', sermonKey: 'date' } },
  { id: 'q_title', label: 'Title', type: 'text', audience: 'hub', required: true, enabled: true, config: { publish: 'sermon_field', sermonKey: 'title' } },
  { id: 'q_speaker', label: 'Speaker', type: 'text', audience: 'hub', required: false, enabled: true, config: { publish: 'sermon_field', sermonKey: 'speaker' } },
  { id: 'q_series', label: 'Series', type: 'text', audience: 'hub', required: false, enabled: true, config: { publish: 'sermon_field', sermonKey: 'series' } },
  { id: 'q_youtube', label: 'YouTube link', type: 'text', audience: 'hub', required: false, enabled: true, config: { publish: 'sermon_field', sermonKey: 'youtubeUrl' } },
  { id: 'q_outline', label: 'Notes', type: 'long_text', audience: 'hub', required: true, enabled: true, config: { publish: 'sermon_field', sermonKey: 'outline' } },
  { id: 'q_have', label: 'Do you have your notes?', type: 'yes_no', audience: 'hub', required: false, enabled: true, config: { flow: 'notes_have' } },
  { id: 'q_ai', label: 'Format with AI?', type: 'yes_no', audience: 'hub', required: false, enabled: true, config: { flow: 'notes_ai' } },
  { id: 'q_campus', label: 'Which campus?', type: 'campus', audience: 'campus', required: true, enabled: true, config: {} },
  { id: 'q_corner', label: 'Campus corner post', type: 'long_text', audience: 'campus', required: true, enabled: true, config: { publish: 'campus_corner', itemType: 'announcement' } },
];

const OUTLINE: PreachOutline = {
  title: 'Living Water',
  passage: 'John 4:1-26',
  series: 'Thirsty',
  date: '2026-09-13',
  speaker: 'Ashley Evans',
  bigIdea: 'Jesus offers what nothing else can satisfy.',
  points: [
    { heading: 'We all thirst', body: 'Everyone is chasing something to fill the gap.' },
    { heading: 'Jesus names it', body: 'He goes straight to her real need.' },
  ],
  weeklyAction: 'Name one thing you have been drinking from instead of Him.',
  updatedAt: 1_757_000_000_000,
};

const ADMIN: StaffLike = { email: 'ae@futures.global', role: 'admin', campusId: null, name: 'Ashley Evans' };
const HUB: StaffLike = { email: 'josh@futures.church', role: 'hub', campusId: null, name: 'Josh Greenwood' };
const CAMPUS: StaffLike = { email: 'pastor@futures.church', role: 'campus', campusId: 'us-alpharetta', name: 'Campus Pastor' };

describe('publishJobFor', () => {
  it('routes admin, hub and media to hub; campus to campus; everything else to null', () => {
    expect(publishJobFor(ADMIN)).toBe('hub');
    expect(publishJobFor(HUB)).toBe('hub');
    expect(publishJobFor({ ...HUB, role: 'media' })).toBe('hub');
    expect(publishJobFor(CAMPUS)).toBe('campus');
    expect(publishJobFor({ ...CAMPUS, role: 'volunteer' })).toBe(null);
    expect(publishJobFor(null)).toBe(null);
  });
});

describe('outlineNotes', () => {
  it('joins bigIdea, each point as Heading\\nbody, then weeklyAction with blank lines', () => {
    expect(outlineNotes(OUTLINE)).toBe(
      'Jesus offers what nothing else can satisfy.\n\n'
      + 'We all thirst\nEveryone is chasing something to fill the gap.\n\n'
      + 'Jesus names it\nHe goes straight to her real need.\n\n'
      + 'Name one thing you have been drinking from instead of Him.',
    );
  });

  it('drops empty sections and never leaves stray blank-line joins', () => {
    const sparse: PreachOutline = { ...OUTLINE, bigIdea: '', points: [{ heading: '', body: '' }, { heading: 'Only heading', body: '' }], weeklyAction: '' };
    expect(outlineNotes(sparse)).toBe('Only heading\n');
  });
});

describe('buildAnswers', () => {
  for (const [label, staff] of [['an admin', ADMIN], ['a hub user', HUB]] as const) {
    it(`fills the hub sermon fields for ${label}`, () => {
      const built = buildAnswers(QUESTIONS, OUTLINE, staff, { useAI: false });
      expect(built.job).toBe('hub');
      expect(built.campusId).toBe(null);
      expect(built.answers.q_date).toBe('2026-09-13');
      expect(built.answers.q_title).toBe('Living Water');
      expect(built.answers.q_speaker).toBe('Ashley Evans');
      expect(built.answers.q_series).toBe('Thirsty');
      expect(built.answers.q_youtube).toBe('');
      expect(built.answers.q_outline).toBe(outlineNotes(OUTLINE));
      expect(built.answers.q_have).toBe(true);
      expect(built.answers.q_ai).toBe(false);
      // Campus-only questions never leak into a hub answer set or its missing list.
      expect(built.answers.q_campus).toBeUndefined();
      expect(built.answers.q_corner).toBeUndefined();
      expect(built.missing).toEqual([]);
    });
  }

  it('carries the youtubeUrl opt into the youtubeUrl sermon field', () => {
    const built = buildAnswers(QUESTIONS, OUTLINE, HUB, { useAI: true, youtubeUrl: 'https://youtu.be/abcdefghijk' });
    expect(built.answers.q_youtube).toBe('https://youtu.be/abcdefghijk');
    expect(built.answers.q_ai).toBe(true);
  });

  it('posts the outline to the campus corner announcement for a campus pastor', () => {
    const built = buildAnswers(QUESTIONS, OUTLINE, CAMPUS, { useAI: false });
    expect(built.job).toBe('campus');
    expect(built.campusId).toBe('us-alpharetta');
    expect(built.answers.q_campus).toBe('us-alpharetta');
    expect(built.answers.q_corner).toBe(`Living Water\n\n${outlineNotes(OUTLINE)}`);
    // Hub-only questions never leak into a campus answer set or its missing list.
    expect(built.answers.q_date).toBeUndefined();
    expect(built.answers.q_outline).toBeUndefined();
    expect(built.missing).toEqual([]);
  });

  it('lists missing[] when the outline has no title or date', () => {
    const bare: PreachOutline = { ...OUTLINE, title: '', date: '' };
    const built = buildAnswers(QUESTIONS, bare, HUB, { useAI: false });
    expect(built.missing).toContain('Title');
    expect(built.missing).toContain('Date');
    expect(built.answers.q_title).toBe('');
    expect(built.answers.q_date).toBe('');
  });

  it('flags a required campus pick as missing when the pastor has none on file', () => {
    const built = buildAnswers(QUESTIONS, OUTLINE, { ...CAMPUS, campusId: null }, { useAI: false });
    expect(built.campusId).toBe(null);
    expect(built.missing).toContain('Which campus?');
  });

  it('returns nulls and no answers for a role that cannot publish', () => {
    const built = buildAnswers(QUESTIONS, OUTLINE, { email: 'x@futures.church', role: 'volunteer' }, { useAI: false });
    expect(built.job).toBe(null);
    expect(built.campusId).toBe(null);
    expect(built.answers).toEqual({});
    expect(built.missing).toEqual([]);
  });
});
