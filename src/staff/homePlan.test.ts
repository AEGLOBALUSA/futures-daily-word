import { describe, it, expect, vi } from 'vitest';
vi.mock('./api', () => ({ intake: vi.fn() }));
import { homePlan, loadHomeInfo, type HomeInfo } from './homePlan';
import { intake } from './api';

const notes = (up: boolean) => ({ congregation: 'futures-us', congregationName: 'Futures USA', sunday: '2026-10-11', up });

describe('homePlan: Staff home opens on the next thing', () => {
  it('Sunday notes not up: the notes card leads and carries the reason', () => {
    const info: HomeInfo = { notes: notes(false), usualJob: { job: 'hub', why: 'weekday', weekday: 'Thursday' } };
    const p = homePlan(['notes', 'hub', 'media'], info, 'en');
    expect(p.main).toBe('notes');
    expect(p.order).toEqual(['notes', 'hub', 'media']);
    expect(p.reason).toBe('Sunday 11 Oct: Futures USA’s notes aren’t up yet.');
    expect(p.notesUp).toBe('');
  });

  it('notes up: the usual job leads, and the notes line says they are up', () => {
    const info: HomeInfo = { notes: notes(true), usualJob: { job: 'media', why: 'weekday', weekday: 'Monday' } };
    const p = homePlan(['notes', 'hub', 'media'], info, 'en');
    expect(p.main).toBe('media');
    expect(p.order).toEqual(['media', 'notes', 'hub']);
    expect(p.reason).toBe('You usually do this on a Monday.');
    expect(p.notesUp).toBe('Sunday 11 Oct: Futures USA’s notes are up.');
  });

  it('notes up and nothing learned: the first job that is not the notes', () => {
    const p = homePlan(['notes', 'hub'], { notes: notes(true), usualJob: null }, 'en');
    expect(p.main).toBe('hub');
    expect(p.reason).toBe('Start here. Next time, this opens on the job you do most.');
  });

  it('a campus pastor (no notes card) leads with the usual job, or the only card', () => {
    expect(homePlan(['campus'], { notes: null, usualJob: { job: 'campus', why: 'last', weekday: 'Friday' } }, 'en'))
      .toMatchObject({ main: 'campus', reason: 'You did this last time.' });
    expect(homePlan(['campus'], { notes: null, usualJob: null }, 'en')).toMatchObject({ main: 'campus', reason: 'Start here. Next time, this opens on the job you do most.' });
  });

  it('a usual job the person can no longer open is ignored', () => {
    expect(homePlan(['campus'], { notes: null, usualJob: { job: 'hub', why: 'last', weekday: 'Friday' } }, 'en').main).toBe('campus');
  });

  it('no answer from the server: every card, the first one main', () => {
    expect(homePlan(['notes', 'hub'], null, 'en')).toMatchObject({ order: ['notes', 'hub'], main: 'notes', reason: '' });
    expect(homePlan([], null, 'en').main).toBeNull();
  });

  it('speaks Spanish when the staff member does', () => {
    const p = homePlan(['notes', 'hub'], { notes: notes(false), usualJob: null }, 'es');
    expect(p.reason).toMatch(/las notas de Futures USA todavía no están publicadas/);
    expect(homePlan(['campus'], { notes: null, usualJob: { job: 'campus', why: 'weekday', weekday: 'Tuesday' } }, 'es').reason)
      .toBe('Sueles hacer esto un martes.');
  });
});

describe('loadHomeInfo never leaves home waiting', () => {
  it('a stalled answer becomes null after the wait', async () => {
    vi.mocked(intake).mockImplementation(() => new Promise(() => {}));
    await expect(loadHomeInfo(20)).resolves.toBeNull();
  });
  it('an error becomes null; an answer comes through', async () => {
    vi.mocked(intake).mockRejectedValueOnce(new Error('down'));
    await expect(loadHomeInfo(1000)).resolves.toBeNull();
    vi.mocked(intake).mockResolvedValueOnce({ notes: null, usualJob: null });
    await expect(loadHomeInfo(1000)).resolves.toEqual({ notes: null, usualJob: null });
  });
});

describe('homePlan: names the person and their church’s week, learns beyond the weekday (10 Oct 2026)', () => {
  const morning = new Date(2026, 9, 8, 9, 0);
  const evening = new Date(2026, 9, 8, 19, 0);

  it('greets by first name on this device’s clock; no name, no comma', () => {
    expect(homePlan(['hub'], null, 'en', { name: 'Mark Evans', now: morning }).greeting).toBe('Good morning, Mark.');
    expect(homePlan(['hub'], null, 'en', { name: '', now: evening }).greeting).toBe('Good evening.');
    expect(homePlan(['hub'], null, 'es', { name: 'Alexis', now: morning }).greeting).toBe('Buenos días, Alexis.');
  });

  it('names the church’s week in counts, and says nothing when the server did not', () => {
    const info: HomeInfo = { notes: null, usualJob: null, week: { place: 'Futures USA', prayers: 6, corner: 1 } };
    expect(homePlan(['hub'], info, 'en').weekLine).toBe('This week at Futures USA: 6 prayer requests, 1 corner post.');
    expect(homePlan(['hub'], { ...info, week: { place: 'Futures Kennesaw', prayers: 0, corner: null } }, 'en').weekLine)
      .toBe('This week at Futures Kennesaw: no prayer requests yet.');
    expect(homePlan(['hub'], { ...info, week: { place: 'X', prayers: null, corner: null } }, 'en').weekLine).toBe('');
    expect(homePlan(['hub'], { notes: null, usualJob: null }, 'en').weekLine).toBe('');
  });

  it('says the usual time beside the usual job', () => {
    const p = homePlan(['hub'], { notes: null, usualJob: { job: 'hub', why: 'weekday', weekday: 'Thursday', hour: 10 } }, 'en');
    expect(p.reason).toMatch(/^You usually do this on a Thursday, around 10\s?am\.$/i);
    expect(homePlan(['hub'], { notes: null, usualJob: { job: 'hub', why: 'last', weekday: 'Thursday', hour: 20 } }, 'en').reason)
      .toMatch(/^You usually do this around 8\s?pm\.$/i);
  });

  it('a job started and not sent leads, after Sunday’s missing notes and before the usual job', () => {
    const info: HomeInfo = { notes: notes(true), usualJob: { job: 'hub', why: 'weekday', weekday: 'Thursday' } };
    const today = homePlan(['notes', 'hub', 'media'], info, 'en', { unfinished: { job: 'media', at: morning.getTime() - 3600000 }, now: morning });
    expect(today).toMatchObject({ main: 'media', reason: 'You started this today and haven’t sent it yet.' });
    expect(today.order[0]).toBe('media');
    const earlier = homePlan(['notes', 'hub', 'media'], info, 'en', { unfinished: { job: 'media', at: new Date(2026, 9, 6, 15).getTime() }, now: morning });
    expect(earlier.reason).toBe('You started this on Tuesday and haven’t sent it yet.');
    expect(homePlan(['notes', 'hub', 'media'], { ...info, notes: notes(false) }, 'en', { unfinished: { job: 'media', at: morning.getTime() }, now: morning }).main).toBe('notes');
    expect(homePlan(['campus'], info, 'en', { unfinished: { job: 'hub', at: morning.getTime() }, now: morning }).main).toBe('campus');
  });
});
