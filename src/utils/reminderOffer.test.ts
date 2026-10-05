/**
 * B09-17: when she usually opens the app (openTimes.ts, this device only) and
 * the one-time "Remind you then?" offer, a kind of Home's one next step.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  recordOpen, readOpenTimes, medianMinute, suggestedHour, reminderOffer, currentReminderOffer,
  noteOfferShown, answerReminderOffer, formatReminderTime, PUSH_HOUR_EVENT,
  OPEN_TIMES_KEY, OFFER_DONE_KEY, OFFER_SHOWN_KEY, type OpenTime, type OfferInput,
} from './openTimes';
import { nextStep, type NextStepState } from './nextStep';
import { isSyncedMiscKey } from './cloudSync';
import { t } from './i18n';

/** The mocked server refuses the hour (the Yes retry test). */
let pushSaveFails = false;
const TODAY = '2026-10-06';
const opens = (...hm: Array<[number, number]>): OpenTime[] =>
  hm.map(([h, m], i) => ({ d: `2026-09-${String(20 + i).padStart(2, '0')}`, m: h * 60 + m }));

describe('openTimes: the first open of each day, on this device', () => {
  beforeEach(() => localStorage.clear());

  it('keeps the first open per local day and the last 14 days', () => {
    recordOpen(new Date(2026, 9, 6, 6, 40));
    recordOpen(new Date(2026, 9, 6, 9, 15)); // later the same day: ignored
    expect(readOpenTimes()).toEqual([{ d: '2026-10-06', m: 400 }]);
    for (let i = 7; i < 30; i++) recordOpen(new Date(2026, 9, i, 7, 0));
    expect(readOpenTimes()).toHaveLength(14);
    expect(readOpenTimes()[13].d).toBe('2026-10-29');
  });

  it('never syncs: the keys are not in the cloud bag', () => {
    for (const k of [OPEN_TIMES_KEY, OFFER_DONE_KEY, OFFER_SHOWN_KEY, 'dw_push_state_sent']) {
      expect(isSyncedMiscKey(k), k).toBe(false);
    }
  });

  it('reads junk as nothing', () => {
    localStorage.setItem(OPEN_TIMES_KEY, '{"not":"a list"}');
    expect(readOpenTimes()).toEqual([]);
    localStorage.setItem(OPEN_TIMES_KEY, JSON.stringify([{ d: 'x', m: 5 }, { d: '2026-10-01', m: 9999 }, { d: '2026-10-02', m: 400 }]));
    expect(readOpenTimes()).toEqual([{ d: '2026-10-02', m: 400 }]);
  });
});

describe('suggestedHour', () => {
  it('needs five days of opens', () => {
    expect(suggestedHour(opens([6, 30], [6, 40], [6, 35], [6, 45]))).toBeNull();
    expect(medianMinute(opens([6, 30], [6, 40], [6, 35], [6, 45]))).toBeNull();
  });

  it('is the median first open rounded to the nearest hour', () => {
    expect(suggestedHour(opens([6, 30], [6, 40], [6, 35], [6, 45], [6, 50]))).toBe(7); // median 6:40
    expect(suggestedHour(opens([6, 10], [6, 20], [6, 15], [6, 25], [6, 5]))).toBe(6); // median 6:15
    expect(suggestedHour(opens([6, 0], [6, 0], [21, 0], [6, 0], [6, 0], [22, 0]))).toBe(6); // one late night does not move it
  });

  it('an even count takes the middle two', () => {
    expect(medianMinute(opens([6, 0], [6, 20], [6, 40], [7, 0], [7, 20], [7, 40]))).toBe(410);
  });

  it('stays inside the picker\'s 5 am to 10 pm', () => {
    expect(suggestedHour(opens([1, 0], [1, 10], [0, 50], [1, 5], [1, 20]))).toBeNull();
    expect(suggestedHour(opens([23, 0], [23, 10], [22, 50], [23, 5], [23, 20]))).toBeNull();
    expect(suggestedHour(opens([4, 40], [4, 45], [4, 50], [4, 35], [4, 55]))).toBe(5);
  });
});

describe('reminderOffer', () => {
  const base: OfferInput = {
    times: opens([6, 0], [6, 5], [6, 10], [5, 55], [6, 0]),
    currentHour: 7,
    subscribed: true,
    persona: 'congregation',
    today: TODAY,
    done: false,
    shownOn: null,
  };

  it('offers her usual hour when it is at least 45 minutes from her reminder', () => {
    expect(reminderOffer(base)).toEqual({ hour: 6, current: 7 });
  });

  it('says nothing when the usual time is close to the reminder, or rounds to the same hour', () => {
    expect(reminderOffer({ ...base, times: opens([6, 30], [6, 20], [6, 25], [6, 35], [6, 30]) })).toBeNull(); // 30 min early
    expect(reminderOffer({ ...base, currentHour: 6 })).toBeNull();
  });

  it('never without reminders on, never on the Comfort path, never after it was answered', () => {
    expect(reminderOffer({ ...base, subscribed: false })).toBeNull();
    expect(reminderOffer({ ...base, persona: 'comfort' })).toBeNull();
    expect(reminderOffer({ ...base, persona: 'difficult' })).toBeNull();
    expect(reminderOffer({ ...base, done: true })).toBeNull();
  });

  it('offered once: all of the day it first showed, then never again', () => {
    expect(reminderOffer({ ...base, shownOn: TODAY })).toEqual({ hour: 6, current: 7 });
    expect(reminderOffer({ ...base, shownOn: '2026-10-05' })).toBeNull();
  });

  describe('on this device', () => {
    beforeEach(() => {
      localStorage.clear();
      localStorage.setItem('dw_push', 'subscribed');
      localStorage.setItem('dw_push_hour', '7');
      localStorage.setItem(OPEN_TIMES_KEY, JSON.stringify(base.times));
    });

    it('reads the device and closes for good once shown on an earlier day', () => {
      expect(currentReminderOffer('congregation', TODAY)).toEqual({ hour: 6, current: 7 });
      noteOfferShown(TODAY);
      noteOfferShown('2026-10-07'); // only the first day is kept
      expect(localStorage.getItem(OFFER_SHOWN_KEY)).toBe(TODAY);
      expect(currentReminderOffer('congregation', '2026-10-07')).toBeNull();
    });

    it('Keep closes it and changes nothing', async () => {
      expect(await answerReminderOffer(false, 'congregation', TODAY)).toBe(false);
      expect(localStorage.getItem(OFFER_DONE_KEY)).toBe('1');
      expect(localStorage.getItem('dw_push_hour')).toBe('7');
      expect(currentReminderOffer('congregation', TODAY)).toBeNull();
    });

    it('Yes moves the reminder to the offered hour, then closes it, and tells Settings', async () => {
      const heard = vi.fn();
      window.addEventListener(PUSH_HOUR_EVENT, heard);
      expect(await answerReminderOffer(true, 'congregation', TODAY)).toBe(true);
      window.removeEventListener(PUSH_HOUR_EVENT, heard);
      expect(localStorage.getItem('dw_push_hour')).toBe('6');
      expect(localStorage.getItem(OFFER_DONE_KEY)).toBe('1');
      expect(heard).toHaveBeenCalled();
    });

    it('a Yes the server did not take puts the hour back and keeps the offer, so Yes again is the retry', async () => {
      pushSaveFails = true;
      expect(await answerReminderOffer(true, 'congregation', TODAY)).toBe(false);
      expect(localStorage.getItem('dw_push_hour')).toBe('7');
      expect(localStorage.getItem(OFFER_DONE_KEY)).toBeNull();
      expect(currentReminderOffer('congregation', TODAY)).toEqual({ hour: 6, current: 7 });
      pushSaveFails = false;
      expect(await answerReminderOffer(true, 'congregation', TODAY)).toBe(true);
      expect(currentReminderOffer('congregation', TODAY)).toBeNull();
    });
  });
});

describe('formatReminderTime', () => {
  it('names a whole hour in the reader\'s language', () => {
    expect(formatReminderTime(6, 'en')).toMatch(/^6:00\s?AM$/);
    expect(formatReminderTime(19, 'en')).toMatch(/^7:00\s?PM$/);
    expect(formatReminderTime(7, 'pt')).toMatch(/^0?7:00$/);
  });
});

describe('the offer as Home\'s next step (after 6, before 7)', () => {
  function state(over: Partial<NextStepState> = {}): NextStepState {
    return {
      persona: 'congregation', isNewPath: false, journeyDay: null, journeyDayDone: false,
      passage: 'Luke 5', readDoneToday: true, reflectedToday: false, sundayWindow: false,
      sermonNotesPublished: null, planSetUp: true, setupAsks: ['install'], tomorrow: 'Luke 6',
      campusName: null, today: TODAY, skips: {},
      reminderOffer: { time: '6:00 AM', keepTime: '7:00 AM' },
      ...over,
    };
  }

  it('comes after the reading, with Yes as the one button and Keep beside it', () => {
    const s = nextStep(state());
    expect(s).toMatchObject({
      kind: 'reminder_offer', step: 6, labelKey: 'next_reminder_yes', params: { time: '6:00 AM' }, action: 'set_reminder',
      whyKey: 'next_reminder_why', whyParams: { time: '6:00 AM' },
      alt: { labelKey: 'next_reminder_keep', params: { time: '7:00 AM' }, action: 'keep_reminder' },
    });
  });

  it('never before the day\'s reading or Sunday\'s notes', () => {
    expect(nextStep(state({ readDoneToday: false })).kind).toBe('read');
    expect(nextStep(state({ sundayWindow: true, sermonNotesPublished: true })).kind).toBe('sunday_notes');
    expect(nextStep(state({ persona: 'new_to_faith', isNewPath: true, journeyDay: 3, journeyDayDone: false })).kind).toBe('journey_day');
  });

  it('comes before Write it down and the set-up asks, and leaves when it is answered', () => {
    expect(nextStep(state()).kind).toBe('reminder_offer');
    expect(nextStep(state({ reminderOffer: null })).kind).toBe('write');
  });
});

describe('the words', () => {
  const KEYS: Record<string, string[]> = {
    next_reminder_why: ['{time}'],
    next_reminder_yes: ['{time}'],
    next_reminder_keep: ['{time}'],
    push_day_of: ['{n}', '{plan}'],
    push_day_of_journey: ['{n}'],
  };
  // The flame is written as a code point (\u{1F525}): no literal pictograph lives under src.
  const GUILT = /streak|missed|amazing|\u{1F525}|racha|sequ[eê]ncia|perdi|incr[ií]vel|asombros|luar biasa|terlewat/iu;

  for (const [key, placeholders] of Object.entries(KEYS)) {
    it(`${key} exists in en, es, pt and id, keeps its placeholders, and has no guilt words`, () => {
      for (const lang of ['en', 'es', 'pt', 'id']) {
        const s = t(key, lang);
        expect(s, `${key}/${lang}`).not.toBe(key);
        for (const ph of placeholders) expect(s, `${key}/${lang}`).toContain(ph);
        expect(s, `${key}/${lang}`).not.toMatch(GUILT);
      }
    });
  }

  it('the English and Spanish the build names, word for word', () => {
    expect(t('next_reminder_why', 'en')).toBe('You usually read around {time}. Remind you then?');
    expect(t('next_reminder_why', 'es')).toBe('Sueles leer alrededor de las {time}. ¿Te lo recordamos a esa hora?');
    expect(t('next_reminder_yes', 'en')).toBe('Yes, {time}');
    expect(t('next_reminder_yes', 'es')).toBe('Sí, {time}');
    expect(t('next_reminder_keep', 'en')).toBe('Keep {time}');
    expect(t('next_reminder_keep', 'es')).toBe('Deja las {time}');
  });
});

vi.mock('./push', async (orig) => {
  const real = await orig<typeof import('./push')>();
  return {
    ...real,
    // The Yes path's network call: record the hour the way the real one does, no network.
    updatePushTime: async (hour: number) => { localStorage.setItem('dw_push_hour', String(hour)); return !pushSaveFails; },
  };
});
