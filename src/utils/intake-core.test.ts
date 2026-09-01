import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const core = require('../../netlify/functions/lib/intake-core.js');

describe('staff allowlist', () => {
  it('allows Ashley, Josh, and Ryan by name', () => {
    expect(core.isAllowlistedEmail('ae@futures.global')).toBe(true);
    expect(core.isAllowlistedEmail('josh@futures.church')).toBe(true);
    expect(core.isAllowlistedEmail('ryan.rolls@futures.church')).toBe(true);
  });

  it('allows other futures.church campus pastors without inventing names', () => {
    expect(core.isAllowlistedEmail('gwinnett@futures.church')).toBe(true);
    expect(core.fallbackStaff('gwinnett@futures.church').role).toBe('campus');
  });

  it('blocks generic inboxes from this repo', () => {
    expect(core.isAllowlistedEmail('hello@futures.church')).toBe(false);
    expect(core.isAllowlistedEmail('care@futures.church')).toBe(false);
  });

  it('does not invent extra domains or people', () => {
    expect(core.isAllowlistedEmail('someone@gmail.com')).toBe(false);
    expect(core.fallbackStaff('josh@futures.church').role).toBe('hub');
    expect(core.fallbackStaff('ae@futures.global').role).toBe('admin');
    expect(core.fallbackStaff('ae@futures.global').name).toBe('Ashley Evans');
    const named = core.NAMED_STAFF as Record<string, { role: string; name: string }>;
    const admins = Object.entries(named).filter(([, v]) => v.role === 'admin');
    expect(admins).toEqual([['ae@futures.global', { role: 'admin', name: 'Ashley Evans' }]]);
    expect(core.fallbackStaff('alexi.patsianis@futures.church').role).toBe('media');
    expect(core.fallbackStaff('jessie.ramos@futures.church').name).toBe('Jessie Ramos');
    expect(core.fallbackStaff('noah.terrell@futures.church').role).toBe('media');
  });
});

describe('campus lock', () => {
  it('pins a campus pastor to their assigned campus', () => {
    const staff = { email: 'p@futures.church', role: 'campus', campusId: 'us-gwinnett', name: '' };
    expect(core.lockCampus(staff, 'us-kennesaw')).toBe('us-gwinnett');
  });

  it('lets an unassigned campus pastor pick once', () => {
    const staff = { email: 'p@futures.church', role: 'campus', campusId: null, name: '' };
    expect(core.lockCampus(staff, 'us-gwinnett')).toBe('us-gwinnett');
  });
});

describe('question visibility', () => {
  it('hides hub sermon questions from campus pastors', () => {
    const q = { type: 'long_text', audience: 'hub', enabled: true };
    expect(core.questionVisible(q, 'campus')).toBe(false);
    expect(core.questionVisible(q, 'hub')).toBe(true);
    expect(core.questionVisibleForJob(q, 'admin', 'hub')).toBe(true);
    expect(core.questionVisible(q, 'admin')).toBe(false);
  });

  it('lets media fill the same hub sermon form, not campus', () => {
    const q = { type: 'long_text', audience: 'hub', enabled: true };
    expect(core.questionVisible(q, 'media')).toBe(true);
    expect(core.questionVisibleForJob(q, 'media', 'hub')).toBe(true);
    expect(core.questionVisibleForJob(q, 'media', 'media')).toBe(false);
    expect(core.questionVisibleForJob(q, 'campus', 'hub')).toBe(false);
    expect(core.questionVisibleForJob(q, 'admin', 'hub')).toBe(true);
  });

  it('hides campus-corner questions from hub pastors', () => {
    const q = { type: 'text', audience: 'campus', enabled: true };
    expect(core.questionVisible(q, 'hub')).toBe(false);
    expect(core.questionVisible(q, 'campus')).toBe(true);
  });

  it('lets Ashley fill one job without seeing every audience mixed together', () => {
    const hub = { type: 'date', audience: 'hub', enabled: true };
    const campus = { type: 'text', audience: 'campus', enabled: true };
    expect(core.questionVisibleForJob(hub, 'admin', 'hub')).toBe(true);
    expect(core.questionVisibleForJob(campus, 'admin', 'hub')).toBe(false);
    expect(core.questionVisibleForJob(hub, 'admin', 'campus')).toBe(false);
    expect(core.questionVisibleForJob(campus, 'admin', 'campus')).toBe(true);
  });

  it('shows media questions only to media and admin filling the media job', () => {
    const q = { type: 'text', audience: 'media', enabled: true };
    expect(core.questionVisible(q, 'media')).toBe(true);
    expect(core.questionVisible(q, 'hub')).toBe(false);
    expect(core.questionVisible(q, 'campus')).toBe(false);
    expect(core.questionVisibleForJob(q, 'admin', 'media')).toBe(true);
    expect(core.questionVisible(q, 'admin')).toBe(false);
  });

  it('never shows key-verse boxes on the pastor form', () => {
    const q = { type: 'text', audience: 'hub', enabled: true, config: { sermonKey: 'keyVerse' } };
    expect(core.questionVisibleForJob(q, 'hub', 'hub')).toBe(false);
    expect(core.questionVisibleForJob(q, 'admin', 'hub')).toBe(false);
    expect(core.isKeyVerseField(q)).toBe(true);
  });
});

describe('applyAnswers', () => {
  it('combines campus title and body into one corner item', () => {
    const questions = [
      { id: 't', type: 'text', config: { publish: 'campus_title' } },
      { id: 'b', type: 'long_text', config: { publish: 'campus_body' } },
      { id: 'r', type: 'corner_remove', config: {} },
    ];
    const plan = core.applyAnswers(questions, {
      t: 'Easter',
      b: 'Sunrise at 7am',
      r: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    }, { name: 'Pastor' });
    expect(plan.cornerAdds).toEqual([
      { type: 'announcement', title: 'Easter', content: 'Sunrise at 7am', author: 'Pastor' },
    ]);
    expect(plan.cornerRemoves).toEqual(['aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee']);
    expect(plan.sermon).toBeNull();
  });

  it('splits a campus_corner long_text: first line title, rest body', () => {
    const questions = [
      { id: 'w', type: 'long_text', config: { publish: 'campus_corner', itemType: 'announcement' } },
      { id: 'p', type: 'long_text', config: { publish: 'campus_corner', itemType: 'prayer_point' } },
    ];
    const plan = core.applyAnswers(questions, {
      w: 'Youth night Friday\nDoors 7pm. Bring a friend.',
      p: 'Pray for the Year 12s.',
    }, { name: 'Pastor' });
    expect(plan.cornerAdds).toEqual([
      { type: 'announcement', title: 'Youth night Friday', content: 'Doors 7pm. Bring a friend.', author: 'Pastor' },
      { type: 'prayer_point', title: 'Pray for the Year 12s.', content: 'Pray for the Year 12s.', author: 'Pastor' },
    ]);
  });

  it('uses one campus line as both title and body, and caps title at 80', () => {
    const long = 'A'.repeat(90);
    expect(core.splitCampusCorner(long)).toEqual({ title: 'A'.repeat(80), content: long });
    expect(core.splitCampusCorner('Just this')).toEqual({ title: 'Just this', content: 'Just this' });
    expect(core.splitCampusCorner('')).toBeNull();
  });

  it('maps pasted notes and youtube onto sermon JSON', () => {
    const questions = [
      { id: 't', type: 'text', config: { publish: 'sermon_field', sermonKey: 'title' } },
      { id: 's', type: 'text', config: { publish: 'sermon_field', sermonKey: 'speaker' } },
      { id: 'd', type: 'date', config: { publish: 'sermon_field', sermonKey: 'date' } },
      { id: 'o', type: 'long_text', config: { publish: 'sermon_field', sermonKey: 'outline' } },
      { id: 'y', type: 'text', config: { publish: 'sermon_field', sermonKey: 'youtubeUrl' } },
      { id: 'ai', type: 'yes_no', config: { publish: 'sermon_reformat' } },
    ];
    const plan = core.applyAnswers(questions, {
      t: 'Hope',
      s: 'Josh Greenwood',
      d: '2026-09-06',
      o: '1. God is near\nHe stays.\n- Trust Him',
      y: 'https://youtu.be/dQw4w9WgXcQ',
      ai: true,
    }, { name: 'Josh' });
    expect(plan.sermonPatch.outline).toContain('God is near');
    expect(plan.sermonPatch.reformat).toBe(true);
    expect(plan.sermon.youtubeUrl).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    expect(plan.youtubeOnly).toBe(false);
  });

  it('treats youtube without notes as youtube-only', () => {
    const questions = [
      { id: 'p', type: 'sermon_pick', config: { publish: 'sermon_target' } },
      { id: 'y', type: 'text', config: { publish: 'sermon_field', sermonKey: 'youtubeUrl' } },
    ];
    const plan = core.applyAnswers(questions, {
      p: 'hope-2026-09-06',
      y: 'https://youtu.be/dQw4w9WgXcQ',
    }, { name: 'Alexi' });
    expect(plan.youtubeOnly).toBe(true);
    expect(plan.sermonPatch.youtubeUrl).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    expect(core.hasNotesContent(plan.sermonPatch)).toBe(false);
  });
});

describe('staff passwords', () => {
  it('rejects short passwords and email-as-password', () => {
    expect(core.passwordIssue('short', 'josh@futures.church')).toMatch(/10/);
    expect(core.passwordIssue('josh@futures.church', 'josh@futures.church')).toMatch(/email/i);
    expect(core.passwordIssue('a-real-password', 'josh@futures.church')).toBeNull();
  });

  it('hashes with bcrypt so the same password verifies and a wrong one does not', () => {
    const stored = core.hashPassword('a-real-password');
    expect(stored.startsWith('$2')).toBe(true);
    expect(core.verifyPassword('a-real-password', stored)).toBe(true);
    expect(core.verifyPassword('wrong-password', stored)).toBe(false);
    expect(core.verifyPassword('a-real-password', 'not-a-hash')).toBe(false);
  });

  it('still verifies a legacy scrypt hash', () => {
    const crypto = require('crypto');
    const salt = 'a'.repeat(32);
    const hash = crypto.scryptSync('legacy-password', salt, 32).toString('hex');
    expect(core.verifyPassword('legacy-password', `scrypt:${salt}:${hash}`)).toBe(true);
    expect(core.verifyPassword('nope', `scrypt:${salt}:${hash}`)).toBe(false);
  });
});

describe('youtube urls', () => {
  it('accepts watch, youtu.be, shorts, and embed', () => {
    expect(core.parseYoutubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(core.parseYoutubeId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(core.parseYoutubeId('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(core.parseYoutubeId('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(core.parseYoutubeId('https://example.com/watch?v=dQw4w9WgXcQ')).toBeNull();
    expect(core.youtubeEmbedUrl('https://youtu.be/dQw4w9WgXcQ')).toContain('youtube-nocookie.com/embed/dQw4w9WgXcQ');
  });
});

describe('deterministic sermon formatter', () => {
  it('adds a write-in blank after each section and caps at 4', () => {
    const fmt = require('../../netlify/functions/lib/sermon-format.js');
    const sermon = fmt.formatSermonDeterministic({
      title: 'Hope',
      speaker: 'Ryan Rolls',
      date: '2026-09-06',
      outline: '1. God is near\nHe stays with us.\n- Trust Him\n2. God provides\n- Ask Him\n3. God sends\nGo.\n4. God stays\nRemain.\n5. Extra should drop\nNope.',
      youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    });
    expect(sermon.sections.length).toBeLessThanOrEqual(4);
    expect(sermon.sections.every((s: { content: { type: string }[] }) => s.content.some(c => c.type === 'blank'))).toBe(true);
    expect(sermon.responsePrompts.length).toBeGreaterThanOrEqual(1);
    expect(sermon.responsePrompts.length).toBeLessThanOrEqual(3);
    expect(sermon.youtubeUrl).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    expect(fmt.pointWordCount(sermon)).toBeLessThanOrEqual(400);
  });

  it('splits bullets longer than 18 words', () => {
    const fmt = require('../../netlify/functions/lib/sermon-format.js');
    const long = 'one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty';
    const sermon = fmt.tightenSermon({
      title: 'Hope',
      date: '2026-09-06',
      sections: [{ num: '1', title: 'Near', content: [{ type: 'bullet', value: long }] }],
      responsePrompts: ['What is God saying to you through this message?'],
    });
    const points = sermon.sections[0].content.filter((c: { type: string }) => c.type !== 'blank');
    expect(points.every((c: { value: string }) => c.value.split(/\s+/).length <= 18)).toBe(true);
  });

  it('pulls a verse from pasted notes and omits one if none is there', () => {
    const fmt = require('../../netlify/functions/lib/sermon-format.js');
    expect(fmt.extractKeyVerseFromNotes('Key verse: John 21:15-19\nLove asks again.')).toEqual({
      keyVerse: 'John 21:15-19',
      keyVerseText: '',
    });
    const withVerse = fmt.formatSermonDeterministic({
      title: 'Love Asks Again',
      date: '2026-08-31',
      outline: 'John 21:15-19\n1. Love asks again\nFeed my sheep.',
    });
    expect(withVerse.keyVerse).toBe('John 21:15-19');
    const none = fmt.formatSermonDeterministic({
      title: 'Hope',
      date: '2026-09-06',
      outline: '1. God is near\nHe stays.',
      keyVerse: '',
    }, { keyVerse: 'Romans 8:28', keyVerseText: 'old' });
    expect(none.keyVerse).toBe('');
    expect(none.keyVerseText).toBe('');
  });
});
