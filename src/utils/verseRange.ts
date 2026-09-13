/**
 * Pure verse-range helpers for serving a Day N reading as an assigned
 * verse range (e.g. "8-9") instead of the whole chapter.
 *
 * No React, no localStorage, no network — safe to unit test in isolation.
 */
import { parseVerses } from './parseVerses';

export interface VerseRange {
  start: number;
  end: number;
}

/**
 * Parse a spec like '8-9', '30', '1-3,6', ' 8 - 9 ' into a list of
 * inclusive verse ranges. Returns [] for undefined/empty/garbage input.
 */
export function parseVerseRange(spec?: string): VerseRange[] {
  if (!spec || !spec.trim()) return [];

  const ranges: VerseRange[] = [];
  const segments = spec.split(',');

  for (const segment of segments) {
    const trimmed = segment.trim();
    if (!trimmed) continue;

    const match = trimmed.match(/^(\d+)\s*(?:-\s*(\d+))?$/);
    if (!match) continue;

    const start = parseInt(match[1], 10);
    const end = match[2] !== undefined ? parseInt(match[2], 10) : start;
    if (Number.isNaN(start) || Number.isNaN(end) || end < start) continue;

    ranges.push({ start, end });
  }

  return ranges;
}

/**
 * Slice a chapter's raw text (with [N] verse markers) down to the verses
 * named by spec, keeping the original '[N] ' markers on kept verses and
 * joining them with a single space.
 *
 * Returns null when the range could not be applied — an empty/invalid spec
 * (contract: empty/undefined spec is "no range asked for", so it returns the
 * whole text unchanged rather than null), or when none of the named verses
 * are present in the text (no [N] markers at all, or the chapter is served
 * short of the named verses). Callers must fall back to the whole-chapter
 * presentation on null — never print a ranged heading over unsliced text.
 */
export function sliceVerseRange(text: string, spec?: string): string | null {
  if (!spec || !spec.trim()) return text;

  const ranges = parseVerseRange(spec);
  if (ranges.length === 0) return text;

  const verses = parseVerses(text);
  const kept = verses.filter((v) =>
    ranges.some((r) => v.verse >= r.start && v.verse <= r.end)
  );

  if (kept.length === 0) return null;

  return kept.map((v) => `[${v.verse}] ${v.text}`).join(' ');
}

/**
 * Build a human reference like 'Ephesians 2:8-9' or 'Ephesians 2'
 * (no verses given).
 */
export function rangeRef(book: string, chapter: number, verses?: string): string {
  if (verses && verses.trim()) {
    return `${book} ${chapter}:${verses.trim()}`;
  }
  return `${book} ${chapter}`;
}
