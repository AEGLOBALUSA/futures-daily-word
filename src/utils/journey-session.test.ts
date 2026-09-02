import { describe, it, expect, beforeEach } from 'vitest';
import {
  enrollAndOpenJourneyDay,
  continueJourneyDay,
  isJourneyViewOpen,
  setJourneyViewOpen,
  journeyDisplayDay,
  persistCanonicalJourneyTitle,
  shouldResumeJourneyDay,
  CANONICAL_JOURNEY_NAME,
  JOURNEY_VIEW_KEY,
} from './journey-session';
import { GRACE_SERIES_TITLE, readPathwayProgress, hasBegunDay1 } from './coldStart';

beforeEach(() => {
  localStorage.clear();
});

describe('journey session — Day N destination', () => {
  it('uses the canonical journey name', () => {
    expect(CANONICAL_JOURNEY_NAME).toBe('New to Faith');
    expect(GRACE_SERIES_TITLE).toBe('New to Faith');
  });

  it('Begin Day 1 enrolls, persists progress, and opens Day N', () => {
    enrollAndOpenJourneyDay({ beginDay1: true, coldSource: 'default' });
    const setup = JSON.parse(localStorage.getItem('dw_setup') || '{}');
    expect(setup.persona).toBe('new_to_faith');
    expect(setup.source).toBe('default');
    const p = readPathwayProgress();
    expect(p.enrolled).toBe(true);
    expect(p.currentDay).toBe(1);
    expect(p.title).toBe('New to Faith');
    expect(p.totalDays).toBe(40);
    expect(hasBegunDay1()).toBe(true);
    expect(isJourneyViewOpen()).toBe(true);
    expect(localStorage.getItem(JOURNEY_VIEW_KEY)).toBe('day');
  });

  it('Continue Journey keeps currentDay and reopens Day N', () => {
    localStorage.setItem('dw_setup', JSON.stringify({ persona: 'new_to_faith', source: 'settings' }));
    localStorage.setItem('dw_pathway_progress', JSON.stringify({
      enrolled: true, currentDay: 7, completedDays: [1, 2, 3, 4, 5, 6],
      totalDays: 40, title: 'New to Faith',
    }));
    continueJourneyDay();
    const p = readPathwayProgress();
    expect(p.currentDay).toBe(7);
    expect(p.completedDays).toEqual([1, 2, 3, 4, 5, 6]);
    expect(p.title).toBe('New to Faith');
    expect(isJourneyViewOpen()).toBe(true);
  });

  it('survives a closed-then-reopened flag across setJourneyViewOpen', () => {
    setJourneyViewOpen(true);
    expect(shouldResumeJourneyDay()).toBe(true);
    setJourneyViewOpen(false);
    expect(isJourneyViewOpen()).toBe(false);
  });

  it('display day stays on the day completed today', () => {
    const today = new Date().toLocaleDateString('en-CA');
    expect(journeyDisplayDay({
      enrolled: true,
      currentDay: 3,
      completedDays: [1, 2],
      lastCompletedDay: 2,
      lastCompletedDate: today,
    })).toBe(2);
    expect(journeyDisplayDay({
      enrolled: true,
      currentDay: 3,
      completedDays: [1, 2],
    })).toBe(3);
  });

  it('persistCanonicalJourneyTitle does not reset progress', () => {
    localStorage.setItem('dw_pathway_progress', JSON.stringify({
      enrolled: true, currentDay: 12, completedDays: [1, 2, 3],
      totalDays: 40, title: 'New & Returning to Faith',
    }));
    const p = persistCanonicalJourneyTitle();
    expect(p.currentDay).toBe(12);
    expect(p.completedDays).toEqual([1, 2, 3]);
    expect(p.title).toBe('New to Faith');
  });
});
