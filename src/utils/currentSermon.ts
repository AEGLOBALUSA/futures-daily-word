/**
 * Current weekly sermon outline.
 *
 * `public/sermons/latest.json` is the live feed. A missing file (or a body
 * without an `id`) means there is no published message this week — callers
 * must not invent a placeholder. Past sermons live under
 * `public/sermons/archive/` and are not auto-fed into Notes or the Sunday
 * workspace.
 */

export interface CurrentSermonMeta {
  id: string;
  title?: string;
  series?: string;
  date?: string;
  speaker?: string;
  commitments?: string[];
}

/** Fetch the published current sermon, or null if none is posted. */
export async function fetchCurrentSermon<T extends { id: string } = CurrentSermonMeta>(): Promise<T | null> {
  try {
    const r = await fetch('/sermons/latest.json');
    if (!r.ok) return null;
    const data = await r.json();
    if (!data || typeof data !== 'object' || typeof (data as CurrentSermonMeta).id !== 'string' || !(data as CurrentSermonMeta).id) {
      return null;
    }
    return data as T;
  } catch {
    return null;
  }
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
