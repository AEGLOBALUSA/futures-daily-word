import { describe, it, expect, beforeEach } from 'vitest';
import { markJobStarted, markJobSent, unfinishedJob, UNFINISHED_MAX_AGE_MS } from './unfinishedJob';

describe('unfinishedJob: the last job started and not sent, on this device', () => {
  beforeEach(() => localStorage.clear());
  const t0 = Date.UTC(2026, 9, 8, 14, 0);

  it('typing starts a job; a save finishes it', () => {
    markJobStarted('Hub@Futures.global', 'hub', t0);
    expect(unfinishedJob('hub@futures.global', t0 + 1000)).toEqual({ job: 'hub', at: t0 });
    markJobSent('hub@futures.global', 'hub');
    expect(unfinishedJob('hub@futures.global', t0 + 2000)).toBeNull();
  });

  it('keeps the first keystroke time, and keeps the answers off the device', () => {
    markJobStarted('a@x.org', 'media', t0);
    markJobStarted('a@x.org', 'media', t0 + 60000);
    expect(unfinishedJob('a@x.org', t0 + 120000)?.at).toBe(t0);
    expect(localStorage.getItem('dw_staff_unfinished')).toBe(JSON.stringify({ 'a@x.org': { job: 'media', at: t0 } }));
  });

  it('is per person, ignores other jobs’ saves, unknown jobs and stale starts', () => {
    markJobStarted('a@x.org', 'campus', t0);
    expect(unfinishedJob('b@x.org', t0)).toBeNull();
    markJobSent('a@x.org', 'hub');
    expect(unfinishedJob('a@x.org', t0)).toMatchObject({ job: 'campus' });
    markJobStarted('c@x.org', 'notes', t0);
    expect(unfinishedJob('c@x.org', t0)).toBeNull();
    expect(unfinishedJob('a@x.org', t0 + UNFINISHED_MAX_AGE_MS + 1)).toBeNull();
  });

  it('fails soft when storage holds junk', () => {
    localStorage.setItem('dw_staff_unfinished', '{not json');
    expect(unfinishedJob('a@x.org')).toBeNull();
    markJobStarted('a@x.org', 'hub', t0);
    expect(unfinishedJob('a@x.org', t0)).toMatchObject({ job: 'hub' });
  });
});
