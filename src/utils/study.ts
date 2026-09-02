/**
 * Client for the study data layer (netlify/functions/study.js) — the
 * public-domain / Creative Commons reference data behind the pastor's prep
 * sheet, the Greek/Hebrew popup and the Sources screen. Every response is
 * immutable between data loads, so results are memoised for the session.
 */
import { localApiBase } from './api-base';

export interface StudyCrossRef { ref: string; votes: number }
export interface StudyCommentaryEntry { verseFrom: number; verseTo: number; content: string }
/** In the passage response (summary depth) `entries` is empty and `count` + `preview`
 *  describe the source; fetchStudyCommentary() returns the entries in full. */
export interface StudyCommentary { sourceId: string; entries: StudyCommentaryEntry[]; count?: number; preview?: string }
export interface StudyWord {
  verse: number; position: number; word: string; lemma: string | null; strongs: string | null;
  morph: string | null; gloss: string | null; translit: string | null;
}
export interface StudyLexiconEntry {
  strongs: string; language: string; lemma: string; translit: string | null; pronunciation: string | null;
  gloss: string | null; definition: string | null; usage: string | null; source_id?: string;
}
export interface StudyPlace { id: string; name: string; lat: number | null; lon: number | null; description: string | null; refs: string[]; source_id: string }
export interface StudyPerson { id: string; name: string; description: string | null; refs: string[]; source_id: string }
export interface StudyIllustration { id: string; topic: string; title: string | null; body: string; refs: string[]; source_id: string }
export interface StudySource {
  id: string; name: string; licence: string; attribution: string; url: string | null;
  share_alike: boolean; language: string; loaded_at: string | null; record_count: number | null;
}
export interface StudyPassage {
  ref: string; book: string; chapter: number; verse: number | null; verseEnd: number | null; testament: 'OT' | 'NT';
  crossRefs: { verse: number; refs: StudyCrossRef[] }[];
  commentary: StudyCommentary[];
  words: StudyWord[];
  lexicon: Record<string, StudyLexiconEntry>;
  places: StudyPlace[];
  people: StudyPerson[];
  topics: string[];
  illustrations: StudyIllustration[];
}
export interface TaggedVerse { verse: number; words: { w: string; s: string[] }[]; source_id: string }

const cache = new Map<string, Promise<unknown>>();

async function get<T>(params: Record<string, string>): Promise<T | null> {
  const qs = new URLSearchParams(params).toString();
  const key = qs;
  const hit = cache.get(key) as Promise<T | null> | undefined;
  if (hit) return hit;
  const p = (async () => {
    try {
      // The study function lives on THIS deploy (like intake and published-sermon):
      // relative on the app origin and on previews so the Vite proxy / preview
      // functions answer; absolute only when the SPA is proxied on futures.church.
      const res = await fetch(`${localApiBase()}/api/study?${qs}`);
      if (!res.ok) return null;
      return (await res.json()) as T;
    } catch {
      return null;
    }
  })();
  cache.set(key, p);
  p.then(v => { if (v === null) cache.delete(key); });
  return p;
}

/** Everything held about a passage ("Romans 8", "Romans 8:1-4"). */
export function fetchStudyPassage(ref: string, opts?: { depth?: 'summary' | 'full'; commentary?: string[] }): Promise<StudyPassage | null> {
  const params: Record<string, string> = { ref, depth: opts?.depth || 'full' };
  if (opts?.commentary?.length) params.commentary = opts.commentary.join(',');
  return get<StudyPassage>(params);
}

/** Every entry of ONE commentary on a passage (the passage response only carries previews). */
export async function fetchStudyCommentary(ref: string, sourceId: string): Promise<StudyCommentaryEntry[]> {
  const r = await get<{ ref: string; commentary: StudyCommentary[] }>({ ref, only: 'commentary', commentary: sourceId });
  return r?.commentary?.[0]?.entries || [];
}

/** One Strong's number → lexicon entry, or null when the layer has none. */
export function fetchLexiconEntry(strongs: string): Promise<StudyLexiconEntry | null> {
  return get<StudyLexiconEntry>({ strongs });
}

/** English words → Strong's numbers for a chapter (public-domain tagged Bible). */
export function fetchTaggedChapter(ref: string): Promise<{ ref: string; testament: 'OT' | 'NT'; verses: TaggedVerse[] } | null> {
  return get({ words: ref });
}

export function searchIllustrations(query: string, limit = 12): Promise<{ query: string; illustrations: StudyIllustration[] } | null> {
  return get({ illustrations: query, limit: String(limit) });
}

export function fetchLectionary(year: 'A' | 'B' | 'C', slug?: string): Promise<{ year: string; entries: { year: string; slug: string; name: string; season: string | null; readings: { kind: string; ref: string }[]; source_id: string }[] } | null> {
  const params: Record<string, string> = { lectionary: year };
  if (slug) params.slug = slug;
  return get(params);
}

/** Every loaded source with the attribution its licence requires. */
export function fetchStudySources(): Promise<{ sources: StudySource[] } | null> {
  return get({ sources: '1' });
}

/** Human names for the commentary source ids (the loader writes the same ids). */
export const COMMENTARY_NAMES: Record<string, string> = {
  'helloao-matthew-henry': 'Matthew Henry',
  'helloao-jfb': 'Jamieson, Fausset & Brown',
  'helloao-gill': 'John Gill',
  'helloao-clarke': 'Adam Clarke',
  'helloao-calvin': 'John Calvin',
  'helloao-keil-delitzsch': 'Keil & Delitzsch',
};
