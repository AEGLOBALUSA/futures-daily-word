/**
 * Current weekly sermon outline.
 *
 * Live feed is whatever Ashley approved from staff intake
 * (`/api/published-sermon`). `public/sermons/latest.json` remains a fallback
 * for a static file if one is committed. A missing feed (or a body without an
 * `id`) means there is no published message this week — callers must not
 * invent a placeholder. Past sermons live under `public/sermons/archive/`.
 */

import { localApiBase } from './api-base';

export interface CurrentSermonMeta {
  id: string;
  title?: string;
  series?: string;
  date?: string;
  speaker?: string;
  commitments?: string[];
}

function pickSermon<T extends { id: string }>(data: unknown): T | null {
  if (!data || typeof data !== 'object') return null;
  const obj = data as Record<string, unknown>;
  const inner = obj.sermon;
  const candidate = (inner && typeof inner === 'object' ? inner : obj) as T;
  if (candidate && typeof candidate.id === 'string' && candidate.id) return candidate;
  return null;
}

async function trySermon<T extends { id: string }>(url: string): Promise<T | null> {
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    return pickSermon<T>(await r.json());
  } catch {
    return null;
  }
}

/** Fetch the published current sermon, or null if none is posted. */
export async function fetchCurrentSermon<T extends { id: string } = CurrentSermonMeta>(): Promise<T | null> {
  const fromApi = await trySermon<T>(`${localApiBase()}/api/published-sermon`);
  if (fromApi) return fromApi;
  return trySermon<T>('/sermons/latest.json');
}

/** localStorage bag id for sermon-workspace notes. Uses the published sermon
 *  id when one exists; otherwise a per-day open note so Sunday still has a
 *  place to write without a broken empty outline. */
export function openSermonNotesId(sermonId?: string | null): string {
  if (sermonId) return sermonId;
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `open_${y}-${m}-${day}`;
}
