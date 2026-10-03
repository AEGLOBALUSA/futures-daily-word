import { describe, expect, it } from 'vitest';
import { QuickError, needsTheForm, needsQuestion, quickErrorText, withOtherAnswer, type QuickResult } from './quickNotesApi';
import { t } from '../utils/i18n';

const base = (needs: QuickResult['needs']): QuickResult => ({
  congregation: 'futures-us', congregationName: 'Futures USA', sunday: '2026-10-04',
  details: { date: '2026-10-04', title: 'T', speaker: 'S', series: '', youtubeUrl: '', keyVerse: '' },
  guessed: [], youtubeOnly: false, preview: null, answers: { q1: 'a' }, needs, source: 'rules', published: false,
});

describe('quickErrorText: never the server or browser English', () => {
  for (const lang of ['en', 'es', 'pt', 'id']) {
    it(`maps each known failure to its own words (${lang})`, () => {
      expect(quickErrorText(new TypeError('Failed to fetch'), lang)).toBe(t('staff_quick_err_network', lang));
      expect(quickErrorText(new TypeError('Load failed'), lang)).toBe(t('staff_quick_err_network', lang));
      expect(quickErrorText({ status: 403, data: { error: 'Only hub, media or admin staff can put up Sunday\'s notes.', code: 'role' } }, lang)).toBe(t('staff_quick_err_role', lang));
      expect(quickErrorText({ status: 400, data: { error: 'Missing: Title' } }, lang)).toBe(t('staff_quick_err_missing', lang));
      expect(quickErrorText({ status: 401, data: {} }, lang)).toBe(t('staff_quick_err_signin', lang));
      expect(quickErrorText({ status: 400, data: { code: 'too_long', error: 'That is longer…' } }, lang)).toBe(t('staff_quick_err_long', lang));
      expect(quickErrorText({ status: 500, data: { error: 'relation "x" does not exist' } }, lang)).toBe(t('staff_quick_err_generic', lang));
      expect(quickErrorText(new Error('Request failed'), lang)).toBe(t('staff_quick_err_generic', lang));
    });
  }
  it('keeps words already translated (a wrapped error is not turned generic)', () => {
    const words = t('staff_quick_err_not_live', 'es');
    expect(quickErrorText(new QuickError(words), 'en')).toBe(words);
  });
  it('every key it can return exists in en, es, pt and id', () => {
    for (const key of ['staff_quick_err_network', 'staff_quick_err_role', 'staff_quick_err_missing', 'staff_quick_ask_series', 'staff_quick_ask_youtube', 'staff_quick_ask_in_form']) {
      for (const lang of ['en', 'es', 'pt', 'id']) expect(t(key, lang)).not.toBe(key);
    }
  });
});

describe('a missing detail the one box cannot take goes to the form', () => {
  const pick = { key: 'other' as const, questionId: 'q9', label: 'Campus', type: 'campus' };
  const words = { key: 'other' as const, questionId: 'q8', label: 'Theme', type: 'text' };
  it('needsTheForm only for non-word types', () => {
    expect(needsTheForm(pick)).toBe(true);
    expect(needsTheForm({ ...pick, type: 'sermon_pick' })).toBe(true);
    expect(needsTheForm(words)).toBe(false);
    expect(needsTheForm({ ...words, type: 'long_text' })).toBe(false);
    expect(needsTheForm({ key: 'title', questionId: 'q1', label: 'Title', type: 'text' })).toBe(false);
    expect(needsTheForm(null)).toBe(false);
  });
  it('withOtherAnswer never marks a pick-list question answered from typed text', () => {
    const r = base(pick);
    expect(withOtherAnswer(r, 'Alpharetta')).toBe(r);
  });
  it('withOtherAnswer folds a word answer in by question id, and ignores an empty one', () => {
    const r = withOtherAnswer(base(words), '  Hope  ');
    expect(r.needs).toBeNull();
    expect(r.answers).toEqual({ q1: 'a', q8: 'Hope' });
    const blank = base(words);
    expect(withOtherAnswer(blank, '   ')).toBe(blank);
  });
  it('the question names the form for a pick-list detail', () => {
    expect(needsQuestion(pick, 'en')).toBe(t('staff_quick_ask_in_form', 'en').replace('{label}', 'Campus'));
    expect(needsQuestion({ key: 'series', questionId: 'q3', label: 'Series', type: 'text' }, 'es')).toBe(t('staff_quick_ask_series', 'es'));
  });
});
