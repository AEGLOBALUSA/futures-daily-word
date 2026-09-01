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
    const q = { type: 'sermon_notes', audience: 'hub', enabled: true };
    expect(core.questionVisible(q, 'campus')).toBe(false);
    expect(core.questionVisible(q, 'hub')).toBe(true);
    expect(core.questionVisible(q, 'admin')).toBe(true);
  });

  it('hides campus-corner questions from hub pastors', () => {
    const q = { type: 'corner_add', audience: 'campus', enabled: true };
    expect(core.questionVisible(q, 'hub')).toBe(false);
    expect(core.questionVisible(q, 'campus')).toBe(true);
  });
});

describe('applyAnswers', () => {
  it('turns corner add/remove into publish actions', () => {
    const questions = [
      { id: 'a', type: 'corner_add', config: {} },
      { id: 'r', type: 'corner_remove', config: {} },
    ];
    const answers = {
      a: [{ type: 'announcement', title: 'Easter', content: 'Sunrise at 7am' }],
      r: ['aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'],
    };
    const plan = core.applyAnswers(questions, answers, { name: 'Pastor' });
    expect(plan.cornerAdds).toEqual([
      { type: 'announcement', title: 'Easter', content: 'Sunrise at 7am', author: 'Pastor' },
    ]);
    expect(plan.cornerRemoves).toEqual(['aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee']);
    expect(plan.sermon).toBeNull();
  });

  it('builds sermon notes for Sermon Notes, not the journal', () => {
    const questions = [{ id: 's', type: 'sermon_notes', config: {} }];
    const answers = {
      s: {
        title: 'Hope',
        speaker: 'Josh Greenwood',
        date: '2026-09-06',
        outline: '1. God is near\nHe stays.\n- Trust Him',
      },
    };
    const plan = core.applyAnswers(questions, answers, { name: 'Josh' });
    expect(plan.sermon.id).toBe('hope-2026-09-06');
    expect(plan.sermon.speaker).toBe('Josh Greenwood');
    expect(plan.sermon.sections[0].title).toBe('God is near');
    expect(plan.sermon.sections[0].content.some((c: { type: string }) => c.type === 'blank')).toBe(true);
  });
});

describe('staff passwords', () => {
  it('rejects short passwords and email-as-password', () => {
    expect(core.passwordIssue('short', 'josh@futures.church')).toMatch(/10/);
    expect(core.passwordIssue('josh@futures.church', 'josh@futures.church')).toMatch(/email/i);
    expect(core.passwordIssue('a-real-password', 'josh@futures.church')).toBeNull();
  });

  it('hashes so the same password verifies and a wrong one does not', () => {
    const stored = core.hashPassword('a-real-password');
    expect(stored.startsWith('scrypt:')).toBe(true);
    expect(core.verifyPassword('a-real-password', stored)).toBe(true);
    expect(core.verifyPassword('wrong-password', stored)).toBe(false);
    expect(core.verifyPassword('a-real-password', 'not-a-hash')).toBe(false);
  });
});
