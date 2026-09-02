/**
 * Cyclopedia of Illustrations for Public Speakers (Robert Scott & William C.
 * Stiles, eds., Funk & Wagnalls, 1911) → study_illustrations.
 * Source: Project Gutenberg eBook #74575, HTML build (the plain .txt has no
 * ids/letter-anchors, so the HTML is the better parse source — its cross-ref
 * targets and blockquote/poetry structure are unambiguous).
 *   https://www.gutenberg.org/cache/epub/74575/pg74575-images.html
 *
 * Structure (verified against the fetched file): the body — between the
 * '*** START OF ... ***' separator and the 'INDEXES OF TEXTS' section — is a
 * flat stream of three kinds of markers:
 *   TOPIC  <p class="sm bold p1 center" [id="..."]>HEADING</p>   (3,061)
 *   STUB   <p><b>Alt Title</b>—See <a ...>Target</a>.</p>        (~1,920, no number — not loaded)
 *   NUMBER <p class="right p-min" [id="txt_N"]>(N)</p>           (3,524, numbers run 1..3526)
 * with the illustration's own text (blockquot extracts, poetry, editorial
 * <p>s) sitting between a TOPIC/previous NUMBER and the next NUMBER. A topic
 * heading may cover several numbered illustrations before the next heading
 * (separated by an <hr>) — the topic carries forward until a new heading is
 * seen. A stub has no number of its own and is not "a numbered illustration
 * under a topic", so it contributes no row; it only closes off (discards)
 * whatever fragment preceded it.
 */
import { fetchCached, parseRef, formatRef, htmlToText, upsertBatches, recordSource, clearSource } from './common.mjs';

export const SOURCE = {
  id: 'gutenberg-74575',
  name: 'Cyclopedia of Illustrations for Public Speakers',
  licence: 'Public domain (Project Gutenberg #74575)',
  attribution: "Cyclopedia of Illustrations for Public Speakers, ed. Robert Scott & William C. Stiles (Funk & Wagnalls, 1911). Public domain. Text from Project Gutenberg eBook #74575 (www.gutenberg.org/ebooks/74575), transcribed by Greg Bergquist, Karin Spence and the Online Distributed Proofreading Team.",
  url: 'https://www.gutenberg.org/ebooks/74575',
  share_alike: false,
  language: 'en',
};

const HTML_URL = 'https://www.gutenberg.org/cache/epub/74575/pg74575-images.html';

// Alternation: group 1 = topic heading text, group 2 = illustration number.
// Neither group set ⇒ this match is a cross-reference stub (discarded).
// The stub's cross-ref target is USUALLY an <a href="#ID">...</a> but a
// couple in the wild are a bare <span> or plain-hyphen ("-See" not "—See") —
// so this bounds on the very next </p> rather than requiring </a>: every
// <p><b> in the file (1,911 of them — checked against the fetched HTML) opens
// a stub, never real illustration prose, so this can't over-match into a
// numbered illustration's own body.
const BOUNDARY_RE = new RegExp(
  '<p class="sm bold p1 center"(?: id="[^"]*")?>([^<]+)</p>' +
  '|<p><b>[^<]*</b>[\\s\\S]*?</p>' +
  '|<p class="right p-min"(?: id="[^"]*")?>\\((\\d+)\\)</p>',
  'g'
);

function toTitleCase(raw) {
  return String(raw || '')
    .trim()
    .replace(/([A-Za-z][A-Za-z'’]*)/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
}

/** Scan the illustration's plain text for real scripture refs (rare — the book
 * links scripture only via its two indexes, never inline — so this is
 * expected to come back empty for most entries). */
function extractRefs(text) {
  const found = new Set();
  const re = /\b((?:[1-3]\s)?[A-Z][a-zA-Z]+(?:\s(?:of\s)?[A-Z][a-zA-Z]+){0,2})\s+(\d{1,3}(?::\d{1,3}(?:[-–]\d{1,3})?)?)\b/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const words = m[1].split(/\s+/);
    for (let take = words.length; take >= 1; take--) {
      const bookGuess = words.slice(words.length - take).join(' ');
      const parsed = parseRef(`${bookGuess} ${m[2]}`);
      if (parsed) { found.add(formatRef(parsed)); break; }
    }
  }
  return [...found];
}

export function parseIllustrations(html) {
  const startIdx = html.indexOf('id="pg-start-separator"');
  const indexesIdx = html.indexOf('<h2>INDEXES OF TEXTS</h2>');
  const endIdx = indexesIdx > 0 ? indexesIdx : html.indexOf('id="pg-end-separator"');
  const body = html
    .slice(startIdx > 0 ? startIdx : 0, endIdx > 0 ? endIdx : html.length)
    .replace(/\r\n/g, '\n')
    // Original 1911 page markers injected mid-sentence — strip span + content.
    .replace(/<span class="pagenum"[^>]*>\[?\d*\]?<\/span>/g, '');

  const rows = [];
  const seenNumbers = new Set();
  let currentTopic = null;
  let fragStart = 0;

  BOUNDARY_RE.lastIndex = 0;
  let m;
  while ((m = BOUNDARY_RE.exec(body)) !== null) {
    if (m[1] !== undefined) {
      // TOPIC heading — start a fresh illustration under it. A handful of
      // illustration numbers are mistagged with the topic-heading class in
      // the source ('<p class="sm bold p1 center">(737)</p>') — not a real
      // topic; skip it rather than let a bogus "(737)" topic stick until the
      // next real heading.
      const headingText = htmlToText(m[1]).trim();
      if (!/^\(\d+\)$/.test(headingText)) currentTopic = toTitleCase(headingText);
      fragStart = BOUNDARY_RE.lastIndex;
    } else if (m[2] !== undefined) {
      // NUMBER — closes out the illustration that started at fragStart.
      const num = Number(m[2]);
      const text = htmlToText(body.slice(fragStart, m.index));
      fragStart = BOUNDARY_RE.lastIndex;
      if (text && currentTopic && !seenNumbers.has(num)) {
        seenNumbers.add(num);
        rows.push({
          id: `pg74575-${num}`,
          topic: currentTopic,
          title: null,
          body: text,
          refs: extractRefs(text),
          source_id: SOURCE.id,
        });
      }
    } else {
      // STUB — no number, no row; discard whatever text preceded it.
      fragStart = BOUNDARY_RE.lastIndex;
    }
  }
  rows.sort((a, b) => Number(a.id.slice(8)) - Number(b.id.slice(8)));
  return rows;
}

export async function load(client, { dryRun = false, limit = 0 } = {}) {
  const lim = limit || Number(process.env.STUDY_LIMIT || 0);
  const html = await fetchCached(HTML_URL, 'pg74575-images.html');
  const all = parseIllustrations(html);
  const topics = new Set(all.map(r => r.topic)).size;
  const rows = lim > 0 ? all.slice(0, lim) : all;
  process.stdout.write(`  illustrations: ${all.length} parsed (${topics} distinct topics)${lim > 0 ? `, using first ${rows.length} (STUDY_LIMIT)` : ''}\n`);
  if (dryRun) return rows.length;
  await recordSource(client, SOURCE, null);
  await clearSource(client, 'study_illustrations', SOURCE.id);
  await upsertBatches(client, 'study_illustrations', rows, { batch: 1000 });
  await recordSource(client, SOURCE, rows.length);
  return rows.length;
}
