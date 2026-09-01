import { describe, it, expect, beforeEach } from 'vitest';
import {
  isColdStart,
  startGraceSeriesIfCold,
  readPathwayProgress,
  GRACE_SERIES_PERSONA,
  GRACE_SERIES_TOTAL_DAYS,
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
});
