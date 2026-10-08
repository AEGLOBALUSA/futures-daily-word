/**
 * What Staff home opens on (readiness 7 Oct 2026, criteria B and Learns).
 * The server works out the facts (intake.js `home`): whether this Sunday's
 * notes are up for the person's church, and the job they usually do, learned
 * from their own submissions. This file only turns those facts into the order
 * of the cards, the ONE card that carries the main button, and the reason
 * written beside it. Pure: StaffHome renders what it returns.
 */
import { intake } from './api';
import { getLang, t } from '../utils/i18n';
import { rememberedCongregation, sundayLabel } from './quickNotesApi';

export type HomeCard = 'notes' | 'hub' | 'media' | 'campus';
type FormJob = 'hub' | 'media' | 'campus';

export type HomeInfo = {
  notes: { congregation: string; congregationName: string; sunday: string; up: boolean } | null;
  usualJob: { job: FormJob; why: 'weekday' | 'last'; weekday: string } | null;
};

export type HomePlan = {
  /** The cards in the order they show; the main card first. */
  order: HomeCard[];
  /** The one card that carries the main button (null when there are no cards). */
  main: HomeCard | null;
  /** Why the main card is first, in the staff member's language ('' when there is nothing to say). */
  reason: string;
  /** A quiet line saying Sunday's notes are already up, when they are. */
  notesUp: string;
};

/** Ask the server once per visit. Fails soft: home still shows every card. */
export async function loadHomeInfo(): Promise<HomeInfo | null> {
  try {
    const c = rememberedCongregation();
    return await intake<HomeInfo>('home', c ? { congregation: c } : {});
  } catch {
    return null;
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

export function homePlan(cards: HomeCard[], info: HomeInfo | null, lang = getLang()): HomePlan {
  const first = (main: HomeCard | null): HomeCard[] => (main ? [main, ...cards.filter(c => c !== main)] : [...cards]);
  const notes = info?.notes ?? null;
  const notesUp = notes && notes.up && cards.includes('notes')
    ? t('staff_home_notes_up', lang).replace('{sunday}', sundayLabel(notes.sunday, lang)).replace('{congregation}', notes.congregationName)
    : '';
  if (notes && !notes.up && cards.includes('notes')) {
    const reason = t('staff_home_notes_missing', lang)
      .replace('{sunday}', sundayLabel(notes.sunday, lang))
      .replace('{congregation}', notes.congregationName);
    return { order: first('notes'), main: 'notes', reason, notesUp: '' };
  }
  const usual = info?.usualJob ?? null;
  if (usual && cards.includes(usual.job)) {
    const reason = usual.why === 'weekday'
      ? t('staff_home_usual_weekday', lang).replace('{weekday}', weekdayName(usual.weekday, lang))
      : t('staff_home_usual_last', lang);
    return { order: first(usual.job), main: usual.job, reason, notesUp };
  }
  // Notes are up and nothing is learned yet: the first job that is not the notes.
  const main = (notesUp ? cards.find(c => c !== 'notes') : undefined) ?? cards[0] ?? null;
  // Nothing learned yet: say plainly why this card leads, and that home learns.
  const reason = main && info ? t('staff_home_first_job', lang) : '';
  return { order: first(main), main, reason, notesUp };
}
