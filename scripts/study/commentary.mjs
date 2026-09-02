/**
 * HelloAO (bible.helloao.org, AO Lab) public-domain commentaries → study_commentary.
 * Six commentaries, one row per chapter introduction (verse_from=0/verse_to=0) and
 * one row per commentary verse-block (verse_from..verse_to inferred from the next
 * block's starting verse). All six are served from the same static JSON API:
 *   https://bible.helloao.org/api/c/{helloaoId}/{USFM book}/{chapter}.json
 * Book ids are USFM/Paratext 3-letter codes; canonicalBook() maps them onto the
 * app's one book canon. Text is already plain (no HTML in this API) but is still
 * run through htmlToText for safety/whitespace normalisation.
 *
 * Granularity varies by commentary (verified 2 Sep 2026, see sweep/helloao.json):
 *   - Gill, Clarke, JFB: one block per Bible verse (a `chapter.introduction` string
 *     is used by JFB/Clarke for the chapter's synopsis; JFB also folds its v.1
 *     comment into that introduction — the content array then starts at v.2).
 *   - Henry, Calvin, Keil & Delitzsch: pericope-level blocks keyed on their FIRST
 *     verse only; the block's actual end verse is not stated by the API, so it is
 *     inferred as (next block's verse - 1). The LAST block in a chapter has no
 *     following block to infer from — its verse_to is left equal to verse_from
 *     (an intentional under-count; see gaps_or_risks in the loader report).
 * Missing chapters/books 404 with an HTML page — every fetch checks status before
 * JSON-parsing and a 404 is treated as "commentary has no content here", not fatal.
 * Book-level introductions (books.json `introduction`) are NOT loaded: the target
 * table has no book-only row shape (chapter is not-null), so they're out of scope.
 */
import {
  fetchCached, htmlToText, canonicalBook, chapterCount,
  upsertBatches, recordSource, clearSource,
} from './common.mjs';

const API = 'https://bible.helloao.org/api/c';

export const SOURCES = {
  'helloao-matthew-henry': {
    id: 'helloao-matthew-henry',
    name: 'Matthew Henry Bible Commentary',
    licence: 'CC Public Domain Mark 1.0 (public domain)',
    attribution: 'Matthew Henry Bible Commentary — Public Domain (CC Public Domain Mark 1.0). Served by the Free Use Bible API, bible.helloao.org (AO Lab). No attribution is legally required.',
    url: 'https://bible.helloao.org',
    share_alike: false,
    language: 'en',
    helloaoId: 'matthew-henry',
  },
  'helloao-jfb': {
    id: 'helloao-jfb',
    name: 'Jamieson-Fausset-Brown Bible Commentary',
    licence: 'CC Public Domain Mark 1.0 (public domain)',
    attribution: 'Jamieson-Fausset-Brown Bible Commentary — Public Domain (CC Public Domain Mark 1.0). Served by the Free Use Bible API, bible.helloao.org (AO Lab). No attribution is legally required.',
    url: 'https://en.wikipedia.org/wiki/Jamieson-Fausset-Brown_Bible_Commentary',
    share_alike: false,
    language: 'en',
    helloaoId: 'jamieson-fausset-brown',
  },
  'helloao-gill': {
    id: 'helloao-gill',
    name: "John Gill's Exposition of the Bible",
    licence: 'CC Public Domain Mark 1.0 (public domain)',
    attribution: "John Gill's Exposition of the Bible — Public Domain (CC Public Domain Mark 1.0). Served by the Free Use Bible API, bible.helloao.org (AO Lab). No attribution is legally required.",
    url: 'https://bible.helloao.org',
    share_alike: false,
    language: 'en',
    helloaoId: 'john-gill',
  },
  'helloao-clarke': {
    id: 'helloao-clarke',
    name: "Adam Clarke's Commentary on the Bible",
    licence: 'CC Public Domain Mark 1.0 (public domain)',
    attribution: "Adam Clarke's Commentary on the Bible — Public Domain (CC Public Domain Mark 1.0). Served by the Free Use Bible API, bible.helloao.org (AO Lab). No attribution is legally required.",
    url: 'https://bible.helloao.org',
    share_alike: false,
    language: 'en',
    helloaoId: 'adam-clarke',
  },
  'helloao-calvin': {
    id: 'helloao-calvin',
    name: "John Calvin's Commentaries",
    licence: 'CC Public Domain Mark 1.0 (public domain)',
    attribution: "John Calvin's Commentaries, Calvin Translation Society English texts (via CCEL, ccel.org) — Public Domain (CC Public Domain Mark 1.0). Served by the Free Use Bible API, bible.helloao.org (AO Lab).",
    url: 'https://www.ccel.org/ccel/calvin/commentaries.html',
    share_alike: false,
    language: 'en',
    helloaoId: 'john-calvin',
  },
  'helloao-keil-delitzsch': {
    id: 'helloao-keil-delitzsch',
    name: 'Carl Friedrich Keil and Franz Delitzsch Old Testament Commentary',
    licence: 'CC Public Domain Mark 1.0 (public domain)',
    attribution: 'Keil & Delitzsch, Commentary on the Old Testament (English translation) — Public Domain (CC Public Domain Mark 1.0). Served by the Free Use Bible API, bible.helloao.org (AO Lab). No attribution is legally required.',
    url: 'https://worthy.bible/commentaries/keil-delitzsch-commentary',
    share_alike: false,
    language: 'en',
    helloaoId: 'keil-delitzsch',
  },
};

/** books.json → [{ usfm, book (canonical name), numberOfChapters }], unmapped ids dropped. */
export function parseBooksList(json) {
  const books = (json && (json.books || json)) || [];
  const out = [];
  for (const b of books) {
    const book = canonicalBook(b.id);
    if (!book) continue; // shouldn't happen for standard USFM ids, but never crash a load on it
    const cap = chapterCount(book);
    const n = Number(b.numberOfChapters) || cap;
    out.push({ usfm: b.id, book, numberOfChapters: cap ? Math.min(n, cap) : n });
  }
  return out;
}

function textOf(content) {
  const raw = Array.isArray(content) ? content.filter(c => typeof c === 'string').join('\n\n') : String(content || '');
  return htmlToText(raw);
}

/** One chapter JSON → rows for study_commentary (pure — no I/O). */
export function parseChapter(json, { sourceId, book, chapterNumber }) {
  const rows = [];
  const chapter = (json && json.chapter) || {};
  const intro = textOf(chapter.introduction);
  if (intro) {
    rows.push({ source_id: sourceId, book, chapter: chapterNumber, verse_from: 0, verse_to: 0, content: intro });
  }
  const blocks = (chapter.content || []).filter(b => b && b.type === 'verse' && Number.isFinite(b.number));
  for (let i = 0; i < blocks.length; i++) {
    const content = textOf(blocks[i].content);
    if (!content) continue;
    const next = blocks[i + 1];
    const verseTo = next ? Math.max(blocks[i].number, next.number - 1) : blocks[i].number;
    rows.push({ source_id: sourceId, book, chapter: chapterNumber, verse_from: blocks[i].number, verse_to: verseTo, content });
  }
  return rows;
}

async function fetchChapter(helloaoId, usfm, chapterNumber) {
  const name = `helloao-${helloaoId}-${usfm}-${chapterNumber}.json`;
  try {
    const text = await fetchCached(`${API}/${helloaoId}/${usfm}/${chapterNumber}.json`, name);
    return JSON.parse(text);
  } catch (err) {
    if (err && /^404\b/.test(err.message || '')) return null; // no commentary here — not fatal
    throw err;
  }
}

async function pMap(items, worker, concurrency) {
  const results = new Array(items.length);
  let idx = 0;
  async function run() {
    while (idx < items.length) {
      const i = idx++;
      results[i] = await worker(items[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, run));
  return results;
}

async function loadOneCommentary(src, chapterLimit) {
  const booksJson = JSON.parse(await fetchCached(`${API}/${src.helloaoId}/books.json`, `helloao-${src.helloaoId}-books.json`));
  const books = parseBooksList(booksJson);
  let pairs = [];
  for (const b of books) {
    for (let ch = 1; ch <= b.numberOfChapters; ch++) pairs.push({ usfm: b.usfm, book: b.book, chapterNumber: ch });
  }
  if (chapterLimit > 0) pairs = pairs.slice(0, chapterLimit);

  const rowsMap = new Map();
  let fetched = 0, missing = 0;
  await pMap(pairs, async ({ usfm, book, chapterNumber }) => {
    const json = await fetchChapter(src.helloaoId, usfm, chapterNumber);
    if (!json) { missing++; return; }
    fetched++;
    for (const row of parseChapter(json, { sourceId: src.id, book, chapterNumber })) {
      rowsMap.set(`${row.book}|${row.chapter}|${row.verse_from}|${row.verse_to}`, row);
    }
  }, 6);

  const rows = [...rowsMap.values()];
  process.stdout.write(`  ${src.id}: ${books.length} books, ${pairs.length} chapters requested (${fetched} found, ${missing} 404), ${rows.length} rows\n`);
  return rows;
}

export async function load(client, { dryRun = false, limit = 0 } = {}) {
  const chapterLimit = limit || Number(process.env.STUDY_LIMIT || 0) || 0;
  let total = 0;
  for (const src of Object.values(SOURCES)) {
    const rows = await loadOneCommentary(src, chapterLimit);
    if (!dryRun) {
      // study_sources has no helloaoId column — record only the source's own fields.
      const { helloaoId: _id, ...sourceRow } = src; void _id;
      await recordSource(client, sourceRow, null);
      await clearSource(client, 'study_commentary', src.id);
      await upsertBatches(client, 'study_commentary', rows, { batch: 1000 });
      await recordSource(client, sourceRow, rows.length);
    }
    total += rows.length;
  }
  process.stdout.write(`  commentary: ${total} rows total across ${Object.keys(SOURCES).length} sources\n`);
  return total;
}
