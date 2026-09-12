/**
 * Behavior events must stamp the LOCAL en-CA date, not UTC — an 8am Australian
 * read used to file to the previous day (deeper_study.md:690).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { trackBehavior, getBehaviorProfile } from './behavior';

describe('behavior date stamping', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('stamps a new event with new Date().toLocaleDateString(en-CA)', () => {
    trackBehavior('passage_read', 'John 3:16');
    const expected = new Date().toLocaleDateString('en-CA');
    const raw = JSON.parse(localStorage.getItem('dw_behavior_v1') || '[]');
    expect(raw).toHaveLength(1);
    expect(raw[0].date).toBe(expected);
  });

  it('two events on the same local day yield one unique date in the profile', () => {
    trackBehavior('passage_read', 'John 3:16');
    trackBehavior('audio_played', 'John 3:16');
    const profile = getBehaviorProfile();
    expect(profile.daysActive).toBe(1);
  });
});
