/**
 * B09-08 helpers: tomorrow's reading, today's reflection, the More for today
 * open state (step 6) and the words that name what is inside it.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { tomorrowPassage, reflectedToday, readMoreOpen, writeMoreOpen, moreForTodayNames, localToday, MORE_OPEN_KEY } from './homeToday';
import { COMFORT_CHAPTERS } from '../data/comfort';
import { PASTOR_CHAPTERS } from '../data/pastor';

describe('tomorrowPassage', () => {
  const base = { persona: 'congregation', isNewPath: false, dayIndex: 100 };

  it('a running plan: the first passage of the next day, at chapter level', () => {
    expect(tomorrowPassage({ ...base, plan: { passages: ['Luke 5', 'Luke 6:1-16, Psalm 1', 'Luke 7'], totalDays: 3, dayNum: 1 } })).toBe('Luke 6');
  });

  it("a plan's last day has no tomorrow", () => {
    expect(tomorrowPassage({ ...base, plan: { passages: ['Luke 5'], totalDays: 1, dayNum: 1 } })).toBeNull();
  });

  it('a reading slot: the next chapter, and none past the end of the book', () => {
    expect(tomorrowPassage({ ...base, slot: { book: 'Mark', currentChapter: 3, maxChapter: 16 } })).toBe('Mark 4');
    expect(tomorrowPassage({ ...base, slot: { book: 'Mark', currentChapter: 16, maxChapter: 16 } })).toBeNull();
  });

  it("I'm New: the next journey day's reading", () => {
    const pathway = { displayDay: 6, days: [{ day: 6, reading: { book: 'John', chapter: 3 } }, { day: 7, reading: { book: 'John', chapter: 4 } }] };
    expect(tomorrowPassage({ ...base, persona: 'new_to_faith', isNewPath: true, pathway })).toBe('John 4');
  });

  it('comfort and pastor rotations step on by one day', () => {
    expect(tomorrowPassage({ ...base, persona: 'comfort' })).toBe(COMFORT_CHAPTERS[101 % COMFORT_CHAPTERS.length]);
    expect(tomorrowPassage({ ...base, persona: 'pastor_leader' })).toBe(PASTOR_CHAPTERS[101 % PASTOR_CHAPTERS.length]);
  });

  it('nothing known: null', () => {
    expect(tomorrowPassage(base)).toBeNull();
  });
});

describe('reflectedToday', () => {
  beforeEach(() => { localStorage.clear(); vi.restoreAllMocks(); });

  it('true only for a journal reflection saved or edited today', () => {
    const today = localToday();
    expect(reflectedToday(today)).toBe(false);
    localStorage.setItem('dw_journal', JSON.stringify([
      { id: 'a', type: 'journal', updatedAt: new Date(Date.now() - 3 * 86400000).toISOString() },
    ]));
    expect(reflectedToday(today)).toBe(false);
    localStorage.setItem('dw_journal', JSON.stringify([
      { id: 'b', type: 'journal', deleted: true, updatedAt: new Date().toISOString() },
      { id: 'c', type: 'journal', updatedAt: new Date().toISOString() },
    ]));
    expect(reflectedToday(today)).toBe(true);
  });

  it('a deleted entry or a broken journal is not a reflection', () => {
    localStorage.setItem('dw_journal', JSON.stringify([{ id: 'b', type: 'journal', deleted: true, updatedAt: new Date().toISOString() }]));
    expect(reflectedToday()).toBe(false);
    localStorage.setItem('dw_journal', '{broken');
    expect(reflectedToday()).toBe(false);
  });
});

describe('More for today: open for the rest of the day (step 6)', () => {
  beforeEach(() => { sessionStorage.clear(); vi.restoreAllMocks(); });

  it('opens closed each day', () => {
    expect(readMoreOpen('2026-10-06')).toBe(false);
  });

  it('once opened it stays open for the rest of that day, and not the next', () => {
    writeMoreOpen(true, '2026-10-06');
    expect(sessionStorage.getItem(MORE_OPEN_KEY)).toBe('2026-10-06');
    expect(readMoreOpen('2026-10-06')).toBe(true);
    expect(readMoreOpen('2026-10-07')).toBe(false);
  });

  it('closing it forgets it', () => {
    writeMoreOpen(true, '2026-10-06');
    writeMoreOpen(false, '2026-10-06');
    expect(readMoreOpen('2026-10-06')).toBe(false);
  });

  it('blocked storage: opens closed, never throws', () => {
    const blocked = () => { throw new Error('blocked'); };
    vi.stubGlobal('sessionStorage', { getItem: blocked, setItem: blocked, removeItem: blocked });
    try {
      expect(() => writeMoreOpen(true, '2026-10-06')).not.toThrow();
      expect(() => writeMoreOpen(false, '2026-10-06')).not.toThrow();
      expect(readMoreOpen('2026-10-06')).toBe(false);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe('moreForTodayNames', () => {
  const none = { hasPlan: false, bookCards: false, campus: false, wordOfDay: false };

  it('congregation: Sermon Notes, your plan, Book of the week', () => {
    expect(moreForTodayNames({ persona: 'congregation', isNewPath: false, ...none, hasPlan: true, bookCards: true, campus: true }))
      .toEqual(['more_item_sermon_notes', 'more_item_plan', 'more_item_books']);
  });

  it('pastor: Sermon Prep leads', () => {
    expect(moreForTodayNames({ persona: 'pastor_leader', isNewPath: false, ...none })[0]).toBe('more_item_preach');
  });

  it("I'm New with the journey as the photo hero: More for today does not name it", () => {
    expect(moreForTodayNames({ persona: 'new_to_faith', isNewPath: true, journeyInHero: true, ...none })).not.toContain('more_item_journey');
  });

  it("I'm New: the journey, never Sermon Notes or 'picked for you'", () => {
    const names = moreForTodayNames({ persona: 'new_to_faith', isNewPath: true, ...none });
    expect(names).toContain('more_item_journey');
    expect(names).not.toContain('more_item_sermon_notes');
    expect(names).not.toContain('more_item_for_you');
  });

  it('comfort: comfort for today, no "picked for you"', () => {
    const names = moreForTodayNames({ persona: 'comfort', isNewPath: false, ...none, bookCards: true });
    expect(names).toContain('more_item_comfort');
    expect(names).not.toContain('more_item_for_you');
  });

  it('never more than three names', () => {
    expect(moreForTodayNames({ persona: 'pastor_leader', isNewPath: false, hasPlan: true, bookCards: true, campus: true, wordOfDay: true })).toHaveLength(3);
  });
});
