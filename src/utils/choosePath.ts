/**
 * "Choose your path" — the one chooser sheet, reached from three doors, never a
 * gate (Ashley, 2 Sep 2026). This module is the shared, React-free half:
 *  - the five paths in order, with their i18n keys;
 *  - the door → sheet event bus (any surface asks the App-level sheet to open);
 *  - the asked-once flag (`dw_path_asked`) that rides the misc bag cross-device;
 *  - the source rule: the first real choice is 'onboarding', a later change is
 *    'settings' — never 'default' (coldStart's REAL_CHOICE_SOURCES).
 */
import type { Persona } from './persona-config';
import { syncMisc } from './cloudSync';
import { isRealChoiceSource, PATH_ASKED_KEY } from './coldStart';

export type PathDoor = 'landing' | 'home' | 'asked' | 'settings';

export interface PathOption {
  id: Persona;
  /** Headline in the person's own words. */
  headKey: string;
  /** One line saying what it opens on. */
  promiseKey: string;
  /** The single sage CTA names the destination. */
  ctaKey: string;
  /** Short label for the Home path swatch. */
  shortKey: string;
  /** Existing persona label (Settings row, aria). */
  labelKey: string;
}

export const PATHS: readonly PathOption[] = [
  { id: 'new_to_faith', headKey: 'path_new_head', promiseKey: 'path_new_promise', ctaKey: 'path_new_cta', shortKey: 'path_short_new', labelKey: 'persona_new' },
  { id: 'congregation', headKey: 'path_member_head', promiseKey: 'path_member_promise', ctaKey: 'path_member_cta', shortKey: 'path_short_member', labelKey: 'persona_member' },
  { id: 'deeper_study', headKey: 'path_study_head', promiseKey: 'path_study_promise', ctaKey: 'path_study_cta', shortKey: 'path_short_study', labelKey: 'persona_study' },
  { id: 'pastor_leader', headKey: 'path_leader_head', promiseKey: 'path_leader_promise', ctaKey: 'path_leader_cta', shortKey: 'path_short_leader', labelKey: 'persona_leader' },
  { id: 'comfort', headKey: 'path_comfort_head', promiseKey: 'path_comfort_promise', ctaKey: 'path_comfort_cta', shortKey: 'path_short_comfort', labelKey: 'persona_comfort' },
] as const;

export function pathFor(persona: string | null | undefined): PathOption {
  return PATHS.find(p => p.id === persona) || PATHS[1];
}

/** A door asks the App-level sheet to open. Day1Landing hosts its own sheet
 *  (it renders instead of the app tree), so it does not go through this. */
export const CHOOSE_PATH_EVENT = 'dw-choose-path';
export function openChoosePath(door: PathDoor): void {
  try { window.dispatchEvent(new CustomEvent(CHOOSE_PATH_EVENT, { detail: { door } })); } catch { /* ignore */ }
}

/** First real choice → 'onboarding'; a change after a real choice → 'settings'. */
export function choiceSourceFor(currentSource: string | undefined): 'onboarding' | 'settings' {
  return isRealChoiceSource(currentSource) ? 'settings' : 'onboarding';
}

export function hasPathBeenAsked(): boolean {
  try { return localStorage.getItem(PATH_ASKED_KEY) === '1'; } catch { return false; }
}

/** Door 3 has been shown (or a real choice was made) — never again, on any device. */
export function markPathAsked(): void {
  syncMisc(PATH_ASKED_KEY, '1');
}
