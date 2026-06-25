/**
 * Typed localStorage layer.
 *
 * The app reads/writes ~45 raw localStorage keys inline across hundreds of call
 * sites, which is how the theme split-brain bug crept in (one place read 'theme'
 * while another wrote 'dw_dark'). This module is the single registry of keys plus
 * small typed helpers. New code should go through here; existing call sites can be
 * migrated incrementally.
 *
 * Every value still lives in localStorage exactly as before — this is a thin,
 * compatible wrapper, not a new storage format.
 */
import { useCallback, useEffect, useState } from 'react';

/** The canonical name for every persisted key. Add keys here, never inline strings. */
export const LS = {
  // identity / profile
  profile:            'dw_profile',
  profilePic:         'dw_profile_pic',
  setup:             'dw_setup',
  // theme / display
  dark:               'dw_dark',
  fontSize:           'dw_font_size',
  lang:               'dw_lang',
  translation:        'dw_translation',
  translationManual:  'dw_translation_manual',
  // study data
  journal:            'dw_journal',
  highlights:         'dw_highlights',
  reactions:          'dw_reactions',
  // plans / progress
  activePlans:        'dw_activeplans',
  bookPlans:          'dw_book_plans',
  pathwayProgress:    'dw_pathway_progress',
  streak:             'dw_streak_v2',
  // misc personal context
  userStory:          'dw_user_story',
  prayedFor:          'dw_prayed_for',
  sermonNotes:        'dw_sermon_notes',
} as const;

export type StorageKey = (typeof LS)[keyof typeof LS] | (string & {});

/** Read + JSON.parse a key, returning `fallback` on missing/corrupt data. */
export function readJSON<T>(key: StorageKey, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw == null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/** JSON.stringify + write a key. Returns false if storage threw (e.g. quota). */
export function writeJSON(key: StorageKey, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function readString(key: StorageKey, fallback = ''): string {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

export function writeString(key: StorageKey, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function remove(key: StorageKey): void {
  try { localStorage.removeItem(key); } catch { /* ignore */ }
}

/** The signed-in user's email, or '' — collapses the repeated dw_profile parse. */
export function getProfileEmail(): string {
  return readJSON<{ email?: string }>(LS.profile, {}).email || '';
}

/**
 * React state bound to a JSON localStorage key. Reads once on mount and writes
 * on change. Use for new components; not a migration requirement for old ones.
 */
export function useLocalStorage<T>(key: StorageKey, initial: T): [T, (v: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => readJSON<T>(key, initial));

  const set = useCallback((v: T | ((prev: T) => T)) => {
    setValue(prev => {
      const next = typeof v === 'function' ? (v as (p: T) => T)(prev) : v;
      writeJSON(key, next);
      return next;
    });
  }, [key]);

  // Keep multiple hook instances of the same key loosely in sync across the tab.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === key && e.newValue != null) {
        try { setValue(JSON.parse(e.newValue) as T); } catch { /* ignore */ }
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [key]);

  return [value, set];
}
