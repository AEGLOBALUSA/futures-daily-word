import { describe, it, expect, beforeEach } from 'vitest';
import {
  isColdStart,
  startGraceSeriesIfCold,
  readPathwayProgress,
  needsDay1Landing,
  needsDay1Reading,
  beginDay1,
  markDay1Read,
  hasBegunDay1,
  ensureGraceSeriesEnrolled,
  GRACE_SERIES_PERSONA,
  GRACE_SERIES_TOTAL_DAYS,
  GRACE_SERIES_TITLE,
  needsPathAsk,
  PATH_ASKED_KEY,
} from './coldStart';

beforeEach(() => {
  localStorage.clear();
});

describe('cold start → 40-day grace series', () => {
  it('treats an empty device as cold', () => {
    expect(isColdStart()).toBe(true);
  });

  it('enrolls new_to_faith on Day 1 and marks the picker done', () => {
    expect(startGraceSeriesIfCold('default')).toBe(true);
    const setup = JSON.parse(localStorage.getItem('dw_setup') || '{}');
    expect(setup.persona).toBe(GRACE_SERIES_PERSONA);
    expect(setup.source).toBe('default');
    expect(localStorage.getItem('dw_v7_pathway_done')).toBe('true');
    const p = readPathwayProgress();
    expect(p.enrolled).toBe(true);
    expect(p.currentDay).toBe(1);
    expect(p.completedDays).toEqual([]);
    expect(p.totalDays).toBe(GRACE_SERIES_TOTAL_DAYS);
    expect(localStorage.getItem('dw_chapters_per_day')).toBe('1');
  });

  it('does not overwrite a real onboarding/settings choice', () => {
    localStorage.setItem('dw_setup', JSON.stringify({ persona: 'congregation', source: 'settings' }));
    localStorage.setItem('dw_v7_pathway_done', 'true');
    expect(isColdStart()).toBe(false);
    expect(startGraceSeriesIfCold()).toBe(false);
    expect(JSON.parse(localStorage.getItem('dw_setup') || '{}').persona).toBe('congregation');
  });

  it('does not reset someone already mid-series', () => {
    localStorage.setItem('dw_setup', JSON.stringify({ persona: 'new_to_faith', source: 'default' }));
    localStorage.setItem('dw_v7_pathway_done', 'true');
    localStorage.setItem('dw_pathway_progress', JSON.stringify({
      enrolled: true, currentDay: 4, completedDays: [1, 2, 3],
    }));
    expect(isColdStart()).toBe(false);
    expect(startGraceSeriesIfCold()).toBe(false);
    expect(readPathwayProgress().currentDay).toBe(4);
  });

  it('starts a visitor who never finished the five-choice picker', () => {
    // The leak: they opened, saw the picker, left. No dw_v7_pathway_done.
    expect(isColdStart()).toBe(true);
    startGraceSeriesIfCold();
    expect(readPathwayProgress().enrolled).toBe(true);
  });

  it('is fill-only for chapters_per_day', () => {
    localStorage.setItem('dw_chapters_per_day', '3');
    startGraceSeriesIfCold();
    expect(localStorage.getItem('dw_chapters_per_day')).toBe('3');
  });

  it('shows the Superdesign landing until Read', () => {
    expect(needsDay1Landing()).toBe(true);
    startGraceSeriesIfCold();
    expect(needsDay1Landing()).toBe(true); // enrolled is not the same as begun
    beginDay1();
    expect(hasBegunDay1()).toBe(true);
    expect(needsDay1Landing()).toBe(false);
  });

  it('does not show the landing after a real Settings persona choice', () => {
    localStorage.setItem('dw_setup', JSON.stringify({ persona: 'congregation', source: 'settings' }));
    expect(needsDay1Landing()).toBe(false);
  });

  it('does not show the landing mid-series', () => {
    localStorage.setItem('dw_pathway_progress', JSON.stringify({
      enrolled: true, currentDay: 4, completedDays: [1, 2, 3],
    }));
    expect(needsDay1Landing()).toBe(false);
  });
});

describe('Day 1 reading surface', () => {
  it('shows the reading screen after Read until Mark as read', () => {
    expect(needsDay1Reading()).toBe(false);
    beginDay1();
    expect(needsDay1Reading()).toBe(true);
    markDay1Read();
    expect(needsDay1Reading()).toBe(false);
    expect(localStorage.getItem('dw_reading_done')).toBeTruthy();
    const p = readPathwayProgress();
    expect(p.completedDays).toContain(1);
    expect(p.currentDay).toBe(2);
  });
});

describe('ensureGraceSeriesEnrolled', () => {
  it('enrolls the 40-day journey without changing persona', () => {
    localStorage.setItem('dw_setup', JSON.stringify({ persona: 'congregation', source: 'settings' }));
    ensureGraceSeriesEnrolled();
    expect(JSON.parse(localStorage.getItem('dw_setup') || '{}').persona).toBe('congregation');
    const p = readPathwayProgress();
    expect(p.enrolled).toBe(true);
    expect(p.totalDays).toBe(GRACE_SERIES_TOTAL_DAYS);
    expect(p.title).toBe(GRACE_SERIES_TITLE);
    expect(p.currentDay).toBe(1);
  });

  it('does not reset a series already in progress', () => {
    localStorage.setItem('dw_pathway_progress', JSON.stringify({
      enrolled: true, currentDay: 12, completedDays: [1, 2, 3], totalDays: 40, title: GRACE_SERIES_TITLE,
    }));
    ensureGraceSeriesEnrolled();
    const p = readPathwayProgress();
    expect(p.currentDay).toBe(12);
    expect(p.completedDays).toEqual([1, 2, 3]);
  });
});

describe('needsPathAsk — Door 3 of "Choose your path", asked once after the first read', () => {
  const defaulted = { persona: 'new_to_faith', source: 'default' };

  it('asks a defaulted reader right after Day 1 is marked read', () => {
    startGraceSeriesIfCold('default');
    expect(needsPathAsk(defaulted)).toBe(false); // nothing read yet
    beginDay1('default');
    markDay1Read();
    expect(needsPathAsk(defaulted)).toBe(true);
  });

  it('never asks after a real choice, for comfort, or once the flag is set', () => {
    beginDay1('default');
    markDay1Read();
    expect(needsPathAsk({ persona: 'new_to_faith', source: 'onboarding' })).toBe(false);
    expect(needsPathAsk({ persona: 'congregation', source: 'settings' })).toBe(false);
    expect(needsPathAsk({ persona: 'comfort', source: 'default' })).toBe(false);
    localStorage.setItem(PATH_ASKED_KEY, '1');
    expect(needsPathAsk(defaulted)).toBe(false);
  });

  it('does not interrupt someone already past Day 1 of the journey', () => {
    beginDay1('default');
    markDay1Read();
    const progress = readPathwayProgress();
    localStorage.setItem('dw_pathway_progress', JSON.stringify({ ...progress, completedDays: [1, 2], currentDay: 3 }));
    expect(needsPathAsk(defaulted)).toBe(false);
  });
});
