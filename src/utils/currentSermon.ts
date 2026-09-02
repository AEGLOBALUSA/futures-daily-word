/**
 * Current weekly sermon outline.
 *
 * Production live feed is whatever Ashley approved from staff intake
 * (`/api/published-sermon`). Deploy-preview may load the static SAMPLE at
 * `public/sermons/sample.json` so previews can show congregation notes without
 * writing into the shared published_sermons table. Production never reads
 * `latest.json` or `sample.json`. A missing feed (or a body without an `id`)
 * means there is no published message this week — callers must not invent a
 * placeholder. Past sermons live under `public/sermons/archive/`.
 */

import { localApiBase } from './api-base';
import { getCongregation } from './congregation';
import type { CongregationId } from '../data/congregations';

export interface CurrentSermonMeta {
  id: string;
  title?: string;
  series?: string;
  date?: string;
  speaker?: string;
  commitments?: string[];
  youtubeUrl?: string;
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

function isDeployPreview(): boolean {
  return typeof location !== 'undefined' && /deploy-preview/i.test(location.hostname);
}

/** Fetch the published current sermon, or null if none is posted.
 *  Deploy-preview builds prefer the static SAMPLE in sample.json so we never
 *  write fake notes into the shared published_sermons table. Production uses
 *  `/api/published-sermon` only — never a static file. */
export async function fetchCurrentSermon<T extends { id: string } = CurrentSermonMeta>(congregation?: CongregationId): Promise<T | null> {
  if (isDeployPreview()) {
    const fromFile = await trySermon<T>('/sermons/sample.json');
    if (fromFile) return fromFile;
  }
  // One current message per congregation (Futures USA / Australia / Futuros USA).
  const c = congregation || getCongregation();
  return trySermon<T>(`${localApiBase()}/api/published-sermon?congregation=${encodeURIComponent(c)}`);
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
