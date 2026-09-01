/**
 * Cold start → Day 1 of the existing 40-day "New & Returning to Faith" series.
 *
 * Live usage (Ashley, 2026-09): the five-choice PathwayPicker is where people
 * open and never read. 23 of 28 pathway enrollments are still on day 1 with
 * nothing completed; plan enrollments are 0. This helper is fill-only: a real
 * persona choice (onboarding / settings / upgrade) is never overwritten.
 *
 * Sources `default` and `sunday-guest` write locally only (must NOT stamp).
 */

import type { Persona } from './persona-config';
import type { PathwayProgress } from '../data/pathway-types';
import { recordStreakToday } from './streak';

export const GRACE_SERIES_PERSONA: Persona = 'new_to_faith';
export const GRACE_SERIES_TITLE = 'New & Returning to Faith';
export const GRACE_SERIES_TOTAL_DAYS = 40;
export const DAY1_BEGUN_KEY = 'dw_day1_begun';

const REAL_CHOICE_SOURCES = new Set(['onboarding', 'settings', 'upgrade']);

export function readSetup(): { persona?: string; source?: string } {
  try {
    return JSON.parse(localStorage.getItem('dw_setup') || '{}') || {};
  } catch {
    return {};
  }
}

export function readPathwayProgress(): PathwayProgress {
  try {
    const raw = JSON.parse(localStorage.getItem('dw_pathway_progress') || '{}');
    return {
      enrolled: !!raw.enrolled,
      currentDay: Number(raw.currentDay) || 1,
      completedDays: Array.isArray(raw.completedDays) ? raw.completedDays : [],
      lastCompletedDay: raw.lastCompletedDay,
      lastCompletedDate: raw.lastCompletedDate,
      totalDays: raw.totalDays,
      title: raw.title,
    };
  } catch {
    return { enrolled: false, currentDay: 1, completedDays: [] };
  }
}

/** True when this device has never made a real pathway/persona choice. */
export function isColdStart(): boolean {
  try {
    const setup = readSetup();
    if (setup.source && REAL_CHOICE_SOURCES.has(setup.source) && setup.persona) {
      return false;
    }
    if (setup.persona && localStorage.getItem('dw_v7_pathway_done') === 'true'
      && setup.source && REAL_CHOICE_SOURCES.has(setup.source)) {
      return false;
    }
    // Already mid-series — never reset them back to day 1.
    const progress = readPathwayProgress();
    if (progress.enrolled && (progress.completedDays.length > 0 || progress.currentDay > 1)) {
      return false;
    }
    if (!setup.persona) return true;
    if (!localStorage.getItem('dw_v7_pathway_done')) return true;
    return false;
  } catch {
    return true;
  }
}

export type ColdStartSource = 'default' | 'sunday-guest';

/**
 * If this is a cold device, write new_to_faith + enroll Day 1 of the
 * 40-day series. Returns true when it applied. Never stamps cloud
 * (source is always default / sunday-guest).
 */
export function startGraceSeriesIfCold(source: ColdStartSource = 'default'): boolean {
  if (!isColdStart()) return false;
  try {
    const setup = { persona: GRACE_SERIES_PERSONA, source };
    localStorage.setItem('dw_setup', JSON.stringify(setup));
    localStorage.setItem('dw_v7_pathway_done', 'true');

    ensureGraceSeriesEnrolled();

    if (!localStorage.getItem('dw_chapters_per_day')) {
      localStorage.setItem('dw_chapters_per_day', '1');
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Fill-only enroll in the 40-day New & Returning to Faith journey.
 * Does not change persona, does not reset a series already in progress,
 * and does not start catalog plan `faith-pathway` (that's 30-day Foundations).
 */
export function ensureGraceSeriesEnrolled(): void {
  try {
    const existing = readPathwayProgress();
    if (existing.enrolled) {
      if (!existing.totalDays || !existing.title) {
        localStorage.setItem('dw_pathway_progress', JSON.stringify({
          ...existing,
          totalDays: existing.totalDays || GRACE_SERIES_TOTAL_DAYS,
          title: existing.title || GRACE_SERIES_TITLE,
        }));
      }
      return;
    }
    const progress: PathwayProgress = {
      enrolled: true,
      currentDay: existing.currentDay || 1,
      completedDays: existing.completedDays || [],
      totalDays: GRACE_SERIES_TOTAL_DAYS,
      title: GRACE_SERIES_TITLE,
    };
    localStorage.setItem('dw_pathway_progress', JSON.stringify(progress));
  } catch { /* quota */ }
}

export function hasBegunDay1(): boolean {
  try { return localStorage.getItem(DAY1_BEGUN_KEY) === '1'; } catch { return false; }
}

/**
 * Superdesign Day 1 screen: first visit until they tap Begin Day 1.
 * Not shown after a real persona choice, mid-series progress, or a finished reading.
 */
export function needsDay1Landing(): boolean {
  if (hasBegunDay1()) return false;
  try {
    if (localStorage.getItem('dw_reading_done')) return false;
  } catch { /* ignore */ }
  const setup = readSetup();
  if (setup.source && REAL_CHOICE_SOURCES.has(setup.source) && setup.persona) return false;
  const progress = readPathwayProgress();
  if (progress.completedDays.length > 0 || (progress.currentDay || 1) > 1) return false;
  return true;
}

/** Enroll fill-only, then mark the locked landing as complete. */
export function beginDay1(source: ColdStartSource = 'default'): void {
  startGraceSeriesIfCold(source);
  try { localStorage.setItem(DAY1_BEGUN_KEY, '1'); } catch { /* quota */ }
}

/** After Begin Day 1: the Superdesign reading surface until they Mark as read. */
export function needsDay1Reading(): boolean {
  if (!hasBegunDay1()) return false;
  try {
    if (localStorage.getItem('dw_reading_done')) return false;
  } catch { /* ignore */ }
  const progress = readPathwayProgress();
  if (progress.completedDays.length > 0 || (progress.currentDay || 1) > 1) return false;
  return true;
}

/** Mark Day 1 read — stamps the day, advances the 40-day series, records streak. */
export function markDay1Read(): void {
  const today = new Date().toLocaleDateString('en-CA');
  try { localStorage.setItem('dw_reading_done', today); } catch { /* quota */ }
  try {
    const progress = readPathwayProgress();
    const day = progress.currentDay || 1;
    if (!progress.completedDays.includes(day)) {
      const next: PathwayProgress = {
        ...progress,
        enrolled: true,
        completedDays: [...progress.completedDays, day],
        currentDay: Math.min(GRACE_SERIES_TOTAL_DAYS, day + 1),
        lastCompletedDay: day,
        lastCompletedDate: today,
        totalDays: progress.totalDays || GRACE_SERIES_TOTAL_DAYS,
        title: progress.title || GRACE_SERIES_TITLE,
      };
      localStorage.setItem('dw_pathway_progress', JSON.stringify(next));
    }
  } catch { /* quota */ }
  recordStreakToday();
  try { window.dispatchEvent(new Event('dw-reading-completed')); } catch { /* ignore */ }
}

/** Read-and-strip church/homepage attribution. Does not invent numbers. */
export function consumeLandingParam(): string | null {
  try {
    const url = new URL(window.location.href);
    const from = url.searchParams.get('from') || url.searchParams.get('start');
    if (!from) return null;
    url.searchParams.delete('from');
    url.searchParams.delete('start');
    window.history.replaceState({}, '', url.toString());
    return from;
  } catch {
    return null;
  }
}
