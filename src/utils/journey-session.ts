/**
 * New to Faith journey session — one destination contract.
 *
 * Begin Day 1 / Start New to Faith / Continue Journey persist
 * persona + enrolled + currentDay in dw_pathway_progress and open the
 * Day N surface (not generic Daily Word home). The open flag survives
 * refresh; Back clears it.
 */

import type { PathwayProgress } from '../data/pathway-types';
import { LS } from './storage';
import {
  beginDay1,
  ensureGraceSeriesEnrolled,
  GRACE_SERIES_PERSONA,
  GRACE_SERIES_TITLE,
  GRACE_SERIES_TOTAL_DAYS,
  needsDay1Reading,
  readPathwayProgress,
  readSetup,
} from './coldStart';
import type { ColdStartSource } from './coldStart';

export const JOURNEY_VIEW_KEY = LS.journeyView;
export const JOURNEY_OPEN_EVENT = 'dw-open-journey';
export const CANONICAL_JOURNEY_NAME = 'New to Faith';

const STAMP_SOURCES = new Set(['onboarding', 'settings', 'upgrade']);

export function journeyDisplayDay(progress: PathwayProgress = readPathwayProgress()): number {
  const today = new Date().toLocaleDateString('en-CA');
  if (progress.lastCompletedDate === today && progress.lastCompletedDay) {
    return progress.lastCompletedDay;
  }
  return progress.currentDay || 1;
}

export function isJourneyViewOpen(): boolean {
  try { return localStorage.getItem(JOURNEY_VIEW_KEY) === 'day'; } catch { return false; }
}

export function setJourneyViewOpen(open: boolean): void {
  try {
    if (open) localStorage.setItem(JOURNEY_VIEW_KEY, 'day');
    else localStorage.removeItem(JOURNEY_VIEW_KEY);
  } catch { /* quota */ }
  try {
    window.dispatchEvent(new CustomEvent(JOURNEY_OPEN_EVENT, { detail: { open } }));
  } catch { /* ignore */ }
}

/** Force the persisted series title to the canonical name without resetting progress. */
export function persistCanonicalJourneyTitle(): PathwayProgress {
  const existing = readPathwayProgress();
  const next: PathwayProgress = {
    ...existing,
    enrolled: existing.enrolled || true,
    currentDay: existing.currentDay || 1,
    completedDays: existing.completedDays || [],
    totalDays: existing.totalDays || GRACE_SERIES_TOTAL_DAYS,
    title: GRACE_SERIES_TITLE,
  };
  try { localStorage.setItem(LS.pathwayProgress, JSON.stringify(next)); } catch { /* quota */ }
  return next;
}

export function shouldResumeJourneyDay(): boolean {
  return isJourneyViewOpen() || needsDay1Reading();
}

/**
 * Enroll (fill-only), persist New to Faith progress, and open Day N.
 * Cold-start taps must not stamp cloud (source stays default / sunday-guest).
 */
export function enrollAndOpenJourneyDay(opts?: {
  beginDay1?: boolean;
  stamp?: boolean;
  coldSource?: ColdStartSource;
}): void {
  try {
    const setup = readSetup();
    const alreadyStamped = !!(setup.source && STAMP_SOURCES.has(setup.source) && setup.persona);
    const source = opts?.stamp
      ? (alreadyStamped && setup.source && STAMP_SOURCES.has(setup.source) ? setup.source : 'settings')
      : (opts?.coldSource || (setup.source as ColdStartSource) || 'default');
    localStorage.setItem(LS.setup, JSON.stringify({
      persona: GRACE_SERIES_PERSONA,
      source,
    }));
    localStorage.setItem('dw_v7_pathway_done', 'true');
  } catch { /* quota */ }

  ensureGraceSeriesEnrolled();
  persistCanonicalJourneyTitle();
  if (opts?.beginDay1) {
    beginDay1(opts.coldSource || 'default');
  }
  setJourneyViewOpen(true);
}

/** Returning user: keep current day, just open the Day N surface. */
export function continueJourneyDay(): void {
  ensureGraceSeriesEnrolled();
  persistCanonicalJourneyTitle();
  try {
    const setup = readSetup();
    if (setup.persona !== GRACE_SERIES_PERSONA) {
      const source = setup.source && STAMP_SOURCES.has(setup.source) ? setup.source : 'settings';
      localStorage.setItem(LS.setup, JSON.stringify({
        persona: GRACE_SERIES_PERSONA,
        source,
      }));
      localStorage.setItem('dw_v7_pathway_done', 'true');
    }
  } catch { /* quota */ }
  setJourneyViewOpen(true);
}
