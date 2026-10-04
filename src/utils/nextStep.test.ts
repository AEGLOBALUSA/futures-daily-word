/**
 * Home's one next step (B09-08 steps 2 and 3): every branch of the order, the
 * comfort guard, the Sunday demotion, and the device-only skip learning.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  nextStep, isQuiet, noteShown, noteQuiet, noteTapped, readSkips, quietKeyFor, fillParams,
  COMFORT_FORBIDDEN_KEY, NEXT_SKIPS_KEY, type NextStepState, type NextSkips,
} from './nextStep';

const TODAY = '2026-10-06';

function state(over: Partial<NextStepState> = {}): NextStepState {
  return {
    persona: 'congregation',
    isNewPath: false,
    journeyDay: null,
    journeyDayDone: false,
    passage: 'Luke 5',
    readDoneToday: false,
    reflectedToday: false,
    sundayWindow: false,
    sermonNotesPublished: null,
    planSetUp: true,
    setupAsks: [],
    tomorrow: 'Luke 6',
    campusName: 'Futures Kennesaw',
    today: TODAY,
    skips: {},
    ...over,
  };
}

const newPath = (over: Partial<NextStepState> = {}) =>
  state({ persona: 'new_to_faith', isNewPath: true, journeyDay: 6, passage: 'John 3', ...over });

describe('nextStep: the order', () => {
  it('1. comfort: the auto-served passage, no streak or celebration words', () => {
    const s = nextStep(state({ persona: 'comfort', passage: 'Psalm 23' }));
    expect(s).toMatchObject({ kind: 'comfort', step: 1, labelKey: 'next_read_passage', params: { passage: 'Psalm 23' }, action: 'open_passage' });
  });

  it('2. I\'m New on a Sunday morning with notes published: Open today\'s sermon notes, with the campus why-line', () => {
    const s = nextStep(newPath({ sundayWindow: true, sermonNotesPublished: true, campusName: 'Futures Paradise' }));
    expect(s).toMatchObject({ kind: 'sunday_new', step: 2, labelKey: 'next_sermon_notes', action: 'open_notes', whyKey: 'next_why_sunday', whyParams: { campus: 'Futures Paradise' } });
  });

  it('2. while the feed is still unknown the notes keep their place; a definite "none" gives way to the day', () => {
    expect(nextStep(newPath({ sundayWindow: true, sermonNotesPublished: null })).kind).toBe('sunday_new');
    expect(nextStep(newPath({ sundayWindow: true, sermonNotesPublished: false })).kind).toBe('journey_day');
  });

  it('2. with no campus chosen there is no why-line rather than a blank one', () => {
    const s = nextStep(newPath({ sundayWindow: true, campusName: null }));
    expect(s.whyKey).toBeUndefined();
  });

  it('3. I\'m New, today\'s journey day not done: Read Day {n}', () => {
    const s = nextStep(newPath());
    expect(s).toMatchObject({ kind: 'journey_day', step: 3, labelKey: 'next_read_day', params: { n: '6' }, action: 'open_journey' });
  });

  it('3. I\'m New with the journey as the photo hero: the hero\'s Read is the step, the card says so in words, no second button', () => {
    const s = nextStep(newPath({ journeyInHero: true }));
    expect(s).toMatchObject({ kind: 'journey_day', step: 3, labelKey: 'next_journey_ready', params: { n: '6' }, action: 'none' });
  });

  it('7. I\'m New with the journey as the hero: no Write it down on Home (the lesson holds its own Reflect & Respond)', () => {
    const s = nextStep(newPath({ journeyInHero: true, journeyDayDone: true, tomorrow: 'John 4' }));
    expect(s.kind).not.toBe('write');
    expect(s.kind).toBe('done');
  });

  it('4. pastor or study path with nothing set up: the set-up wizard', () => {
    for (const persona of ['pastor_leader', 'deeper_study']) {
      expect(nextStep(state({ persona, planSetUp: false }))).toMatchObject({ kind: 'plan_setup', step: 4, labelKey: 'next_set_up_plan', action: 'open_wizard' });
    }
  });

  it('4. any returning path with no reading at all: Choose your plan', () => {
    expect(nextStep(state({ passage: null }))).toMatchObject({ kind: 'plan_setup', step: 4, labelKey: 'next_choose_plan', action: 'open_plans' });
  });

  it('5. today\'s reading not marked: Read {passage}', () => {
    expect(nextStep(state())).toMatchObject({ kind: 'read', step: 5, labelKey: 'next_read_passage', params: { passage: 'Luke 5' }, action: 'open_passage' });
  });

  it('5. a returning path on Sunday before reading gets the reading first (kind 5, not 6)', () => {
    const s = nextStep(state({ sundayWindow: true, sermonNotesPublished: true }));
    expect(s.step).toBe(5);
    expect(s.kind).toBe('read');
  });

  it('5. never carries a Mark as read: the button opens the passage, whose end keeps the one Mark as read', () => {
    const s = nextStep(state());
    expect(s.action).toBe('open_passage');
    expect(s.labelKey).not.toMatch(/mark/i);
  });

  it('5. the passage already open (returning paths arrive with it open): the words point at the one Mark as read, no button', () => {
    const s = nextStep(state({ passageOpen: true }));
    expect(s).toMatchObject({ kind: 'reading', step: 5, labelKey: 'next_finish_passage', params: { passage: 'Luke 5' }, action: 'none' });
    expect(nextStep(state({ persona: 'comfort', passage: 'Psalm 23', passageOpen: true }))).toMatchObject({ kind: 'comfort', action: 'none', labelKey: 'next_finish_passage' });
    // once read, the open passage changes nothing: Write it down follows
    expect(nextStep(state({ passageOpen: true, readDoneToday: true })).kind).toBe('write');
  });

  it('6. returning path, Sunday window, reading done: Open today\'s sermon notes', () => {
    const s = nextStep(state({ readDoneToday: true, sundayWindow: true, sermonNotesPublished: true }));
    expect(s).toMatchObject({ kind: 'sunday_notes', step: 6, labelKey: 'next_sermon_notes', action: 'open_notes', whyKey: 'next_why_sunday' });
  });

  it('7. read, not reflected: Write it down, with the question as its why-line', () => {
    const s = nextStep(state({ readDoneToday: true }));
    expect(s).toMatchObject({ kind: 'write', step: 7, labelKey: 'next_write_it_down', action: 'write', whyKey: 'next_write_prompt', whyParams: { passage: 'Luke 5' } });
  });

  it('7. I\'m New: finishing the journey day counts as today\'s reading', () => {
    expect(nextStep(newPath({ journeyDayDone: true })).kind).toBe('write');
  });

  it('8. one set-up ask after the reading, in the order install, email, upgrade', () => {
    const base = { readDoneToday: true, reflectedToday: true };
    expect(nextStep(state({ ...base, setupAsks: ['upgrade', 'email', 'install'] }))).toMatchObject({ kind: 'setup_ask', step: 8, action: 'install', labelKey: 'next_setup_install' });
    expect(nextStep(state({ ...base, setupAsks: ['upgrade', 'email'] })).action).toBe('email');
    expect(nextStep(state({ ...base, setupAsks: ['upgrade'] })).action).toBe('upgrade');
  });

  it('8. never before the reading', () => {
    expect(nextStep(state({ setupAsks: ['install'] })).kind).toBe('read');
  });

  it('9. nothing left: Tomorrow: {passage}, no button', () => {
    const s = nextStep(state({ readDoneToday: true, reflectedToday: true }));
    expect(s).toMatchObject({ kind: 'done', step: 9, labelKey: 'next_tomorrow', params: { passage: 'Luke 6' }, action: 'none' });
  });

  it('9. when tomorrow cannot be known it still says the day is done', () => {
    expect(nextStep(state({ readDoneToday: true, reflectedToday: true, tomorrow: null }))).toMatchObject({ kind: 'done', labelKey: 'next_done_today', action: 'none' });
  });

  it('comfort never returns a streak, celebration or count key, in any state', () => {
    const variants: Partial<NextStepState>[] = [
      {}, { readDoneToday: true }, { readDoneToday: true, reflectedToday: true },
      { readDoneToday: true, sundayWindow: true }, { readDoneToday: true, reflectedToday: true, setupAsks: ['install', 'email', 'upgrade'] },
      { passage: null },
    ];
    for (const v of variants) {
      const s = nextStep(state({ persona: 'comfort', passage: 'Psalm 23', ...v }));
      expect(s.labelKey).not.toMatch(COMFORT_FORBIDDEN_KEY);
      expect(s.whyKey || '').not.toMatch(COMFORT_FORBIDDEN_KEY);
    }
  });

  it('is pure: the same state gives the same step', () => {
    const s = state({ readDoneToday: true });
    expect(nextStep(s)).toEqual(nextStep(s));
  });
});

describe('skip learning (dw_next_skips)', () => {
  beforeEach(() => { localStorage.clear(); vi.restoreAllMocks(); });

  it('three untapped days of Write it down: day 4 is done', () => {
    let skips: NextSkips = {};
    skips = noteShown('write', '2026-10-01', skips);
    skips = noteShown('write', '2026-10-02', skips);
    skips = noteShown('write', '2026-10-03', skips);
    const day4 = nextStep(state({ readDoneToday: true, today: '2026-10-04', skips }));
    expect(day4.kind).toBe('done');
  });

  it('rests for seven days, then is offered again', () => {
    let skips: NextSkips = {};
    for (const d of ['2026-10-01', '2026-10-02', '2026-10-03']) skips = noteShown('write', d, skips);
    skips = noteQuiet('write', '2026-10-04', skips);
    expect(skips.write?.quietUntil).toBe('2026-10-11');
    expect(isQuiet(skips, 'write', '2026-10-10')).toBe(true);
    expect(isQuiet(skips, 'write', '2026-10-11')).toBe(false);
    skips = noteShown('write', '2026-10-11', skips);
    expect(skips.write?.quietUntil).toBeUndefined();
    expect(skips.write?.shownDays).toEqual(['2026-10-11']);
  });

  it('a tap resets the count', () => {
    let skips: NextSkips = {};
    skips = noteShown('write', '2026-10-01', skips);
    skips = noteShown('write', '2026-10-02', skips);
    skips = noteTapped('write', '2026-10-02', skips);
    skips = noteShown('write', '2026-10-03', skips);
    expect(isQuiet(skips, 'write', '2026-10-04')).toBe(false);
    expect(nextStep(state({ readDoneToday: true, today: '2026-10-04', skips })).kind).toBe('write');
  });

  it('a gap breaks the run: shown, missed a day, shown twice is not three running', () => {
    let skips: NextSkips = {};
    for (const d of ['2026-10-01', '2026-10-03', '2026-10-04']) skips = noteShown('write', d, skips);
    expect(isQuiet(skips, 'write', '2026-10-05')).toBe(false);
  });

  it('showing twice in one day counts once', () => {
    let skips: NextSkips = {};
    skips = noteShown('write', TODAY, skips);
    skips = noteShown('write', TODAY, skips);
    expect(skips.write?.shownDays).toEqual([TODAY]);
  });

  it('a quietened set-up ask gives way to the next one', () => {
    let skips: NextSkips = {};
    for (const d of ['2026-10-03', '2026-10-04', '2026-10-05']) skips = noteShown('install', d, skips);
    const s = nextStep(state({ readDoneToday: true, reflectedToday: true, setupAsks: ['install', 'email'], skips }));
    expect(s.action).toBe('email');
  });

  it('kinds 1 to 6 never rest', () => {
    expect(quietKeyFor({ kind: 'read', action: 'open_passage' })).toBeNull();
    expect(quietKeyFor({ kind: 'sunday_notes', action: 'open_notes' })).toBeNull();
    expect(quietKeyFor({ kind: 'journey_day', action: 'open_journey' })).toBeNull();
    expect(quietKeyFor({ kind: 'comfort', action: 'open_passage' })).toBeNull();
    expect(quietKeyFor({ kind: 'write', action: 'write' })).toBe('write');
    expect(quietKeyFor({ kind: 'setup_ask', action: 'email' })).toBe('email');
    // even with a skip record on file, the reading still leads
    const skips: NextSkips = { write: { shownDays: ['2026-10-03', '2026-10-04', '2026-10-05'] } };
    expect(nextStep(state({ skips })).kind).toBe('read');
  });

  it('persists to this device only, under dw_next_skips', () => {
    noteShown('write', TODAY);
    expect(JSON.parse(localStorage.getItem(NEXT_SKIPS_KEY) || '{}').write.shownDays).toEqual([TODAY]);
    expect(readSkips().write?.shownDays).toEqual([TODAY]);
  });

  it('a throwing localStorage still returns a next step', () => {
    localStorage.setItem(NEXT_SKIPS_KEY, JSON.stringify({ write: { shownDays: ['2026-10-03', '2026-10-04', '2026-10-05'] } }));
    const blocked = () => { throw new Error('blocked'); };
    vi.stubGlobal('localStorage', { getItem: blocked, setItem: blocked, removeItem: blocked });
    try {
      const skips = readSkips();
      expect(skips).toEqual({});
      expect(() => noteShown('write', TODAY)).not.toThrow();
      expect(() => noteQuiet('write', TODAY)).not.toThrow();
      expect(() => noteTapped('write', TODAY)).not.toThrow();
      expect(nextStep(state({ skips })).kind).toBe('read');
      expect(nextStep(state({ skips, readDoneToday: true })).kind).toBe('write');
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('a corrupt record reads as nothing learned', () => {
    localStorage.setItem(NEXT_SKIPS_KEY, '[1,2,3]');
    expect(readSkips()).toEqual({});
    localStorage.setItem(NEXT_SKIPS_KEY, '{oops');
    expect(readSkips()).toEqual({});
  });
});

describe('fillParams', () => {
  it('fills known placeholders and leaves unknown ones', () => {
    expect(fillParams('Read {passage}', { passage: 'Luke 5' })).toBe('Read Luke 5');
    expect(fillParams('Read Day {n}', {})).toBe('Read Day {n}');
  });
});
