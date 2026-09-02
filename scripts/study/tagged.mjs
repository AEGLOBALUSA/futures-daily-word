/**
 * Word-level Strong's tagging → study_tagged_english.
 * Source: eBible.org's World English Bible, updated 66-book edition ("engwebp"),
 * USFM 3.1: https://ebible.org/Scriptures/engwebp_usfm.zip (public domain text;
 * "World English Bible" is a trademark of eBible.org — see SOURCE.attribution).
 * Its USFM tags nearly every word with \w word|strong="H1234"\w* (Old Testament,
 * Hebrew/Aramaic H-numbers) or \w word|strong="G1234"\w* (New Testament, Greek
 * G-numbers); words of Jesus are additionally wrapped in \wj...\wj*, and inside
 * that wrapper the SAME per-word tag is spelled \+w word|strong="..."\+w* instead
 * of \w...\w* (nesting rule — \w may not nest inside \wj, so the source reuses
 * \+w). Untagged connective words (articles supplied by the translator, etc.)
 * are left as plain text and are stored with an empty strongs array.
 *
 * Verified (2026-09-02) against the actual downloaded USFM:
 *  - Footnotes (\f + \fr ... \ft ... \f*) and any cross-refs (\x ... \x*) are
 *    stripped whole — they are translator apparatus, not Bible text.
 *  - Psalm titles (\d ...) sit between \c N and \v 1 with no verse number of
 *    their own; they are folded into verse 1's word list (nothing else in the
 *    text can carry them), matching how eBible's own VPL export treats them.
 *  - Poetry/section markers (\q1 \q2 \p \m \s1 \ms1 \qs \qs* \wj \wj* …) are
 *    stripped as bare markers; their text stays.
 *  - A tag boundary sometimes falls mid-word with NO surrounding whitespace —
 *    e.g. "hasn’\w t|strong="G3588"\w* overcome" (WEB splits "hasn't" so only
 *    the "t" carries a Strong's number) and "\+w Father|strong="G3962"\+w*’s"
 *    (the possessive "'s" trails the tag with no space). Gluing on whitespace
 *    boundaries (not tag boundaries) reassembles these as one word ("hasn’t",
 *    "Father’s") carrying whatever Strong's numbers touched any part of it.
 */
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { CACHE_DIR, fetchCached, BOOKS, canonicalBook, upsertBatches, recordSource, clearSource } from './common.mjs';

export const SOURCE = {
  id: 'ebible-web-strongs',
  name: "World English Bible (WEB), Strong's-tagged USFM",
  licence: 'Public domain; "World English Bible" is a trademark of eBible.org',
  attribution: 'The World English Bible is in the Public Domain. That means that it is not copyrighted. However, "World English Bible" is a Trademark of eBible.org. Word-level Strong\'s numbers are as tagged in eBible.org\'s USFM edition (ebible.org/web/).',
  url: 'https://ebible.org/web/copyright.htm',
  share_alike: false,
  language: 'en',
};

const ZIP_NAME = 'engwebp_usfm.zip';
const ZIP_URL = `https://ebible.org/Scriptures/${ZIP_NAME}`;
const ZIP_ENTRY_RE = /^(?:.*\/)?(\d+)-([A-Za-z1-3]{3})engwebp\.usfm$/i;

// ── USFM → verse rows ───────────────────────────────────────────────────────

const FOOTNOTE_RE = /\\f\b[\s\S]*?\\f\*/g;
const XREF_RE = /\\x\b[\s\S]*?\\x\*/g;
const TAGGED_WORD_RE = /\\\+?w\s+([\s\S]*?)\\\+?w\*/g;
const MARKER_RE = /\\(c|v)\s+(\d+)/g;
const BARE_MARKER_RE = /\\[A-Za-z][A-Za-z0-9]*\*?/g;
const TITLE_RE = /\\d\s+([^\\]*)/;
// Control token standing in for a tagged word during the substitution pass:
// \x01<word>\x02<comma-joined strongs>\x03 — \x01/\x02/\x03 cannot occur in USFM text.
const CTRL_RE = /\x01([^\x02]*)\x02([^\x03]*)\x03/g;

function stripPunct(s) {
  return s.replace(/^[^A-Za-z0-9]+/, '').replace(/[^A-Za-z0-9]+$/, '');
}

/** Replace every \w or \+w tagged span (opening..closing) with control tokens, preserving adjacency. */
function substituteTags(text) {
  return text.replace(TAGGED_WORD_RE, (_, body) => {
    const pipeIdx = body.indexOf('|');
    const wordPart = (pipeIdx >= 0 ? body.slice(0, pipeIdx) : body).trim();
    const attrPart = pipeIdx >= 0 ? body.slice(pipeIdx + 1) : '';
    const strongs = [...attrPart.matchAll(/strong="([^"]*)"/g)]
      .flatMap((m) => m[1].split(/[,\s]+/))
      .filter(Boolean)
      .join(',');
    // A tag can cover more than one space-separated word (rare in English WEB,
    // common in e.g. the Spanish sibling text) — emit one control token per word,
    // each carrying the full strongs list, joined by a plain space so unrelated
    // words don't get glued to each other.
    return wordPart
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => `\x01${w}\x02${strongs}\x03`)
      .join(' ');
  });
}

/** Decode one whitespace-delimited chunk (plain text + control tokens, glued with no space) into a word. */
function decodeChunk(chunk) {
  let word = '';
  const strongs = [];
  const seen = new Set();
  let last = 0;
  let m;
  CTRL_RE.lastIndex = 0;
  while ((m = CTRL_RE.exec(chunk))) {
    word += chunk.slice(last, m.index) + m[1];
    for (const s of m[2].split(',').filter(Boolean)) {
      if (!seen.has(s)) { seen.add(s); strongs.push(s); }
    }
    last = CTRL_RE.lastIndex;
  }
  word += chunk.slice(last);
  word = stripPunct(word);
  return word ? { w: word, s: strongs } : null;
}

/** Turn a stretch of (already tag-substituted) USFM body text into ordered {w,s} words. */
function wordsFromSegment(segment) {
  const clean = segment.replace(BARE_MARKER_RE, ' ');
  const out = [];
  for (const chunk of clean.split(/\s+/)) {
    if (!chunk) continue;
    const word = decodeChunk(chunk);
    if (word) out.push(word);
  }
  return out;
}

/** Parse one engwebp USFM book file into [{chapter, verse, words}]. */
export function parseBook(usfm) {
  const noApparatus = String(usfm).replace(FOOTNOTE_RE, '').replace(XREF_RE, '');
  const tagged = substituteTags(noApparatus);

  const markers = [];
  let mm;
  MARKER_RE.lastIndex = 0;
  while ((mm = MARKER_RE.exec(tagged))) {
    markers.push({ type: mm[1], num: Number(mm[2]), start: mm.index, end: MARKER_RE.lastIndex });
  }

  const rows = [];
  let chapter = 0;
  let titleWords = [];
  for (let i = 0; i < markers.length; i++) {
    const cur = markers[i];
    const segEnd = i + 1 < markers.length ? markers[i + 1].start : tagged.length;
    const segment = tagged.slice(cur.end, segEnd);
    if (cur.type === 'c') {
      chapter = cur.num;
      const t = segment.match(TITLE_RE);
      titleWords = t ? wordsFromSegment(t[1]) : [];
      continue;
    }
    const words = wordsFromSegment(segment);
    const all = titleWords.length ? [...titleWords, ...words] : words;
    titleWords = [];
    if (all.length) rows.push({ chapter, verse: cur.num, words: all });
  }
  return rows;
}

// ── zip handling ─────────────────────────────────────────────────────────────

function listZipEntries(zipPath) {
  return execFileSync('unzip', ['-Z1', zipPath], { maxBuffer: 8 * 1024 * 1024 })
    .toString('utf8')
    .split('\n')
    .filter(Boolean);
}

function bookFileMap(entries) {
  const map = new Map();
  for (const entry of entries) {
    const m = ZIP_ENTRY_RE.exec(entry);
    if (!m) continue;
    const book = canonicalBook(m[2]);
    if (book) map.set(book, entry);
  }
  return map;
}

function extractEntry(zipPath, entry) {
  return execFileSync('unzip', ['-p', zipPath, entry], { maxBuffer: 16 * 1024 * 1024 }).toString('utf8');
}

export async function load(client, { dryRun = false, limit = 0 } = {}) {
  const cap = limit || Number(process.env.STUDY_LIMIT) || 0;
  await fetchCached(ZIP_URL, ZIP_NAME, { binary: true });
  const zipPath = join(CACHE_DIR, ZIP_NAME);
  const entries = listZipEntries(zipPath);
  const byBook = bookFileMap(entries);

  const books = (cap > 0 ? BOOKS.slice(0, cap) : BOOKS).filter((b) => byBook.has(b));
  const rows = new Map();
  for (const book of books) {
    const usfm = extractEntry(zipPath, byBook.get(book));
    for (const { chapter, verse, words } of parseBook(usfm)) {
      rows.set(`${book}|${chapter}|${verse}`, { source_id: SOURCE.id, book, chapter, verse, words });
    }
  }
  const list = [...rows.values()];
  process.stdout.write(`  tagged: ${books.length} book(s), ${list.length} verses parsed\n`);
  if (dryRun) return list.length;
  await recordSource(client, SOURCE, null);
  await clearSource(client, 'study_tagged_english', SOURCE.id);
  await upsertBatches(client, 'study_tagged_english', list, { batch: 500 });
  await recordSource(client, SOURCE, list.length);
  return list.length;
}
