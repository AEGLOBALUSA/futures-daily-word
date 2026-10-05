/**
 * Sunday's notes, pasted once (MOS-to-8 build B09-10): the client side of
 * intake.js `notes_quick_status` and `notes_quick`, and the publish step.
 *
 * The server does the working out (the date on the congregation's clock, the
 * title, speaker, series, key verse and link, the hub form's answers matched
 * by config). This file only calls it, remembers the church last used, formats
 * the details line, and publishes the CONFIRMED preview through the existing
 * `submit` (never from a preview the person has not seen).
 */
import { intake } from './api';
import { localApiBase } from '../utils/api-base';
import { parseYoutubeId } from '../utils/youtube';
import { getLang, t } from '../utils/i18n';
import { isCongregationId, type CongregationId } from '../data/congregations';

export type QuickDetails = {
  date: string;
  title: string;
  speaker: string;
  series: string;
  youtubeUrl: string;
  keyVerse: string;
};

/** The one thing still needed, asked as one question. `other` = a required question the quick path does not know. */
export type QuickNeeds = {
  key: 'title' | 'speaker' | 'date' | 'series' | 'youtubeUrl' | 'other';
  questionId: string;
  label: string;
  type: string;
} | null;

export type QuickPreview = {
  id: string;
  title: string;
  series?: string;
  date: string;
  speaker: string;
  keyVerse?: string;
  keyVerseText?: string;
  sections?: { num: string; title: string; content: { type: string; value?: string; before?: string }[] }[];
  responsePrompts?: string[];
  commitments?: string[];
  youtubeUrl?: string;
};

/**
 * A YouTube link on its own that joins a message already up (the one just
 * preached): publishing sends these media-form answers to `submit` with job
 * "media", which adds the link to that row and keeps its date, id and
 * published_at. `id` "" means a later Sunday's message is already up, so the
 * person picks which message the link is for in the media form (`later` names
 * the message on the page); the link is already filled in there.
 */
export type QuickAttach = {
  id: string;
  title: string;
  job: 'media';
  answers: Record<string, unknown>;
  later?: { title: string; date: string };
};

export type QuickResult = {
  congregation: CongregationId;
  congregationName: string;
  sunday: string;
  details: QuickDetails;
  /** Details the app guessed (today only the speaker, from last week's message). */
  guessed: string[];
  youtubeOnly: boolean;
  preview: QuickPreview | null;
  answers: Record<string, unknown>;
  needs: QuickNeeds;
  source: string;
  /** Set when the link joins a message already up; null otherwise. */
  attach?: QuickAttach | null;
  published: false;
};

export type QuickStatus = {
  congregation: CongregationId;
  congregationName: string;
  sunday: string;
  /** This Sunday's message is already on the congregation page. */
  up: boolean;
  current: { title: string; date: string } | null;
};

/**
 * What publishing did. `verified`: the page shows it. `showing`: the title of
 * a DIFFERENT message the page shows instead (another message became current
 * in the meantime), so "pull to refresh" would be wrong; empty otherwise.
 */
/**
 * `checked`: the page was read back. When it is false nothing is known about
 * the page, so the done line must not promise that a refresh will show it.
 * `showing`: the message the page shows when it is not the one just saved
 * (with its Sunday when the two share a title).
 */
export type QuickPublished = { id: string; title: string; verified: boolean; checked?: boolean; showing?: string };

/** Same key the long hub form uses, so both remember the same church. */
const LAST_CONGREGATION_KEY = 'dw_staff_congregation';

export function rememberedCongregation(): CongregationId | null {
  try {
    const v = localStorage.getItem(LAST_CONGREGATION_KEY);
    return isCongregationId(v) ? v : null;
  } catch {
    return null;
  }
}

export function rememberCongregation(c: CongregationId) {
  try { localStorage.setItem(LAST_CONGREGATION_KEY, c); } catch { /* private mode */ }
}

/**
 * Which Sunday it is and whether its notes are up. Without a church it asks
 * for the one used last on this device, else the server answers with the
 * staff member's own campus's congregation.
 */
export async function quickNotesStatus(congregation?: CongregationId | null): Promise<QuickStatus> {
  const c = congregation || rememberedCongregation();
  return intake<QuickStatus>('notes_quick_status', c ? { congregation: c } : {});
}

/**
 * Work out Sunday's notes from what was pasted. Pass `details` (what the
 * person has answered since) and the `preview` already shown, and the server
 * applies the answer without formatting the notes again. Never publishes.
 */
export async function quickNotesRead(args: {
  text: string;
  congregation: CongregationId;
  details?: Partial<QuickDetails>;
  preview?: QuickPreview | null;
}): Promise<QuickResult> {
  try {
    return await intake<QuickResult>('notes_quick', {
      text: args.text,
      congregation: args.congregation,
      ...(args.details ? { details: args.details } : {}),
      ...(args.preview ? { preview: args.preview } : {}),
    });
  } catch (err) {
    throw new QuickError(quickErrorText(err));
  }
}

/** An error whose words are already the person's own, in their language. */
export class QuickError extends Error {
  readonly translated = true;
}

/**
 * The person's own words for a refusal, in their language. The server's or the
 * browser's English ("Failed to fetch", "Missing: Title") never reaches the
 * screen: each known failure maps to its fix, anything else to the generic line.
 */
export function quickErrorText(err: unknown, lang = getLang()): string {
  if (err instanceof QuickError && err.message) return err.message;
  const e = err as { status?: number; data?: { code?: string; error?: string }; message?: string; name?: string };
  const code = e?.data?.code;
  if (code === 'empty') return t('staff_quick_err_empty', lang);
  if (code === 'bad_link') return t('staff_quick_err_link', lang);
  if (code === 'too_long') return t('staff_quick_err_long', lang);
  if (e?.status === 401) return t('staff_quick_err_signin', lang);
  if (e?.status === 403) return t('staff_quick_err_role', lang);
  const said = String(e?.data?.error || '');
  if (e?.status === 400 && /^Missing: /.test(said)) return t('staff_quick_err_missing', lang);
  if (!e?.status && (e?.name === 'TypeError' || /fetch|network|load failed/i.test(String(e?.message || '')))) {
    return t('staff_quick_err_network', lang);
  }
  return t('staff_quick_err_generic', lang);
}

/** Question types the one box can answer in words; anything else (a campus, a pick list) belongs in the full form. */
const WORD_TYPES = ['text', 'long_text', 'date', 'url'];

/** True when the one missing detail cannot be typed into the one box, so Change details (the form, pre-filled) is the way on. */
export function needsTheForm(needs: QuickNeeds): boolean {
  return !!needs && needs.key === 'other' && !WORD_TYPES.includes(needs.type || 'text');
}

/**
 * Put the CONFIRMED preview on the congregation page: the existing `submit`
 * with the answers the server filled by config, then read the page back the
 * way the congregation does, so "It's on the congregation page" is a fact.
 */
export async function quickNotesPublish(result: QuickResult): Promise<QuickPublished> {
  const attach = result.attach || null;
  if (!result.preview || result.needs || (attach && !attach.id)) throw new Error(t('staff_quick_err_generic'));
  let data: { published?: boolean; pending?: boolean; publish_result?: { sermon?: { id?: string; title?: string } | null } };
  try {
    // A link that joins a message already up goes through the media form's
    // merge: only the link changes, the message keeps its date and its week.
    data = await intake('submit', attach
      ? { answers: attach.answers, job: attach.job, congregation: result.congregation }
      : { answers: result.answers, job: 'hub', congregation: result.congregation, formatted_sermon: result.preview });
  } catch (err) {
    throw new QuickError(quickErrorText(err));
  }
  const sermon = data.publish_result?.sermon;
  if (!data.published || !sermon?.id) throw new QuickError(t('staff_quick_err_not_live'));
  rememberCongregation(result.congregation);
  let verified = false;
  let checked = false;
  let showing = '';
  const title = sermon.title || attach?.title || result.preview.title;
  try {
    const r = await fetch(`${localApiBase()}/api/published-sermon?congregation=${encodeURIComponent(result.congregation)}`, { cache: 'no-store' });
    const j = r.ok ? await r.json() : null;
    checked = !!(j && typeof j === 'object');
    const ours = attach ? [attach.id, result.preview.id] : [sermon.id];
    if (j && j.sermon && j.sermon.id && !ours.includes(j.sermon.id)) showing = otherMessageLabel(j.sermon, title);
    // A link is on the page only when the message the card named carries it:
    // the row submit changed is that message, and the page shows that message
    // (by its row id or its own id) with this link. Another message that
    // happens to have the same link never counts.
    verified = !!(j && j.sermon && (attach
      ? sermon.id === attach.id
        && (j.sermon.id === attach.id || j.sermon.id === result.preview.id)
        && sameVideo(j.sermon.youtubeUrl, result.details.youtubeUrl)
      : j.sermon.id === sermon.id));
  } catch { /* verified and checked stay false */ }
  return { id: sermon.id, title, verified, checked, showing };
}

/**
 * Two links are the same video when they name the same YouTube id: the page
 * stores the server's normalised link, the person may have typed youtu.be.
 */
export function sameVideo(a: unknown, b: unknown): boolean {
  const x = parseYoutubeId(String(a || ''));
  return !!x && x === parseYoutubeId(String(b || ''));
}

/**
 * The other message's name for a done line. Identity is decided by id before
 * this is called; when the two messages share a title, its Sunday tells them apart.
 */
export function otherMessageLabel(other: { title?: unknown; date?: unknown }, savedTitle: string, lang = getLang()): string {
  const name = String(other.title || '');
  if (name && name.trim().toLowerCase() !== String(savedTitle || '').trim().toLowerCase()) return name;
  const day = sundayLabel(String(other.date || ''), lang);
  return day ? `${name} (${day})` : name;
}

/** "Sunday 4 Oct" in the staff member's language. */
export function sundayLabel(date: string, lang = getLang()): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date || '');
  if (!m) return '';
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  let day = '';
  try {
    day = new Intl.DateTimeFormat(lang === 'en' ? 'en-AU' : lang, { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(d);
  } catch {
    day = date;
  }
  return t('staff_quick_sunday', lang).replace('{date}', day);
}

/**
 * The details the app worked out, on one line:
 * "Sunday 4 Oct · Ordinary Faith · Ps Sam · series Built to Last · key verse Hebrews 11:1".
 * Empty details are left out; a guessed speaker says so.
 */
export function detailsLine(result: Pick<QuickResult, 'details' | 'guessed'>, lang = getLang()): string {
  const d = result.details;
  const parts = [sundayLabel(d.date, lang)];
  if (d.title) parts.push(d.title);
  if (d.speaker) parts.push(result.guessed.includes('speaker') ? `${d.speaker} (${t('staff_quick_as_last_week', lang)})` : d.speaker);
  if (d.series) parts.push(`${t('staff_quick_series', lang)} ${d.series}`);
  if (d.keyVerse) parts.push(`${t('staff_quick_key_verse', lang)} ${d.keyVerse}`);
  return parts.filter(Boolean).join(' · ');
}

/** The one question for what is still missing, in the staff member's language. */
export function needsQuestion(needs: QuickNeeds, lang = getLang()): string {
  if (!needs) return '';
  if (needs.key === 'title') return t('staff_quick_ask_title', lang);
  if (needs.key === 'speaker') return t('staff_quick_ask_speaker', lang);
  if (needs.key === 'date') return t('staff_quick_ask_date', lang);
  if (needs.key === 'series') return t('staff_quick_ask_series', lang);
  if (needs.key === 'youtubeUrl') return t('staff_quick_ask_youtube', lang);
  if (needsTheForm(needs)) return t('staff_quick_ask_in_form', lang).replace('{label}', needs.label);
  return needs.label;
}

/** The details object for a follow-up `quickNotesRead` after the person answered `needs`. */
export function answerNeeds(result: QuickResult, value: string): Partial<QuickDetails> {
  const v = value.trim();
  const next: Partial<QuickDetails> = { ...result.details };
  if (!result.needs || !v) return next;
  if (result.needs.key !== 'other') next[result.needs.key] = v;
  return next;
}

/** For a required question the quick path does not know: fold the answer into the answers by its id. */
export function withOtherAnswer(result: QuickResult, value: string): QuickResult {
  if (!result.needs || result.needs.key !== 'other' || needsTheForm(result.needs) || !value.trim()) return result;
  const id = result.needs.questionId;
  if (result.attach) {
    return { ...result, attach: { ...result.attach, answers: { ...result.attach.answers, [id]: value.trim() } }, needs: null };
  }
  return { ...result, answers: { ...result.answers, [id]: value.trim() }, needs: null };
}

/**
 * The form, pre-filled: for "Change details". Notes open the hub form; a link
 * that joins a message already up opens the media form on that message, whose
 * save adds the link without re-publishing the notes. A link whose message is
 * the person's call (`attach.id` "") opens the media form with the link filled
 * in and the message left to pick.
 */
export function changeDetailsSeed(result: QuickResult): { answers: Record<string, unknown>; preview: QuickPreview | null; congregation: CongregationId; job: 'hub' | 'media' } {
  if (result.attach) {
    return { answers: { ...result.attach.answers }, preview: null, congregation: result.congregation, job: 'media' };
  }
  return { answers: { ...result.answers }, preview: result.preview, congregation: result.congregation, job: 'hub' };
}
