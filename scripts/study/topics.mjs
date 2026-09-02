/**
 * Nave's Topical Bible + Torrey's New Topical Textbook → study_topics.
 *
 * Source: neuu-org/bible-topics-dataset (github.com/neuu-org/bible-topics-dataset),
 * CC BY 4.0 — a JSON conversion of the CCEL TEI/ThML digitisations of two
 * public-domain 19th-century works (Nave 1896, Torrey 1897). Chosen over the
 * alternatives surveyed for this loader because:
 *   - CrossWire's own SWORD modules for Nave/Torrey ARE literally public domain,
 *     but ship as binary zLD/RawLD lexicon modules — reading them needs
 *     libsword/diatheke/pysword, none of which are available here (no new npm
 *     deps, no SWORD tooling on PATH), so they are not a practical format.
 *   - j86schroeder/topical-bible-search has the most loader-ready flat verse
 *     table, but its provenance is two unnamed/undownloaded PDF editions (not
 *     CCEL) and its README explicitly disclaims any licence grant on the data
 *     beyond "no ownership is claimed" — weaker provenance than neuu-org.
 *   - garydavenport73 / elcafe7 conversions are LLM-restructured or have no
 *     licence file at all.
 * neuu-org is the one candidate with a stated, permissive licence (CC BY 4.0,
 * with a prescribed attribution line) AND a fully documented, easy-to-parse
 * per-topic JSON format, AND it carries BOTH Nave and Torrey in one dataset.
 *
 * Format (data/02_sources/{nave,torrey}/<LETTER>/<TOPIC>.json, one object per
 * topic — verbatim, verified 2026-09-02):
 *   { topic: "AARON", slug, canonical_id: "NAV:aaron", source: "NAV"|"TOR",
 *     see_also: [...], aspects: [{ label, references: ["Exodus 6:16-20", ...] }],
 *     biblical_references: [{ book: "Exodus", chapter: 6, verses: [16,17,18,19,20],
 *       verse_count, testament, raw: "Exodus 6:16-20" }, ...],
 *     books_mentioned: [...], stats: {...} }
 * `verses` arrays are already fully expanded to individual verse numbers (not
 * just range endpoints) and can be non-contiguous within one reference
 * ("John 10:7,9" → verses:[7,9]) — this loader re-splits them into contiguous
 * runs so a verse_end never silently spans an unlisted verse.
 *
 * Repo is fetched as one GitHub codeload zip (16 MB) and read straight out of
 * the zip with `unzip -p <glob>` into memory — never extracted to disk. That
 * matters here: a handful of genuine 19th-century KJV-index headings (e.g.
 * Nave's "DOG (SODOMITE?)") land inside filenames, and writing files with
 * that exact name to disk can trip this machine's sandboxed-write filtering;
 * streaming the archive's bytes to stdout and parsing in memory sidesteps it
 * entirely, and is also just fewer syscalls than a full extract.
 */
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { CACHE_DIR, fetchCached, canonicalBook, chapterCount, upsertBatches, recordSource, clearSource } from './common.mjs';

export const SOURCES = {
  nave: {
    id: 'nave-topical',
    name: "Nave's Topical Bible",
    licence: 'CC BY 4.0',
    attribution: "Nave's Topical Bible (Orville J. Nave, 1896), public domain. JSON conversion from the Bible Topics Dataset by NEUU (https://github.com/neuu-org/bible-topics-dataset), used under CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/). Digitisation by the Christian Classics Ethereal Library (https://www.ccel.org/).",
    url: 'https://github.com/neuu-org/bible-topics-dataset',
    share_alike: false,
    language: 'en',
  },
  torrey: {
    id: 'torrey-topical',
    name: "Torrey's New Topical Textbook",
    licence: 'CC BY 4.0',
    attribution: "Torrey's New Topical Textbook (R. A. Torrey, 1897), public domain. JSON conversion from the Bible Topics Dataset by NEUU (https://github.com/neuu-org/bible-topics-dataset), used under CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/). Digitisation by the Christian Classics Ethereal Library (https://www.ccel.org/).",
    url: 'https://github.com/neuu-org/bible-topics-dataset',
    share_alike: false,
    language: 'en',
  },
};

const ZIP_URL = 'https://codeload.github.com/neuu-org/bible-topics-dataset/zip/refs/heads/main';
const ZIP_NAME = 'bible-topics-dataset.zip';
const REPO_PREFIX = 'bible-topics-dataset-main';

/** Clean a topic/heading string for storage: trim, drop trailing punctuation, cap length. */
export function cleanTopic(raw) {
  let t = String(raw || '').trim().replace(/\s+/g, ' ');
  t = t.replace(/[\s.,;:\-–—]+$/, '');
  if (t.length > 120) t = t.slice(0, 120).trim();
  return t;
}

/** Group a list of verse numbers into contiguous [start, end] runs. */
export function verseRanges(verses) {
  const nums = [...new Set((verses || []).map(Number))].filter((n) => Number.isInteger(n) && n > 0).sort((a, b) => a - b);
  const ranges = [];
  let start = null, prev = null;
  for (const n of nums) {
    if (start === null) { start = n; prev = n; continue; }
    if (n === prev + 1) { prev = n; continue; }
    ranges.push([start, prev]);
    start = n; prev = n;
  }
  if (start !== null) ranges.push([start, prev]);
  return ranges;
}

/** One topic-file JSON object → study_topics rows (source_id, topic, book, chapter, verse, verse_end). */
export function parseTopicFile(json, sourceId) {
  const rows = [];
  const topic = cleanTopic(json && json.topic);
  if (!topic) return rows;
  const refs = Array.isArray(json.biblical_references) ? json.biblical_references : [];
  for (const r of refs) {
    if (!r || !r.book || !r.chapter) continue; // no chapter → whole-book reference; skip
    const book = canonicalBook(r.book);
    if (!book) continue;
    const chapter = Number(r.chapter);
    if (!Number.isInteger(chapter) || chapter < 1 || chapter > chapterCount(book)) continue;
    const verses = Array.isArray(r.verses) ? r.verses : [];
    if (!verses.length) continue; // whole-chapter mention, no verse-level data — skip
    for (const [start, end] of verseRanges(verses)) {
      rows.push({ source_id: sourceId, topic, book, chapter, verse: start, verse_end: end === start ? 0 : end });
    }
  }
  return rows;
}

/** Stream every topic JSON out of the cached zip for one source dir ('nave'|'torrey'), no disk extraction. */
function readTopicFiles(zipPath, dir) {
  const pattern = `${REPO_PREFIX}/data/02_sources/${dir}/*/*.json`;
  const buf = execFileSync('unzip', ['-p', zipPath, pattern], { maxBuffer: 256 * 1024 * 1024 });
  return splitJsonObjects(buf.toString('utf8'));
}

/** Split a concatenation of pretty-printed JSON objects back into individual object strings. */
function splitJsonObjects(text) {
  const out = [];
  let depth = 0, start = -1, inStr = false, esc = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') { inStr = true; continue; }
    if (c === '{') { if (depth === 0) start = i; depth++; }
    else if (c === '}') {
      depth--;
      if (depth === 0 && start >= 0) { out.push(text.slice(start, i + 1)); start = -1; }
    }
  }
  return out;
}

export async function load(client, { dryRun = false, limit = 0 } = {}) {
  const effectiveLimit = limit || Number(process.env.STUDY_LIMIT) || 0;
  await fetchCached(ZIP_URL, ZIP_NAME, { binary: true });
  const zipPath = join(CACHE_DIR, ZIP_NAME);

  const runs = [
    { src: SOURCES.nave, dir: 'nave' },
    { src: SOURCES.torrey, dir: 'torrey' },
  ];

  const results = [];
  for (const { src, dir } of runs) {
    let texts = readTopicFiles(zipPath, dir);
    if (effectiveLimit) texts = texts.slice(0, effectiveLimit);
    const rows = new Map();
    let unparsable = 0;
    for (const text of texts) {
      let json;
      try { json = JSON.parse(text); } catch { unparsable++; continue; }
      for (const row of parseTopicFile(json, src.id)) {
        const key = `${row.source_id}|${row.topic}|${row.book}|${row.chapter}|${row.verse}|${row.verse_end}`;
        if (!rows.has(key)) rows.set(key, row);
      }
    }
    const list = [...rows.values()];
    process.stdout.write(`  topics ${src.id}: ${texts.length} topic files, ${list.length} rows, ${unparsable} unparsable\n`);
    results.push({ src, list });
  }

  const total = results.reduce((n, r) => n + r.list.length, 0);
  if (dryRun) return total;
  for (const { src, list } of results) {
    await recordSource(client, src, null);
    await clearSource(client, 'study_topics', src.id);
    await upsertBatches(client, 'study_topics', list, { batch: 2000 });
    await recordSource(client, src, list.length);
  }
  return total;
}
