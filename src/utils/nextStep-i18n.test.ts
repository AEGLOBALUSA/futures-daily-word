/**
 * B09-08 step 7: every string the one next step and More for today can show
 * exists in all four languages, with its placeholders kept.
 */
import { describe, it, expect } from 'vitest';
import { t } from './i18n';

const KEYS: Record<string, string[]> = {
  next_read_passage: ['{passage}'],
  next_read_day: ['{n}'],
  next_sermon_notes: [],
  next_write_it_down: [],
  next_write_prompt: ['{passage}'],
  next_tomorrow: ['{passage}'],
  next_done_today: [],
  next_why_sunday: ['{campus}'],
  next_set_up_plan: [],
  next_choose_plan: [],
  next_setup_install: [],
  next_setup_email: [],
  next_setup_upgrade: [],
  more_for_today: [],
  more_item_sermon_notes: [],
  more_item_preach: [],
  more_item_journey: [],
  more_item_comfort: [],
  more_item_plan: [],
  more_item_books: [],
  more_item_campus: [],
  more_item_word: [],
  more_item_campus_overview: [],
  more_item_for_you: [],
};

describe('next-step strings', () => {
  for (const [key, placeholders] of Object.entries(KEYS)) {
    it(`${key} exists in en, es, pt and id`, () => {
      for (const lang of ['en', 'es', 'pt', 'id']) {
        const s = t(key, lang);
        expect(s, `${key}/${lang}`).not.toBe(key);
        for (const ph of placeholders) expect(s, `${key}/${lang}`).toContain(ph);
      }
    });
  }

  it('the Spanish the build names, word for word', () => {
    expect(t('next_read_passage', 'es')).toBe('Lee {passage}');
    expect(t('next_read_day', 'es')).toBe('Lee el día {n}');
    expect(t('next_sermon_notes', 'es')).toBe('Abre las notas del mensaje de hoy');
    expect(t('next_write_it_down', 'es')).toBe('Escríbelo');
    expect(t('next_tomorrow', 'es')).toBe('Mañana: {passage}');
    expect(t('more_for_today', 'es')).toBe('Más para hoy');
    expect(t('next_why_sunday', 'es')).toBe('Es domingo por la mañana en {campus}');
  });

  it('the English the build names, word for word', () => {
    expect(t('next_read_passage', 'en')).toBe('Read {passage}');
    expect(t('next_read_day', 'en')).toBe('Read Day {n}');
    expect(t('next_sermon_notes', 'en')).toBe("Open today's sermon notes");
    expect(t('next_write_it_down', 'en')).toBe('Write it down');
    expect(t('next_tomorrow', 'en')).toBe('Tomorrow: {passage}');
    expect(t('more_for_today', 'en')).toBe('More for today');
    expect(t('next_why_sunday', 'en')).toBe("It's Sunday morning at {campus}");
  });
});
