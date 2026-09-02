/**
 * Sermon archive — the pastor Preach workspace's "past messages" list.
 *
 * Reads the same public `published_sermons` table as `currentSermon.ts`, via
 * `/.netlify/functions/published-sermon?list=1`. Every row the congregation's
 * current-sermon read already exposes, just more of them (newest first,
 * capped server-side at 200) — nothing here writes anything.
 *
 * Fetched once per session and memoised: the archive doesn't change under a
 * pastor's feet mid-session, and this can be called from more than one place
 * in the Preach workspace without re-fetching each time.
 */
import { localApiBase } from './api-base';
import type { SermonNotesData } from '../components/SermonNotesSurface';

export interface ArchivedSermon {
  id: string;
  is_current: boolean;
  published_at: string | null;
  sermon: SermonNotesData;
}

let cache: Promise<ArchivedSermon[]> | null = null;

function isArchivedSermon(row: unknown): row is ArchivedSermon {
  if (!row || typeof row !== 'object') return false;
  const r = row as Record<string, unknown>;
  return !!r.sermon && typeof r.sermon === 'object' && typeof (r.sermon as { id?: unknown }).id === 'string';
}

async function load(): Promise<ArchivedSermon[]> {
  try {
    const r = await fetch(`${localApiBase()}/.netlify/functions/published-sermon?list=1`);
    if (!r.ok) return [];
    const data = await r.json();
    const rows = Array.isArray(data?.sermons) ? data.sermons : [];
    return rows.filter(isArchivedSermon);
  } catch {
    return [];
  }
}

/** Fetch the sermon archive (newest first). Best-effort: never throws, an
 *  empty array means "couldn't load" or "nothing published yet" — callers
 *  show a muted empty state either way. Memoised for the session; call
 *  `resetSermonArchiveCache()` (tests only) to force a re-fetch. */
const CACHE_TTL_MS = 60_000;
let cachedAt = 0;
export function fetchSermonArchive(): Promise<ArchivedSermon[]> {
  if (!cache || Date.now() - cachedAt > CACHE_TTL_MS) { cache = load(); cachedAt = Date.now(); }
  return cache;
}

/** Forget the memo — after a publish, so the new message shows up at once. */
export function invalidateSermonArchive(): void {
  cache = null;
  cachedAt = 0;
}

/** Test-only alias. */
export function resetSermonArchiveCache(): void {
  invalidateSermonArchive();
}

const REF_RE = /\b([1-3]\s?[A-Z][a-z]+(?:\s[A-Z][a-z]+)?|[A-Z][a-z]+(?:\s[A-Z][a-z]+)?)\s(\d{1,3})(?::(\d{1,3})(?:-(\d{1,3}))?)?\b/g;

function sectionText(sermon: SermonNotesData): string[] {
  const out: string[] = [];
  for (const section of sermon.sections || []) {
    if (section.title) out.push(section.title);
    for (const item of section.content || []) {
      if ('value' in item && item.value) out.push(item.value);
      if (item.type === 'blank') {
        if (item.before) out.push(item.before);
        if (item.after) out.push(item.after);
      }
      if (item.type === 'quote') {
        if (item.text) out.push(item.text);
        if (item.ref) out.push(item.ref);
      }
    }
  }
  return out;
}

function collectText(sermon: SermonNotesData): string[] {
  const out: string[] = [];
  if (sermon.title) out.push(sermon.title);
  if (sermon.series) out.push(sermon.series);
  if (sermon.speaker) out.push(sermon.speaker);
  if (sermon.keyVerse) out.push(sermon.keyVerse);
  if (sermon.keyVerseText) out.push(sermon.keyVerseText);
  out.push(...sectionText(sermon));
  return out;
}

/** Scripture references found in a sermon's key verse and section text —
 *  simple "Book C" / "Book C:V" / "Book C:V-V" matching, de-duplicated,
 *  in first-seen order. Used for the archive card's passage line and for
 *  matching a typed reference in search. */
export function sermonPassages(sermon: SermonNotesData): string[] {
  const haystacks = [sermon.keyVerse || '', ...sectionText(sermon)];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const text of haystacks) {
    REF_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = REF_RE.exec(text))) {
      const ref = m[0].trim();
      const key = ref.toLowerCase();
      if (!seen.has(key)) { seen.add(key); out.push(ref); }
    }
  }
  return out;
}

function normalizeRefQuery(query: string): { book: string; chapter: string } | null {
  const m = /^\s*([1-3]?\s?[A-Za-z]+(?:\s[A-Za-z]+)?)\s+(\d{1,3})\s*$/.exec(query);
  if (!m) return null;
  return { book: m[1].replace(/\s+/g, ' ').trim().toLowerCase(), chapter: m[2] };
}

function refMatchesQuery(ref: string, parsed: { book: string; chapter: string }): boolean {
  const m = /^([1-3]?\s?[A-Za-z]+(?:\s[A-Za-z]+)?)\s(\d{1,3})/.exec(ref);
  if (!m) return false;
  const book = m[1].replace(/\s+/g, ' ').trim().toLowerCase();
  const chapter = m[2];
  return book === parsed.book && chapter === parsed.chapter;
}

/** Pure search over an already-fetched archive: case-insensitive substring
 *  match across title, series, speaker, keyVerse, and every section content
 *  item's text, plus a scripture reference typed like "Romans 8" matched
 *  against keyVerse and section text via `sermonPassages`. Empty query
 *  returns the full list. Result stays newest-first (the input order). */
export function searchSermons(list: ArchivedSermon[], query: string): ArchivedSermon[] {
  const q = query.trim().toLowerCase();
  if (!q) return list;
  const parsedRef = normalizeRefQuery(q);
  return list.filter((row) => {
    const haystack = collectText(row.sermon).join(' • ').toLowerCase();
    if (haystack.includes(q)) return true;
    if (parsedRef) {
      return sermonPassages(row.sermon).some((ref) => refMatchesQuery(ref, parsedRef));
    }
    return false;
  });
}
