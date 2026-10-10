/**
 * What Staff home opens on (readiness 7 Oct 2026, criteria B and Learns).
 * The server works out the facts (intake.js `home`): whether this Sunday's
 * notes are up for the person's church, and the job they usually do, learned
 * from their own submissions. This file only turns those facts into the order
 * of the cards, the ONE card that carries the main button, and the reason
 * written beside it. Pure: StaffHome renders what it returns.
 *
 * 10 Oct 2026 (Heart and Learns): home also greets the person by name and
 * names their church's week in counts the server already holds (`week`), and
 * it learns more than the weekday: the usual hour (`usualJob.hour`) and the
 * last job they started and did not send (`unfinished`, this device only).
 */
import { intake } from './api';
import { getLang, t } from '../utils/i18n';
import { rememberedCongregation, sundayLabel } from './quickNotesApi';
import type { Unfinished } from './unfinishedJob';

export type HomeCard = 'notes' | 'hub' | 'media' | 'campus';
type FormJob = 'hub' | 'media' | 'campus';

export type HomeInfo = {
  notes: { congregation: string; congregationName: string; sunday: string; up: boolean } | null;
  usualJob: { job: FormJob; why: 'weekday' | 'last'; weekday: string; hour?: number | null } | null;
  /** The person's church's week, last seven days, counts only. null when unknown. */
  week?: { place: string; prayers: number | null; corner: number | null } | null;
};

/** What only this device knows, and the clock home reads. */
export type HomeLocal = { name?: string; unfinished?: Unfinished | null; now?: Date };

export type HomePlan = {
  /** The cards in the order they show; the main card first. */
  order: HomeCard[];
  /** The one card that carries the main button (null when there are no cards). */
  main: HomeCard | null;
  /** Why the main card is first, in the staff member's language ('' when there is nothing to say). */
  reason: string;
  /** A quiet line saying Sunday's notes are already up, when they are. */
  notesUp: string;
  /** "Good morning, Mark." on this device's clock; no name, no comma. */
  greeting: string;
  /** "This week at Futures USA: 6 prayer requests, 2 corner posts." ('' when the server named no week). */
  weekLine: string;
};

/** How long Staff home waits before it shows every card without the worked-out order. */
export const HOME_INFO_WAIT_MS = 4000;

/**
 * Ask the server once per visit. Fails soft and never hangs: an error, or no
 * answer within `waitMs`, is null, and home shows every card with the
 * fallback order. A late answer is dropped (this promise has already settled).
 */
export async function loadHomeInfo(waitMs = HOME_INFO_WAIT_MS): Promise<HomeInfo | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<null>(resolve => { timer = setTimeout(() => resolve(null), waitMs); });
  try {
    const c = rememberedCongregation();
    const ask = intake<HomeInfo>('home', c ? { congregation: c } : {}).catch(() => null);
    return await Promise.race([ask, timeout]);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function weekdayName(weekday: string, lang: string): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const i = days.indexOf(weekday);
  if (i < 0) return weekday;
  // 2023-01-01 was a Sunday.
  try {
    return new Intl.DateTimeFormat(lang === 'en' ? 'en-AU' : lang, { weekday: 'long', timeZone: 'UTC' })
      .format(new Date(Date.UTC(2023, 0, 1 + i)));
  } catch {
    return weekday;
  }
}

function hourName(hour: number, lang: string): string {
  try {
    return new Intl.DateTimeFormat(lang === 'en' ? 'en-AU' : lang, { hour: 'numeric', timeZone: 'UTC' })
      .format(new Date(Date.UTC(2023, 0, 1, hour)));
  } catch {
    return `${hour}:00`;
  }
}

/** Good morning before noon, afternoon before six, evening after. */
export function greetingFor(name: string | undefined, now: Date, lang = getLang()): string {
  const h = now.getHours();
  const part = h < 12 ? 'morning' : h < 18 ? 'afternoon' : 'evening';
  const first = String(name || '').trim().split(/\s+/)[0] || '';
  return first
    ? t(`staff_home_greet_${part}_name`, lang).replace('{name}', () => first)
    : t(`staff_home_greet_${part}`, lang);
}

/** The church's week in one line, or '' when there is nothing to count. */
export function weekLineFor(week: HomeInfo['week'], lang = getLang()): string {
  if (!week || !week.place) return '';
  const facts: string[] = [];
  const count = (n: number, key: string) => t(`${key}_${n === 0 ? 'none' : n === 1 ? 'one' : 'many'}`, lang).replace('{n}', String(n));
  if (typeof week.prayers === 'number') facts.push(count(week.prayers, 'staff_home_week_prayers'));
  if (typeof week.corner === 'number') facts.push(count(week.corner, 'staff_home_week_corner'));
  if (!facts.length) return '';
  return t('staff_home_week', lang).replace('{place}', () => week.place).replace('{facts}', () => facts.join(', '));
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function homePlan(cards: HomeCard[], info: HomeInfo | null, lang = getLang(), local: HomeLocal = {}): HomePlan {
  const now = local.now ?? new Date();
  const greeting = greetingFor(local.name, now, lang);
  const weekLine = weekLineFor(info?.week ?? null, lang);
  const first = (main: HomeCard | null): HomeCard[] => (main ? [main, ...cards.filter(c => c !== main)] : [...cards]);
  const notes = info?.notes ?? null;
  const notesUp = notes && notes.up && cards.includes('notes')
    ? t('staff_home_notes_up', lang).replace('{sunday}', sundayLabel(notes.sunday, lang)).replace('{congregation}', notes.congregationName)
    : '';
  if (notes && !notes.up && cards.includes('notes')) {
    const reason = t('staff_home_notes_missing', lang)
      .replace('{sunday}', sundayLabel(notes.sunday, lang))
      .replace('{congregation}', notes.congregationName);
    return { order: first('notes'), main: 'notes', reason, notesUp: '', greeting, weekLine };
  }
  // A job they started and did not send comes before the usual one: finish what is open.
  const open = local.unfinished ?? null;
  if (open && cards.includes(open.job)) {
    const at = new Date(open.at);
    const reason = sameDay(at, now)
      ? t('staff_home_unfinished_today', lang)
      : t('staff_home_unfinished_day', lang).replace('{weekday}', () => at.toLocaleDateString(lang === 'en' ? 'en-AU' : lang, { weekday: 'long' }));
    return { order: first(open.job), main: open.job, reason, notesUp, greeting, weekLine };
  }
  const usual = info?.usualJob ?? null;
  if (usual && cards.includes(usual.job)) {
    const hour = typeof usual.hour === 'number' && usual.hour >= 0 && usual.hour < 24 ? usual.hour : null;
    let reason: string;
    if (usual.why === 'weekday') {
      reason = (hour === null ? t('staff_home_usual_weekday', lang) : t('staff_home_usual_weekday_time', lang).replace('{time}', () => hourName(hour, lang)))
        .replace('{weekday}', () => weekdayName(usual.weekday, lang));
    } else {
      reason = hour === null ? t('staff_home_usual_last', lang) : t('staff_home_usual_time', lang).replace('{time}', () => hourName(hour, lang));
    }
    return { order: first(usual.job), main: usual.job, reason, notesUp, greeting, weekLine };
  }
  // Notes are up and nothing is learned yet: the first job that is not the notes.
  const main = (notesUp ? cards.find(c => c !== 'notes') : undefined) ?? cards[0] ?? null;
  // Nothing learned yet: say plainly why this card leads, and that home learns.
  const reason = main && info ? t('staff_home_first_job', lang) : '';
  return { order: first(main), main, reason, notesUp, greeting, weekLine };
}
