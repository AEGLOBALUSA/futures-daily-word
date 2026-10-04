/**
 * Settings opens on one sentence (B09-07): what the reader has set up, worked
 * out from what is already stored, so she reads it instead of scanning rows.
 *
 *   "You read ESV, one chapter a day, with a reminder at 7:00 am.
 *    Your campus is Futures Kennesaw."
 *
 * Pure: every value comes in as an argument. readSettingsSummaryInput() reads
 * the stored values the Settings rows already use (dw_translation,
 * dw_chapters_per_day, dw_push, dw_push_hour), and nothing new is stored.
 */
import { t, dateLocale } from './i18n';

export interface SettingsSummaryInput {
  lang: string;
  persona?: string | null;
  translation?: string | null;
  chaptersPerDay?: number | null;
  /** The reminder hour (0–23) when the daily reminder is on, else null. */
  reminderHour?: number | null;
  /** The campus's display name, when she has one. */
  campusName?: string | null;
}

function fill(s: string, vars: Record<string, string>): string {
  return s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
}

/** "7:00 am" in English, the language's own clock elsewhere ("7:00", "07.00"). */
export function reminderTime(hour: number, lang: string): string {
  const h = Math.min(23, Math.max(0, Math.floor(hour)));
  try {
    const s = new Date(2000, 0, 1, h, 0).toLocaleTimeString(dateLocale(lang), { hour: 'numeric', minute: '2-digit' });
    return lang === 'en' ? s.replace(/\s?(AM|PM)$/i, (m) => ' ' + m.trim().toLowerCase()) : s;
  } catch {
    return `${h}:00`;
  }
}

/** The one Settings sentence, in the reader's language. */
export function settingsSummary(input: SettingsSummaryInput): string {
  const lang = input.lang || 'en';
  const translation = String(input.translation || 'ESV').trim() || 'ESV';
  const n = Math.max(1, Math.floor(Number(input.chaptersPerDay) || 1));
  const persona = input.persona || '';

  let reading: string;
  if (persona === 'new_to_faith') reading = fill(t('settings_sum_new', lang), { t: translation });
  else if (persona === 'comfort') reading = fill(t('settings_sum_comfort', lang), { t: translation });
  else if (n === 1) reading = fill(t('settings_sum_chapter', lang), { t: translation });
  else reading = fill(t('settings_sum_chapters', lang), { t: translation, n: String(n) });

  // Comfort readers get no push (design decision 8), so no reminder is named.
  const hour = input.reminderHour;
  if (persona !== 'comfort' && typeof hour === 'number' && Number.isFinite(hour)) {
    reading += fill(t('settings_sum_reminder', lang), { time: reminderTime(hour, lang) });
  }

  const campus = String(input.campusName || '').trim();
  const campusLine = campus
    ? fill(t('settings_sum_campus', lang), { campus })
    : t('settings_sum_no_campus', lang);

  return `${reading}. ${campusLine}`;
}

/** The stored values the Settings rows already read. Never throws. */
export function readSettingsSummaryInput(storage: Storage = localStorage): Pick<SettingsSummaryInput, 'translation' | 'chaptersPerDay' | 'reminderHour'> {
  const get = (k: string): string | null => {
    try { return storage.getItem(k); } catch { return null; }
  };
  const chapters = parseInt(get('dw_chapters_per_day') || '1', 10);
  const pushOn = get('dw_push') === 'subscribed';
  const rawHour = parseInt(get('dw_push_hour') || '7', 10);
  const hour = Number.isFinite(rawHour) && rawHour >= 0 && rawHour <= 23 ? rawHour : 7;
  return {
    translation: get('dw_translation') || 'ESV',
    chaptersPerDay: Number.isFinite(chapters) && chapters > 0 ? chapters : 1,
    reminderHour: pushOn ? hour : null,
  };
}
