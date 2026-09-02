/**
 * OpenBible.info cross-references → study_crossrefs.
 * Source: https://a.openbible.info/data/cross-references.zip (CC BY 4.0).
 * TSV: "From Verse\tTo Verse\tVotes" + a 4-cell header row (the 4th cell is the
 * licence/date comment). From is always one verse (OSIS Book.C.V); To is a verse
 * or a fully-qualified range "Ps.148.4-Ps.148.5". Votes are signed integers.
 */
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { CACHE_DIR, fetchCached, parseRef, upsertBatches, recordSource, clearSource } from './common.mjs';

export const SOURCE = {
  id: 'openbible-crossrefs',
  name: 'OpenBible.info cross-references',
  licence: 'CC BY 4.0',
  attribution: 'Cross-reference data from OpenBible.info (openbible.info/labs/cross-references), licensed under CC BY 4.0. Derived primarily from the public-domain Treasury of Scripture Knowledge.',
  url: 'https://www.openbible.info/labs/cross-references/',
  share_alike: false,
  language: 'en',
};

const ZIP_URL = 'https://a.openbible.info/data/cross-references.zip';

function parseSide(raw) {
  // "Ps.148.4-Ps.148.5" → start/end; both ends fully qualified.
  const [a, b] = String(raw).split('-');
  const from = parseRef(a);
  if (!from) return null;
  if (!b) return { ...from, verseEnd: null };
  const to = parseRef(b);
  // A range that leaves the chapter (or book) is kept as its first verse.
  if (to && to.book === from.book && to.chapter === from.chapter && to.verse >= from.verse) return { ...from, verseEnd: to.verse };
  return { ...from, verseEnd: null };
}

export async function load(client, { dryRun = false } = {}) {
  await fetchCached(ZIP_URL, 'cross-references.zip', { binary: true });
  const tsv = execFileSync('unzip', ['-p', join(CACHE_DIR, 'cross-references.zip'), 'cross_references.txt'], { maxBuffer: 64 * 1024 * 1024 }).toString('utf8');
  const lines = tsv.split('\n');
  const rows = new Map();
  let skipped = 0;
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    const [fromRaw, toRaw, votesRaw] = line.split('\t');
    const from = parseRef(fromRaw);
    const to = parseSide(toRaw);
    if (!from || !to || !from.verse || !to.verse) { skipped++; continue; }
    const key = `${from.book}|${from.chapter}|${from.verse}|${to.book}|${to.chapter}|${to.verse}`;
    const votes = Number(votesRaw) || 0;
    const prev = rows.get(key);
    if (prev && prev.votes >= votes) continue; // duplicate target: keep the better-voted row
    rows.set(key, {
      source_id: SOURCE.id,
      book: from.book, chapter: from.chapter, verse: from.verse,
      to_book: to.book, to_chapter: to.chapter, to_verse: to.verse, to_verse_end: to.verseEnd,
      votes,
    });
  }
  const list = [...rows.values()];
  process.stdout.write(`  crossrefs: ${list.length} rows parsed, ${skipped} skipped\n`);
  if (dryRun) return list.length;
  await recordSource(client, SOURCE, null);
  await clearSource(client, 'study_crossrefs', SOURCE.id);
  await upsertBatches(client, 'study_crossrefs', list, { batch: 2000 });
  await recordSource(client, SOURCE, list.length);
  return list.length;
}
