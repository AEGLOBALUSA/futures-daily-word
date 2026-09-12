import { describe, it, expect } from 'vitest';
import { streakMergeWinner } from './cloudSync';

describe('streakMergeWinner', () => {
  it('local wins: phone at 120 today vs a cloud reset to 1 today', () => {
    const local = { count: 120, lastDate: '2026-09-12' };
    const cloud = { count: 1, lastDate: '2026-09-12' };
    expect(streakMergeWinner(local, cloud)).toBe('local');
  });

  it('local wins: phone at 120 yesterday vs a cloud reset to 1 today (gap 1, the clobber case)', () => {
    const local = { count: 120, lastDate: '2026-09-11' };
    const cloud = { count: 1, lastDate: '2026-09-12' };
    expect(streakMergeWinner(local, cloud)).toBe('local');
  });

  it('cloud wins: a genuine break — local 120 ten days ago vs cloud 1 today (gap 10)', () => {
    const local = { count: 120, lastDate: '2026-09-02' };
    const cloud = { count: 1, lastDate: '2026-09-12' };
    expect(streakMergeWinner(local, cloud)).toBe('cloud');
  });

  it('cloud wins: legit continuation — local 119 yesterday vs cloud 120 today', () => {
    const local = { count: 119, lastDate: '2026-09-11' };
    const cloud = { count: 120, lastDate: '2026-09-12' };
    expect(streakMergeWinner(local, cloud)).toBe('cloud');
  });

  it('cloud wins when there is no local record', () => {
    expect(streakMergeWinner(null, { count: 1, lastDate: '2026-09-12' })).toBe('cloud');
    expect(streakMergeWinner({}, { count: 1, lastDate: '2026-09-12' })).toBe('cloud');
  });

  it('cloud wins on same day with a higher count', () => {
    const local = { count: 5, lastDate: '2026-09-12' };
    const cloud = { count: 6, lastDate: '2026-09-12' };
    expect(streakMergeWinner(local, cloud)).toBe('cloud');
  });

  it('local wins on same day with a higher or equal count', () => {
    const local = { count: 6, lastDate: '2026-09-12' };
    const cloud = { count: 6, lastDate: '2026-09-12' };
    expect(streakMergeWinner(local, cloud)).toBe('local');
  });

  it('cloud wins at exactly the grace boundary (gap 2) only if count is not a regression', () => {
    const local = { count: 5, lastDate: '2026-09-10' };
    const cloud = { count: 6, lastDate: '2026-09-12' };
    expect(streakMergeWinner(local, cloud)).toBe('cloud');
  });

  it('local wins at exactly the grace boundary (gap 2) when cloud count regresses', () => {
    const local = { count: 5, lastDate: '2026-09-10' };
    const cloud = { count: 1, lastDate: '2026-09-12' };
    expect(streakMergeWinner(local, cloud)).toBe('local');
  });
});
