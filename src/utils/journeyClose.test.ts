import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./cloudSync', () => ({ syncMisc: vi.fn() }));

import {
  identityLineKey,
  loadCloseAnswers,
  saveCloseAnswer,
  handoffStage,
  readHandoff,
  shouldShowHandoff,
  markHandoff,
} from './journeyClose';

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

describe('identityLineKey', () => {
  it('rotates deterministically 1,2,3,1', () => {
    expect(identityLineKey(1)).toBe('j_close_identity_1');
    expect(identityLineKey(2)).toBe('j_close_identity_2');
    expect(identityLineKey(3)).toBe('j_close_identity_3');
    expect(identityLineKey(4)).toBe('j_close_identity_1');
  });
});

describe('close answers share dw_pathway_qa_<day> with the lesson questions', () => {
  it('preserves numeric slots 0 and 1 already in the record', () => {
    localStorage.setItem('dw_pathway_qa_5', JSON.stringify({ 0: 'lesson answer one', 1: 'lesson answer two' }));
    saveCloseAnswer(5, 0, 'close answer');
    const rec = JSON.parse(localStorage.getItem('dw_pathway_qa_5') || '{}');
    expect(rec[0]).toBe('lesson answer one');
    expect(rec[1]).toBe('lesson answer two');
    expect(rec.c0).toBe('close answer');
  });

  it('a later PathwayAnswer-style write of slot 0 preserves c0..c2', () => {
    saveCloseAnswer(6, 0, 'c0 text');
    saveCloseAnswer(6, 1, 'c1 text');
    saveCloseAnswer(6, 2, 'c2 text');
    // Simulate PathwayAnswer.save(), which spreads the existing record and
    // sets only its own numeric slot.
    const existing = JSON.parse(localStorage.getItem('dw_pathway_qa_6') || '{}');
    const next = { ...existing, 0: 'lesson slot 0' };
    localStorage.setItem('dw_pathway_qa_6', JSON.stringify(next));

    const rec = JSON.parse(localStorage.getItem('dw_pathway_qa_6') || '{}');
    expect(rec[0]).toBe('lesson slot 0');
    expect(rec.c0).toBe('c0 text');
    expect(rec.c1).toBe('c1 text');
    expect(rec.c2).toBe('c2 text');
  });

  it('loadCloseAnswers returns length 3, empty strings when absent', () => {
    expect(loadCloseAnswers(9)).toEqual(['', '', '']);
  });

  it('loadCloseAnswers survives corrupt JSON', () => {
    localStorage.setItem('dw_pathway_qa_9', '{not json');
    expect(loadCloseAnswers(9)).toEqual(['', '', '']);
  });
});

describe('handoffStage', () => {
  it('13 completed => null', () => {
    expect(handoffStage(13, 40)).toBeNull();
  });
  it('14 completed => d14', () => {
    expect(handoffStage(14, 40)).toBe('d14');
  });
  it('39 of 40 => d14', () => {
    expect(handoffStage(39, 40)).toBe('d14');
  });
  it('40 of 40 => d40', () => {
    expect(handoffStage(40, 40)).toBe('d40');
  });
  it('totalDays 0 => never d40, even with a high completed count', () => {
    expect(handoffStage(100, 0)).toBe('d14');
  });
});

describe('shouldShowHandoff', () => {
  it('d14 shows only while unset', () => {
    expect(shouldShowHandoff('d14')).toBe(true);
    markHandoff('d14', 'opened');
    expect(shouldShowHandoff('d14')).toBe(false);
  });
  it('d14 also hides once dismissed', () => {
    markHandoff('d14', 'dismissed');
    expect(shouldShowHandoff('d14')).toBe(false);
  });
  it('d40 keeps showing after opened, hides only after dismissed', () => {
    expect(shouldShowHandoff('d40')).toBe(true);
    markHandoff('d40', 'opened');
    expect(shouldShowHandoff('d40')).toBe(true);
    markHandoff('d40', 'dismissed');
    expect(shouldShowHandoff('d40')).toBe(false);
  });
});

describe('markHandoff', () => {
  it('merges and never drops the other stage', () => {
    markHandoff('d14', 'opened');
    markHandoff('d40', 'dismissed');
    const rec = readHandoff();
    expect(rec.d14).toBe('opened');
    expect(rec.d40).toBe('dismissed');
  });
});
