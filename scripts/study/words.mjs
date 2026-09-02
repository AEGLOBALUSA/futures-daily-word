/**
 * Word-by-word Greek NT / Hebrew OT text → study_words.
 *   Greek: STEPBible TAGNT (Translators Amalgamated Greek NT), filtered to the
 *          NA28 reading (the modern critical text most translations, incl.
 *          ESV, are based on) — the file is a superset of NA28+NA27+TR+Byz+…
 *          so a row is kept only when its 'editions' column lists NA28.
 *   Hebrew: STEPBible TAHOT (Translators Amalgamated Hebrew OT), the
 *           translators' text (Leningrad Codex following Qere corrections),
 *           i.e. every row as-is EXCEPT text-type 'X' rows (LXX-only text
 *           reconstructed into BHS/BHK that isn't actually in the Hebrew).
 * Both files repeat their column-header row before every verse and carry
 * '#'-prefixed interlinear comment blocks — both are skipped; only lines
 * matching the "Book.C.V#NN=type" reference pattern are data rows.
 *
 * STUDY_LIMIT env var (read directly — the dispatcher does not parse --limit)
 * caps processing to the first N books of each testament, and skips
 * downloading later part files once that many distinct books have been seen.
 */
import { fetchCached, parseRef, canonicalBook, upsertBatches, recordSource, clearSource } from './common.mjs';

export const SOURCES = {
  greek: {
    id: 'stepbible-tagnt',
    name: 'TAGNT - Translators Amalgamated Greek NT (STEPBible)',
    licence: 'CC BY 4.0',
    attribution: 'Greek New Testament text and tagging: TAGNT (Translators Amalgamated Greek NT) by STEP Bible (www.STEPBible.org), based on work at Tyndale House Cambridge. CC BY 4.0. Source: github.com/STEPBible/STEPBible-Data',
    url: 'https://github.com/STEPBible/STEPBible-Data',
    share_alike: false,
    language: 'grc',
  },
  hebrew: {
    id: 'stepbible-tahot',
    name: 'TAHOT - Translators Amalgamated Hebrew OT (STEPBible)',
    licence: 'CC BY 4.0',
    attribution: 'Hebrew Old Testament text and tagging: TAHOT (Translators Amalgamated Hebrew OT) by STEP Bible (www.STEPBible.org), based on work at Tyndale House Cambridge; Hebrew from the Leningrad Codex via Westminster/OpenScriptures, morphology from ETCBC. CC BY 4.0. Source: github.com/STEPBible/STEPBible-Data',
    url: 'https://github.com/STEPBible/STEPBible-Data',
    share_alike: false,
    language: 'hbo',
  },
};

const BASE = 'https://raw.githubusercontent.com/STEPBible/STEPBible-Data/master/Translators%20Amalgamated%20OT%2BNT/';
const GREEK_PARTS = [
  'TAGNT%20Mat-Jhn%20-%20Translators%20Amalgamated%20Greek%20NT%20-%20STEPBible.org%20CC-BY.txt',
  'TAGNT%20Act-Rev%20-%20Translators%20Amalgamated%20Greek%20NT%20-%20STEPBible.org%20CC-BY.txt',
];
const HEBREW_PARTS = [
  'TAHOT%20Gen-Deu%20-%20Translators%20Amalgamated%20Hebrew%20OT%20-%20STEPBible.org%20CC%20BY.txt',
  'TAHOT%20Jos-Est%20-%20Translators%20Amalgamated%20Hebrew%20OT%20-%20STEPBible.org%20CC%20BY.txt',
  'TAHOT%20Job-Sng%20-%20Translators%20Amalgamated%20Hebrew%20OT%20-%20STEPBible.org%20CC%20BY.txt',
  'TAHOT%20Isa-Mal%20-%20Translators%20Amalgamated%20Hebrew%20OT%20-%20STEPBible.org%20CC%20BY.txt',
];

const DATA_ROW = /^([A-Za-z1-3]{3})\.(\d{1,3})\.(\d{1,3}(?:\(\d+\.\d+\))?)#(\d{1,2})=/;

function stripBOM(s) {
  return s.charCodeAt(0) === 0xfeff ? s.slice(1) : s;
}

/** Strong's field → base 'G1234' / 'H1234' (STEPBible's disambiguation letter
 *  suffix, e.g. 'G2424G', is STEPBible-only and dropped so the number joins
 *  study_lexicon, which keys on the bare Strong's number). */
function baseStrong(prefix, raw) {
  const m = String(raw || '').match(new RegExp(`${prefix}(\\d+)`));
  return m ? `${prefix}${Number(m[1])}` : null;
}

// ── Greek (TAGNT) ────────────────────────────────────────────────────────────

export function parseGreekLine(line, sourceId) {
  const m = line.match(DATA_ROW);
  if (!m) return null;
  const [, bookCode, chapterS, verseS, posS] = m;
  const cells = line.split('\t');
  if (cells.length < 13) return null;
  const editions = cells[5] || '';
  if (!editions.split('+').includes('NA28')) return null; // not in the chosen (NA28) reading

  const ref = parseRef(`${bookCode}.${chapterS}.${verseS}`);
  if (!ref || !ref.verse) return null;

  const greekField = cells[1] || '';
  const gm = greekField.match(/^(.*?)\s*\(([^)]*)\)\s*$/);
  const word = (gm ? gm[1] : greekField).trim();
  const translit = gm ? gm[2].trim() : null;
  if (!word) return null;

  const dStrongGrammar = cells[3] || '';
  const [dStrongRaw, morph] = dStrongGrammar.split('=');
  const strongs = baseStrong('G', dStrongRaw);

  const lemmaGloss = cells[4] || '';
  const eq = lemmaGloss.indexOf('=');
  const lemma = eq >= 0 ? lemmaGloss.slice(0, eq).trim() : lemmaGloss.trim() || null;
  const gloss = eq >= 0 ? lemmaGloss.slice(eq + 1).trim() : null;

  return {
    source_id: sourceId,
    book: ref.book, chapter: ref.chapter, verse: ref.verse, position: Number(posS),
    word, lemma: lemma || null, strongs, morph: morph || null,
    gloss: gloss || null, translit: translit || null,
  };
}

// ── Hebrew (TAHOT) ───────────────────────────────────────────────────────────

export function parseHebrewLine(line, sourceId) {
  const m = line.match(DATA_ROW);
  if (!m) return null;
  const [, bookCode, chapterS, verseS, posS] = m;
  const type = line.slice(m[0].length).split('\t')[0]; // rest of field 1 after '='
  if (type.startsWith('X')) return null; // LXX-only text not actually in the Hebrew

  // English versification is always what precedes the optional '(H.V)' Hebrew-numbering suffix.
  const verseNum = verseS.replace(/\(.*\)$/, '');
  const ref = parseRef(`${bookCode}.${chapterS}.${verseNum}`);
  if (!ref) return null; // verse 0 (Psalm titles) parses fine and is kept

  const cells = line.split('\t');
  if (cells.length < 12) return null;

  const hebrewField = cells[1] || '';
  const word = hebrewField.replace(/\\/g, '').replace(/\/\//g, '').replace(/\//g, '').trim();
  if (!word) return null;

  const translit = (cells[2] || '').trim() || null;
  const morph = (cells[5] || '').trim() || null;

  const dStrongs = cells[4] || '';
  const rootMatch = dStrongs.match(/\{H(\d+)[A-Z]*\}/);
  const strongs = rootMatch ? `H${Number(rootMatch[1])}` : null;

  const expanded = cells[11] || '';
  const tagMatch = expanded.match(/\{H\d+[A-Z]*=([^=}]+)=([^}]*)\}/);
  let lemma = null, gloss = null;
  if (tagMatch) {
    lemma = tagMatch[1].trim() || null;
    // e.g. ": beginning»first:1_beginning" → "beginning"; ": country;_planet»land:..." → "country; planet"
    const parts = tagMatch[2].split(/[»:]/).map((s) => s.trim()).filter(Boolean);
    gloss = (parts[0] || '').replace(/_/g, ' ').trim() || null;
  }

  return {
    source_id: sourceId,
    book: ref.book, chapter: ref.chapter, verse: ref.verse, position: Number(posS),
    word, lemma, strongs, morph, gloss, translit,
  };
}

// ── Shared driver: fetch parts in order, stop once `limit` books are seen ────

async function loadTestament(parts, sourceId, parseLine, limit) {
  const rows = new Map(); // dedupe on (book,chapter,verse,position) — PK
  const seenBooks = new Set();
  let skippedNoBook = 0;

  for (const part of parts) {
    if (limit && seenBooks.size >= limit) break;
    const raw = stripBOM(await fetchCached(BASE + part, decodeURIComponent(part)));
    const lines = raw.split('\n');
    for (const line of lines) {
      const m = line.match(DATA_ROW);
      if (!m) continue;
      const book = canonicalBook(m[1]);
      if (!book) { skippedNoBook++; continue; }
      if (limit && !seenBooks.has(book) && seenBooks.size >= limit) continue; // new book beyond the cap
      seenBooks.add(book);
      const row = parseLine(line, sourceId);
      if (!row) continue;
      rows.set(`${row.book}|${row.chapter}|${row.verse}|${row.position}`, row);
    }
  }
  return { rows: [...rows.values()], booksSeen: seenBooks.size, skippedNoBook };
}

export async function load(client, { dryRun = false, limit = Number(process.env.STUDY_LIMIT) || 0 } = {}) {
  const greek = await loadTestament(GREEK_PARTS, SOURCES.greek.id, parseGreekLine, limit);
  const hebrew = await loadTestament(HEBREW_PARTS, SOURCES.hebrew.id, parseHebrewLine, limit);
  process.stdout.write(
    `  words: ${greek.rows.length} Greek (NA28, ${greek.booksSeen} books) + ${hebrew.rows.length} Hebrew (${hebrew.booksSeen} books) rows` +
    `${limit ? ` [limit ${limit} books/testament]` : ''}\n`
  );
  const total = greek.rows.length + hebrew.rows.length;
  if (dryRun) return total;

  for (const [src, rows] of [[SOURCES.greek, greek.rows], [SOURCES.hebrew, hebrew.rows]]) {
    await recordSource(client, src, null);
    await clearSource(client, 'study_words', src.id);
    await upsertBatches(client, 'study_words', rows, { batch: 1000 });
    await recordSource(client, src, rows.length);
  }
  return total;
}
