import { describe, it, expect, vi } from 'vitest';
vi.mock('./api', () => ({ intake: vi.fn() }));
import { homePlan, type HomeInfo } from './homePlan';

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
