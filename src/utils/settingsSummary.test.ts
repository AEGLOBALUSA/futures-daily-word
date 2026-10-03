import { describe, it, expect, beforeEach } from 'vitest';
import { settingsSummary, readSettingsSummaryInput, reminderTime } from './settingsSummary';

describe('settingsSummary', () => {
  it("reads like his example", () => {
    expect(settingsSummary({ lang: 'en', persona: 'congregation', translation: 'ESV', chaptersPerDay: 1, reminderHour: 7, campusName: 'Futures Kennesaw' }))
      .toBe('You read ESV, one chapter a day, with a reminder at 7:00 am. Your campus is Futures Kennesaw.');
  });

  it('counts chapters and leaves the reminder out when it is off', () => {
    expect(settingsSummary({ lang: 'en', persona: 'deeper_study', translation: 'NASB', chaptersPerDay: 3, reminderHour: null, campusName: 'Futures Paradise' }))
      .toBe('You read NASB, 3 chapters a day. Your campus is Futures Paradise.');
  });

  it('a new believer reads one day of the journey at a time', () => {
    expect(settingsSummary({ lang: 'en', persona: 'new_to_faith', translation: 'NLT', chaptersPerDay: 4, reminderHour: 18, campusName: '' }))
      .toBe('You read NLT, one day of your journey at a time, with a reminder at 6:00 pm. You have not chosen a campus yet.');
  });

  it('a comfort reader is never told about a reminder (no push for comfort)', () => {
    expect(settingsSummary({ lang: 'en', persona: 'comfort', translation: 'ESV', chaptersPerDay: 1, reminderHour: 7, campusName: 'Futures South' }))
      .toBe('You read ESV at your own pace. Your campus is Futures South.');
  });

  it('pastors and readers with no path yet read like members', () => {
    expect(settingsSummary({ lang: 'en', persona: 'pastor_leader', translation: 'KJV', chaptersPerDay: 2, campusName: 'Futures Franklin' }))
      .toBe('You read KJV, 2 chapters a day. Your campus is Futures Franklin.');
    expect(settingsSummary({ lang: 'en', persona: null, translation: null, chaptersPerDay: null }))
      .toBe('You read ESV, one chapter a day. You have not chosen a campus yet.');
  });

  it('speaks the reader\'s language, with the Bible she reads', () => {
    expect(settingsSummary({ lang: 'es', persona: 'congregation', translation: 'RV1960', chaptersPerDay: 1, reminderHour: 7, campusName: 'Futuros Duluth' }))
      .toMatch(/^Lees RV1960, un capítulo al día, con un recordatorio a las .*7.*\. Tu campus es Futuros Duluth\.$/);
    expect(settingsSummary({ lang: 'pt', persona: 'congregation', translation: 'ARA', chaptersPerDay: 2, campusName: 'Futures Rio' }))
      .toBe('Você lê ARA, 2 capítulos por dia. Seu campus é Futures Rio.');
    expect(settingsSummary({ lang: 'id', persona: 'congregation', translation: 'TB', chaptersPerDay: 1, campusName: '' }))
      .toBe('Anda membaca TB, satu pasal sehari. Anda belum memilih kampus.');
  });

  it('reminderTime is "7:00 am" in English', () => {
    expect(reminderTime(7, 'en')).toBe('7:00 am');
    expect(reminderTime(22, 'en')).toBe('10:00 pm');
  });
});

describe('readSettingsSummaryInput', () => {
  beforeEach(() => { localStorage.clear(); });

  it('reads the values the Settings rows already use, reminder only when push is on', () => {
    expect(readSettingsSummaryInput()).toEqual({ translation: 'ESV', chaptersPerDay: 1, reminderHour: null });
    localStorage.setItem('dw_translation', 'NIV');
    localStorage.setItem('dw_chapters_per_day', '3');
    localStorage.setItem('dw_push_hour', '6');
    expect(readSettingsSummaryInput().reminderHour).toBeNull();
    localStorage.setItem('dw_push', 'subscribed');
    expect(readSettingsSummaryInput()).toEqual({ translation: 'NIV', chaptersPerDay: 3, reminderHour: 6 });
  });
});

describe('B09-07 strings', () => {
  it('every new key is in en, es, pt and id', async () => {
    const { t } = await import('./i18n');
    const keys = ['campus_confirm_q', 'campus_which_q', 'campus_confirm_yes', 'campus_confirm_yes_aria', 'campus_confirm_other',
      'campus_somewhere_else', 'campus_near_you', 'campus_why_param', 'campus_why_pco', 'campus_why_town', 'campus_choose_aria',
      'settings_sum_chapter', 'settings_sum_chapters', 'settings_sum_new', 'settings_sum_comfort', 'settings_sum_reminder',
      'settings_sum_campus', 'settings_sum_no_campus'];
    for (const k of keys) {
      const en = t(k, 'en');
      expect(en).not.toBe(k);
      for (const l of ['es', 'pt', 'id']) {
        const v = t(k, l);
        expect(v, `${k}.${l}`).not.toBe(k);
        if (k !== 'campus_confirm_yes') expect(v, `${k}.${l} is translated`).not.toBe(en);
      }
    }
    expect(t('campus_confirm_q', 'es')).toBe('¿Eres parte de {campus}?');
  });
});
