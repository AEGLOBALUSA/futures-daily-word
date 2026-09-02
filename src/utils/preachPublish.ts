/**
 * Preach → Publish (pastor workspace, Phase 3 of docs/PASTOR-STUDY-PREACH-PLAN.md §4.3).
 *
 * Pure helpers only — no fetch, no localStorage, no React. Turns a preaching
 * outline into the exact `answers` shape the staff intake endpoint expects
 * (see netlify/functions/intake.js actions "form"/"format_preview"/"submit"
 * and netlify/functions/lib/intake-core.js applyAnswers/questionVisibleForJob),
 * so <PublishSermon/> only has to call intake() and render.
 *
 * Questions are matched by their `config`, never by hard-coded ids:
 *  - hub sermon fields: config.publish === 'sermon_field', config.sermonKey
 *    one of title|speaker|date|series|youtubeUrl|outline.
 *  - "Do you have your notes?" gate: yes_no with config.flow === 'notes_have'
 *    (we always answer true — the pastor always has notes here, the outline).
 *  - "AI format?" toggle: yes_no with config.flow === 'notes_ai'.
 *  - campus pastors: the 'campus' type question gets staff.campusId; the
 *    long_text with config.publish === 'campus_corner' and
 *    config.itemType === 'announcement' gets "Title\n\n<notes>" (server splits
 *    title/body on the first blank line — see splitCampusCorner).
 *
 * A question only counts if it's relevant to the resolved job (audience
 * 'all' or matching the job) — a mixed question list (e.g. one fixture
 * covering hub AND campus shapes) never pollutes `missing` with fields that
 * don't apply to this pastor.
 *
 * PreachOutline + outlineToNotes() are owned by src/utils/preachOutline.ts
 * (the Outline Builder) — re-exported/delegated here so both surfaces agree
 * on exactly the same notes text.
 */
import { outlineToNotes, type PreachOutline } from './preachOutline';

export type { PreachOutline };
export type StaffLike = { email: string; role: string; campusId?: string | null; name?: string };

export interface IntakeQuestionConfig {
  publish?: string;
  itemType?: string;
  sermonKey?: string;
  default?: boolean;
  flow?: string;
}

export interface IntakeQuestion {
  id: string;
  sort_order?: number;
  label: string;
  help?: string;
  type: string;
  audience: string;
  required: boolean;
  enabled?: boolean;
  config: IntakeQuestionConfig;
}

export interface BuildAnswersResult {
  job: 'hub' | 'campus' | null;
  campusId: string | null;
  answers: Record<string, unknown>;
  missing: string[];
}

/** admin/hub/media publish the church-wide message; campus pastors post to their own corner. */
export function publishJobFor(staff: StaffLike | null | undefined): 'hub' | 'campus' | null {
  if (!staff) return null;
  if (staff.role === 'admin' || staff.role === 'hub' || staff.role === 'media') return 'hub';
  if (staff.role === 'campus') return 'campus';
  return null;
}

export function outlineNotes(outline: PreachOutline): string {
  return outlineToNotes(outline);
}

function toISODate(raw: string | undefined | null): string {
  const s = String(raw || '').trim();
  if (!s) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

function isEmptyVal(v: unknown): boolean {
  if (v === undefined || v === null) return true;
  if (typeof v === 'string') return v.trim() === '';
  return false;
}

/** A question only applies to this pastor's job when its audience says so. */
function relevantForJob(q: IntakeQuestion, job: 'hub' | 'campus'): boolean {
  const aud = q.audience || 'all';
  return aud === 'all' || aud === job;
}

/**
 * Fill the visible questions from the outline. `missing` lists required,
 * job-relevant questions we could not put a value in (empty outline title,
 * no date, an unrecognized-but-required question) — the UI shows these so
 * the pastor knows what to fix before publishing.
 */
export function buildAnswers(
  questions: IntakeQuestion[],
  outline: PreachOutline,
  staff: StaffLike | null | undefined,
  opts: { useAI: boolean; youtubeUrl?: string },
): BuildAnswersResult {
  const job = publishJobFor(staff);
  const answers: Record<string, unknown> = {};
  const missing: string[] = [];
  if (!job) return { job: null, campusId: null, answers, missing };

  const campusId = job === 'campus' ? (staff && staff.campusId) || null : null;
  const notes = outlineNotes(outline);
  const isoDate = toISODate(outline.date);

  for (const q of questions || []) {
    if (!q || q.enabled === false) continue;
    if (!relevantForJob(q, job)) continue;
    const cfg = q.config || {};
    let val: unknown;
    let recognized = true;

    if (job === 'hub' && cfg.publish === 'sermon_field' && cfg.sermonKey) {
      switch (cfg.sermonKey) {
        case 'title': val = outline.title || ''; break;
        case 'speaker': val = outline.speaker || ''; break;
        case 'series': val = outline.series || ''; break;
        case 'date': val = isoDate; break;
        case 'youtubeUrl': val = opts.youtubeUrl || ''; break;
        case 'outline': val = notes; break;
        default: recognized = false;
      }
    } else if (job === 'hub' && q.type === 'yes_no' && cfg.flow === 'notes_have') {
      val = true; // the outline IS the pastor's notes
    } else if (job === 'hub' && q.type === 'yes_no' && cfg.flow === 'notes_ai') {
      val = !!opts.useAI;
    } else if (job === 'campus' && q.type === 'campus') {
      val = (staff && staff.campusId) || '';
    } else if (job === 'campus' && q.type === 'long_text' && cfg.publish === 'campus_corner' && cfg.itemType === 'announcement') {
      const title = (outline.title || '').trim();
      val = title ? `${title}\n\n${notes}` : notes;
    } else {
      recognized = false;
    }

    if (recognized) {
      answers[q.id] = val;
      if (q.required && isEmptyVal(val)) missing.push(q.label || q.id);
    } else if (q.required) {
      missing.push(q.label || q.id);
    }
  }

  return { job, campusId, answers, missing };
}
