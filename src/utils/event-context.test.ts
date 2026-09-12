import { describe, it, expect, beforeEach } from 'vitest';
import { getEventPath, getJourneyDay } from './event-context';

describe('getEventPath / getJourneyDay — legacy persona migration (M1)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('canonicalises a legacy persona value to its current path', () => {
    localStorage.setItem('dw_setup', JSON.stringify({ persona: 'new_believer' }));
    expect(getEventPath()).toBe('new_to_faith');
  });

  it('resolves journey_day for a legacy new_believer reader mid-pathway', () => {
    localStorage.setItem('dw_setup', JSON.stringify({ persona: 'new_believer' }));
    localStorage.setItem('dw_pathway_progress', JSON.stringify({ currentDay: 7, enrolled: true, completedDays: [] }));
    expect(getJourneyDay()).toBe(7);
  });
});
