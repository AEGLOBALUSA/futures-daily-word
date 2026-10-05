/**
 * The campus corner arrives drafted, "Make this yours" (MOS-to-8 build B09-18):
 * the client side of intake.js corner_draft_get / _refresh / _publish / _skip.
 *
 * The server does the working out (which week, which campus, the draft built
 * from Sunday's published message and the pastor's answers, who may see it).
 * This file only calls it. Nothing here publishes on its own: publish is only
 * ever called from the pastor's tap on "Put this on the campus corner".
 */
import { intake } from './api';

export type CornerDraft = {
  id: string;
  campusId: string;
  campusName: string;
  /** The Monday (campus-local, YYYY-MM-DD) that starts the draft's week. */
  weekOf: string;
  /** The draft's own language: 'es' for Futuros campuses, else 'en'. */
  lang: 'en' | 'es';
  body: string;
  prayerPoint: string;
  status: 'draft' | 'published' | 'skipped';
  writtenBy: 'model' | 'template';
  /** Fresh drafts left this week (5 a week). */
  refreshesLeft: number;
  /** Which optional questions the pastor has already answered. */
  answered: { extra: boolean; prayerPoint: boolean };
  /** What the draft was built from, shown beside it. */
  source: { title: string; speaker: string; keyVerse: string; series: string } | null;
};

export type CornerDraftWaiting = { campusId: string; campusName: string; weekOf: string; writtenBy: 'model' | 'template' };

/** The refusal codes the card maps to its own words (never the server's English). */
export type CornerDraftErrorCode =
  | 'other_campus' | 'campus_unconfirmed' | 'role' | 'campus' | 'preview'
  | 'no_draft' | 'not_draft' | 'refresh_cap' | 'empty' | 'unfinished' | 'save_failed';

export function cornerDraftErrorCode(err: unknown): CornerDraftErrorCode | '' {
  const code = (err as { data?: { code?: unknown } } | null)?.data?.code;
  return typeof code === 'string' ? (code as CornerDraftErrorCode) : '';
}

/** A campus pastor: his own campus's draft for this week (null when there is none to show). Admin: the campus named. */
export async function getCornerDraft(campusId?: string): Promise<{ campusId: string; campusName: string; draft: CornerDraft | null }> {
  return intake('corner_draft_get', campusId ? { campusId } : {});
}

/** Admin with no campus named: this week's drafts still waiting. */
export async function listCornerDrafts(): Promise<CornerDraftWaiting[]> {
  const out = await intake<{ drafts?: CornerDraftWaiting[] }>('corner_draft_get', {});
  return Array.isArray(out.drafts) ? out.drafts : [];
}

/** A fresh draft with the pastor's answer added. Pass only the answer being given; "" clears it. */
export async function refreshCornerDraft(
  answers: { extra?: string; prayerPoint?: string },
  campusId?: string,
): Promise<CornerDraft> {
  const out = await intake<{ draft: CornerDraft }>('corner_draft_refresh', { ...answers, ...(campusId ? { campusId } : {}) });
  return out.draft;
}

/** The pastor's tap: his (edited) words go on the campus corner. */
export async function publishCornerDraft(
  body: string,
  prayerPoint: string,
  campusId?: string,
): Promise<{ campusId: string; campusName: string; item: { title: string; content: string } }> {
  return intake('corner_draft_publish', { body, prayerPoint, ...(campusId ? { campusId } : {}) });
}

/** "Not this week". */
export async function skipCornerDraft(campusId?: string): Promise<void> {
  await intake('corner_draft_skip', campusId ? { campusId } : {});
}
