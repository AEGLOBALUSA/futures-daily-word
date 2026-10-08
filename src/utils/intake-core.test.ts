import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const core = require('../../netlify/functions/lib/intake-core.js');

describe('staff allowlist', () => {
  // Readiness 7 Oct 2026: the roster row is the allow-list. Any real address
  // may be added by an admin; without a row nobody is staff (staffFromRoster).
  it('names jane0202@me.com as hub by default; any real address could be added', () => {
    expect(core.isAllowlistedEmail('jane0202@me.com')).toBe(true);
    expect(core.fallbackStaff('jane0202@me.com').role).toBe('hub');
    expect(core.isAllowlistedEmail('someone@me.com')).toBe(true);
    expect(core.staffFromRoster('someone@me.com', null)).toBeNull();
  });

  it('allows alexis@futuros.global by name as hub, and no other @futuros.global address', () => {
    expect(core.isAllowlistedEmail('alexis@futuros.global')).toBe(true);
    expect(core.isAllowlistedEmail(' Alexis@Futuros.Global ')).toBe(true);
    expect(core.fallbackStaff('alexis@futuros.global').role).toBe('hub');
    expect(core.isAllowlistedEmail('random@futuros.global')).toBe(true);
    expect(core.staffFromRoster('random@futuros.global', null)).toBeNull();
    expect(core.isAllowlistedEmail('not an email')).toBe(false);
    expect(core.isAllowlistedEmail('a@b')).toBe(false);
  });

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
    expect(core.staffFromRoster('someone@gmail.com', null)).toBeNull();
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

describe('staffFromRoster: the roster decides, not the address shape', () => {
  it('turns a roster row into a staff record with role, campus and who set it', () => {
    const s = core.staffFromRoster('Gwinnett@futures.church', {
      role: 'campus', campus_id: 'us-gwinnett', campus_set_by: 'admin', display_name: 'Gwinnett Pastor',
    });
    expect(s).toEqual({
      email: 'gwinnett@futures.church', role: 'campus', campusId: 'us-gwinnett',
      campusSetBy: 'admin', name: 'Gwinnett Pastor',
    });
  });

  it('does not treat a named person with no roster row as staff either', () => {
    expect(core.staffFromRoster('josh@futures.church', null)).toBeNull();
    expect(core.staffFromRoster('alexi.patsianis@futures.church', null)).toBeNull();
    expect(core.staffFromRoster('ae@futures.global', null)).toBeNull();
  });

  it('gives a named person their default name when their row has none', () => {
    expect(core.staffFromRoster('alexi.patsianis@futures.church', { role: 'media', display_name: '' }).name).toBe('Alexi Patsianis');
  });

  it('does not treat a made-up futures.church address as staff', () => {
    expect(core.staffFromRoster('nobody123@futures.church', null)).toBeNull();
    // the old shape-only fallback is unchanged, and no longer used to sign anyone in
    expect(core.fallbackStaff('nobody123@futures.church').role).toBe('campus');
  });

  it('refuses generic inboxes even with a row; any other address with a row is staff', () => {
    expect(core.staffFromRoster('hello@futures.church', { role: 'campus' })).toBeNull();
    expect(core.staffFromRoster('care@futures.church', { role: 'campus' })).toBeNull();
    expect(core.staffFromRoster('someone@gmail.com', { role: 'campus' }).role).toBe('campus');
  });

  it('always makes ae@futures.global the admin once his row exists', () => {
    expect(core.staffFromRoster('ae@futures.global', { role: 'admin' }).role).toBe('admin');
    expect(core.staffFromRoster('ae@futures.global', { role: 'campus' }).role).toBe('admin');
  });

  it('keeps an admin row admin (the owner grants it); an unknown role reads as campus', () => {
    expect(core.staffFromRoster('gwinnett@futures.church', { role: 'admin' }).role).toBe('admin');
    expect(core.staffFromRoster('josh@futures.church', { role: 'admin' }).role).toBe('admin');
    expect(core.staffFromRoster('josh@futures.church', { role: 'owner' }).role).toBe('campus');
  });
});

describe('rosterChangeRefusal: inside People, every admin row is the owner\'s', () => {
  const owner = { email: 'ae@futures.global', role: 'admin' };
  const mark = { email: 'mark@futures.church', role: 'admin' };
  const hub = { email: 'josh@futures.church', role: 'hub' };
  it('refuses anyone who is not an admin', () => {
    expect(core.rosterChangeRefusal(hub, { email: 'x@futures.church', role: null }, 'campus', 'save')).toBeTruthy();
  });
  it('lets a second admin add and change non-admins', () => {
    expect(core.rosterChangeRefusal(mark, { email: 'x@futures.church', role: null }, 'campus', 'save')).toBeNull();
    expect(core.rosterChangeRefusal(mark, hub, 'media', 'save')).toBeNull();
    expect(core.rosterChangeRefusal(mark, hub, null, 'reset')).toBeNull();
  });
  it('stops a second admin promoting, or touching another admin or the owner', () => {
    expect(core.rosterChangeRefusal(mark, hub, 'admin', 'save')).toBeTruthy();
    expect(core.rosterChangeRefusal(mark, { email: 'j@futures.church', role: 'admin' }, null, 'delete')).toBeTruthy();
    expect(core.rosterChangeRefusal(mark, owner, null, 'reset')).toBeTruthy();
    expect(core.rosterChangeRefusal(mark, owner, 'admin', 'save')).toBeTruthy();
  });
  it('lets the owner do all of it except demote or remove himself', () => {
    expect(core.rosterChangeRefusal(owner, hub, 'admin', 'save')).toBeNull();
    expect(core.rosterChangeRefusal(owner, mark, null, 'delete')).toBeNull();
    expect(core.rosterChangeRefusal(owner, owner, 'hub', 'save')).toBeTruthy();
    expect(core.rosterChangeRefusal(owner, owner, null, 'delete')).toBeTruthy();
    expect(core.rosterChangeRefusal(owner, owner, 'admin', 'save')).toBeNull();
  });
});

describe('campusConfirmed', () => {
  it('needs no campus for hub, media and admin', () => {
    expect(core.campusConfirmed({ role: 'hub' })).toBe(true);
    expect(core.campusConfirmed({ role: 'media' })).toBe(true);
    expect(core.campusConfirmed({ role: 'admin' })).toBe(true);
  });

  it('counts a campus Ashley set, and a legacy campus with no marker', () => {
    expect(core.campusConfirmed({ role: 'campus', campusId: 'us-gwinnett', campusSetBy: 'admin' })).toBe(true);
    expect(core.campusConfirmed({ role: 'campus', campusId: 'us-gwinnett', campusSetBy: null })).toBe(true);
  });

  it('does not count a campus the pastor picked, or no campus at all', () => {
    expect(core.campusConfirmed({ role: 'campus', campusId: 'us-gwinnett', campusSetBy: 'self' })).toBe(false);
    expect(core.campusConfirmed({ role: 'campus', campusId: null, campusSetBy: null })).toBe(false);
  });

  it('is shown to the app as campusPending', () => {
    expect(core.publicStaff({ email: 'a@futures.church', role: 'campus', campusId: 'us-gwinnett', campusSetBy: 'self' }).campusPending).toBe(true);
    expect(core.publicStaff({ email: 'josh@futures.church', role: 'hub' }).campusPending).toBe(false);
  });
});

describe('publicStaff names the campus from the one list (B08-06)', () => {
  // Fixture campuses only: the names come from whatever list is passed in.
  const list = [
    { id: 'zz-test-north', name: 'Test North', congregation: 'futures-au', pcoNames: [], sortOrder: 10, active: true },
    { id: 'zz-test-south', name: 'Test South', congregation: null, pcoNames: [], sortOrder: 20, active: true },
    { id: 'zz-test-hidden', name: 'Test Hidden', congregation: 'futuros-us', pcoNames: [], sortOrder: 30, active: false }
  ];
  const pastor = (campusId: string | null) => ({ email: 'pastor@example.org', role: 'campus', campusId, campusSetBy: 'admin', name: 'Test Pastor' });

  it('gives the campus name and congregation from the list', () => {
    const s = core.publicStaff(pastor('zz-test-north'), list);
    expect(s.campusId).toBe('zz-test-north');
    expect(s.campusName).toBe('Test North');
    expect(s.congregation).toBe('futures-au');
  });

  it('answers null for a campus with no congregation', () => {
    const s = core.publicStaff(pastor('zz-test-south'), list);
    expect(s.campusName).toBe('Test South');
    expect(s.congregation).toBeNull();
  });

  it('falls back to the id for a campus that is not on the list', () => {
    const s = core.publicStaff(pastor('zz-test-gone'), list);
    expect(s.campusName).toBe('zz-test-gone');
    expect(s.congregation).toBeNull();
  });

  it('still names a hidden campus', () => {
    const s = core.publicStaff(pastor('zz-test-hidden'), list);
    expect(s.campusName).toBe('Test Hidden');
    expect(s.congregation).toBe('futuros-us');
  });

  it('answers null for both with no campus, and always carries both keys', () => {
    const s = core.publicStaff({ email: 'hub@example.org', role: 'hub', name: 'Test Hub' }, list);
    expect(s).toHaveProperty('campusName', null);
    expect(s).toHaveProperty('congregation', null);
  });

  it('keeps every field it had before', () => {
    const s = core.publicStaff(pastor('zz-test-north'), list);
    expect(Object.keys(s).sort()).toEqual(
      ['campusId', 'campusName', 'campusPending', 'congregation', 'email', 'isAdmin', 'name', 'role']
    );
    expect(s).toMatchObject({ email: 'pastor@example.org', role: 'campus', name: 'Test Pastor', isAdmin: false, campusPending: false });
  });

  it('uses the bundled list when no list is passed', () => {
    const s = core.publicStaff(pastor('zz-test-north'));
    expect(s.campusName).toBe('zz-test-north');
    expect(s.congregation).toBeNull();
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

describe('setup codes', () => {
  it('are 10 unambiguous characters in two groups, and differ each time', () => {
    const a = core.generateSetupCode();
    expect(a).toMatch(/^[ABCDEFGHJKMNPQRSTUVWXYZ2-9]{5}-[ABCDEFGHJKMNPQRSTUVWXYZ2-9]{5}$/);
    expect(core.generateSetupCode()).not.toBe(a);
  });

  it('verify however the person types them, and not otherwise', () => {
    const code = core.generateSetupCode();
    const stored = core.hashSetupCode(code);
    expect(stored).not.toContain(core.normalizeSetupCode(code));
    expect(core.verifySetupCode(code, stored)).toBe(true);
    expect(core.verifySetupCode(code.toLowerCase().replace('-', ' '), stored)).toBe(true);
    expect(core.verifySetupCode('AAAAA-AAAAA', stored)).toBe(false);
    expect(core.verifySetupCode('', stored)).toBe(false);
    expect(core.verifySetupCode(code, null)).toBe(false);
  });
});

describe('usualJobFrom: Staff home learns the usual job from the person\'s own submissions', () => {
  const qs = [
    { id: 'q_hub', audience: 'hub' }, { id: 'q_hub2', audience: 'hub' },
    { id: 'q_media', audience: 'media' }, { id: 'q_campus', audience: 'campus' }, { id: 'q_all', audience: 'all' },
  ];
  // Thursday 8 Oct 2026, 15:00Z.
  const now = new Date('2026-10-08T15:00:00Z');
  const sub = (iso: string, keys: string[], role = 'hub') => ({ created_at: iso, role, answers: Object.fromEntries(keys.map(k => [k, 'x'])) });

  it('picks the job done most on this weekday', () => {
    const subs = [
      sub('2026-10-06T10:00:00Z', ['q_media']),            // Tuesday
      sub('2026-10-01T10:00:00Z', ['q_hub', 'q_all']),     // Thursday
      sub('2026-09-24T10:00:00Z', ['q_hub', 'q_hub2']),    // Thursday
      sub('2026-09-17T10:00:00Z', ['q_media']),            // Thursday
    ];
    expect(core.usualJobFrom(subs, qs, now, ['hub', 'media', 'campus'])).toEqual({ job: 'hub', why: 'weekday', weekday: 'Thursday' });
  });

  it('falls back to the job done last when nothing was done on this weekday', () => {
    const subs = [sub('2026-10-06T10:00:00Z', ['q_media']), sub('2026-10-05T10:00:00Z', ['q_hub'])];
    expect(core.usualJobFrom(subs, qs, now, ['hub', 'media'])).toEqual({ job: 'media', why: 'last', weekday: 'Thursday' });
  });

  it('ignores submissions older than eight weeks, in the future, or for jobs the person cannot open', () => {
    expect(core.usualJobFrom([sub('2026-08-01T10:00:00Z', ['q_hub'])], qs, now)).toBeNull();
    expect(core.usualJobFrom([sub('2026-10-09T10:00:00Z', ['q_hub'])], qs, now)).toBeNull();
    expect(core.usualJobFrom([sub('2026-10-01T10:00:00Z', ['q_hub'])], qs, now, ['campus'])).toBeNull();
  });

  it('uses the role a submission was sent under when its questions say nothing', () => {
    expect(core.usualJobFrom([sub('2026-10-01T10:00:00Z', ['q_all'], 'campus')], qs, now, ['campus'])).toMatchObject({ job: 'campus' });
    expect(core.usualJobFrom([sub('2026-10-01T10:00:00Z', [], 'admin')], qs, now)).toBeNull();
  });

  it('counts the weekday on the church clock, not UTC', () => {
    // Wednesday 1 Oct 2026, 22:00 in New York = Thursday 02:00Z.
    const wedNight = [sub('2026-10-01T02:00:00Z', ['q_media'])];
    const thursNightNY = new Date('2026-10-09T01:00:00Z'); // Thursday 21:00 New York
    expect(core.usualJobFrom(wedNight, qs, thursNightNY, ['hub', 'media'], 'America/New_York')).toMatchObject({ why: 'last', weekday: 'Thursday' });
    expect(core.usualJobFrom(wedNight, qs, new Date('2026-10-08T01:00:00Z'), ['hub', 'media'], 'America/New_York')).toMatchObject({ job: 'media', why: 'weekday', weekday: 'Wednesday' });
  });

  it('a tie between audiences goes to the one the person can open', () => {
    expect(core.usualJobFrom([sub('2026-10-01T10:00:00Z', ['q_media', 'q_hub'])], qs, now, ['hub'])).toMatchObject({ job: 'hub' });
  });

  it('jobsForRole matches the Staff home split', () => {
    expect(core.jobsForRole('admin')).toEqual(['hub', 'media', 'campus']);
    expect(core.jobsForRole('media')).toEqual(['hub', 'media']);
    expect(core.jobsForRole('hub')).toEqual(['hub']);
    expect(core.jobsForRole('campus')).toEqual(['campus']);
    expect(core.jobsForRole('nobody')).toEqual([]);
  });
});
