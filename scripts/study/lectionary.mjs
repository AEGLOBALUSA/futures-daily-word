/**
 * Revised Common Lectionary (Years A/B/C) → study_lectionary.
 *
 * Source: marmanold/Date-Lectionary share/rcl_lect.xml, BSD-2-Clause
 * (github.com/marmanold/Date-Lectionary) — the only complete, structured
 * (non-PDF) encoding of the RCL table found; verified by direct fetch: 226
 * <day> elements (4 fixed "holidays" + 74 recurring Sundays/feasts × A/B/C),
 * every recurring day name identical and in the same order across the three
 * years. The RCL table of citations itself is Copyright © 1992 Consultation
 * on Common Texts (CCT); CCT's own permissions policy grants a congregation
 * free use of the table for its own non-sale worship/educational activities,
 * including a congregational website (commontexts.org/rcl/permissions/) —
 * used here on that basis, alongside the BSD licence on this XML encoding.
 * REJECTED as sources: LectServe (no stated redistribution licence — "fine
 * for prototyping, not a redistribution licence"); the Scottish Episcopal
 * Church CSV (GPL-3.0 copyleft, AND its "Proper N" numbering is offset from
 * CCT/US numbering — ambiguous fit); the raw CCT/Vanderbilt PDFs (CCT
 * explicitly forbids re-posting "these electronic files"; Vanderbilt's
 * per-liturgical-year PDFs are not a stable A/B/C export and only Year A
 * 2025-26 was actually verified, not B or C).
 *
 * COMPLEMENTARY track only: this XML does not carry the semicontinuous
 * OT/Psalm column CCT publishes for Ordinary Time (see PROPER_BY_START).
 * Two typos inherited from the CCT PDF are fixed on the way in (see
 * NAME_FIXES and the digit-glue fix in splitBookAndRest). Season is not a
 * field in the source XML — it is inferred from each day's name, verified
 * against all 74 recurring names + 4 fixed feasts in this file (see
 * classifyDay); an unrecognised future day name falls back to a generic
 * slug with season: null rather than failing the load.
 */
import { canonicalBook, fetchCached, upsertBatches, recordSource, clearSource } from './common.mjs';

export const SOURCE = {
  id: 'rcl-date-lectionary',
  name: 'Revised Common Lectionary (Years A/B/C)',
  licence:
    "Underlying RCL table of citations: Copyright © 1992 Consultation on Common Texts — used here under CCT's own permission for a congregation's non-sale worship/educational use, including a congregational website (commontexts.org/rcl/permissions/). This XML encoding of the table: BSD-2-Clause (marmanold/Date-Lectionary, © 2016-2020 Michael Wayne Arnold). Complementary reading track only — no semicontinuous OT/Psalm column.",
  attribution:
    'Revised Common Lectionary Copyright © 1992 Consultation on Common Texts. www.commontexts.org. Used by permission. — Citations encoded from Date::Lectionary © 2016-2020 Michael Wayne Arnold (BSD-2-Clause), github.com/marmanold/Date-Lectionary.',
  url: 'https://www.commontexts.org/rcl/',
  share_alike: false,
  language: 'en',
};

const XML_URL = 'https://raw.githubusercontent.com/marmanold/Date-Lectionary/master/share/rcl_lect.xml';

const ORDINAL = { First: 1, Second: 2, Third: 3, Fourth: 4, Fifth: 5, Sixth: 6, Seventh: 7, Eighth: 8 };

// "Sunday between <date> and <date> inclusive" → RCL Proper number, keyed by
// the range's start date. Fixed CCT calendar convention (Trinity Sunday
// always falls before Propers 1-2 could ever occur, so the table starts at
// Proper 3); verified 1:1 against all 26 "Sunday between" names in this file.
const PROPER_BY_START = {
  'May 24': 3, 'May 29': 4, 'June 5': 5, 'June 12': 6, 'June 19': 7, 'June 26': 8,
  'July 3': 9, 'July 10': 10, 'July 17': 11, 'July 24': 12, 'July 31': 13,
  'August 7': 14, 'August 14': 15, 'August 21': 16, 'August 28': 17,
  'September 4': 18, 'September 11': 19, 'September 18': 20, 'September 25': 21,
  'October 2': 22, 'October 9': 23, 'October 16': 24, 'October 23': 25,
  'October 30': 26, 'November 6': 27, 'November 13': 28,
};

// Non-formulaic day names → [slug, season]. Season null = a fixed holy day
// not tied to a liturgical season (Presentation, Annunciation, Visitation,
// Holy Cross Day — the four "holidays" entries, replicated into A/B/C below).
const FIXED_SLUGS = {
  'Christmas, Proper I': ['christmas-day-1', 'Christmas'],
  'Christmas, Proper II': ['christmas-day-2', 'Christmas'],
  'Christmas, Proper III': ['christmas-day-3', 'Christmas'],
  'Holy Name of Jesus': ['holy-name-of-jesus', 'Christmas'],
  'Epiphany of the Lord': ['epiphany-of-the-lord', 'Epiphany'],
  'Baptism of the Lord': ['baptism-of-the-lord', 'Epiphany'],
  'Ash Wednesday': ['ash-wednesday', 'Lent'],
  'Liturgy of the Palms': ['palm-sunday-liturgy-of-the-palms', 'Lent'],
  'Liturgy of the Passion': ['palm-sunday-liturgy-of-the-passion', 'Lent'],
  'Monday of Holy Week': ['monday-of-holy-week', 'Lent'],
  'Tuesday of Holy Week': ['tuesday-of-holy-week', 'Lent'],
  'Wednesday of Holy Week': ['wednesday-of-holy-week', 'Lent'],
  'Holy Thursday': ['maundy-thursday', 'Lent'],
  'Good Friday': ['good-friday', 'Lent'],
  'Holy Saturday': ['holy-saturday', 'Lent'],
  'Easter Vigil': ['easter-vigil', 'Easter'],
  'Easter Day': ['easter-day', 'Easter'],
  'Easter Evening': ['easter-evening', 'Easter'],
  'Ascension of the Lord': ['ascension-of-the-lord', 'Easter'],
  'Day of Pentecost': ['day-of-pentecost', 'Easter'],
  'Trinity Sunday': ['trinity-sunday', 'Season after Pentecost'],
  'Christ the King': ['christ-the-king', 'Season after Pentecost'],
  'All Saints': ['all-saints', 'Season after Pentecost'],
  'Presentation of the Lord': ['presentation-of-the-lord', null],
  'Annunciation of the Lord': ['annunciation-of-the-lord', null],
  'Visitation of Mary to Elizabeth': ['visitation-of-mary-to-elizabeth', null],
  'Holy Cross Day': ['holy-cross-day', null],
};

// One upstream spelling fix, present verbatim in the source XML.
const NAME_FIXES = { 'Presentaiton of the Lord': 'Presentation of the Lord' };

function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

/** Day name → { name, slug, season }. Covers all 74 recurring names + 4 fixed
 * feasts found in this file; an unrecognised name falls back to a generic
 * slug rather than failing the load. */
export function classifyDay(rawName) {
  const name = NAME_FIXES[rawName] || rawName;
  let m;
  if ((m = name.match(/^(\w+) Sunday of Advent$/))) return { name, slug: `advent-${ORDINAL[m[1]]}`, season: 'Advent' };
  if ((m = name.match(/^(\w+) Sunday after Christmas Day$/))) return { name, slug: `christmas-${ORDINAL[m[1]]}`, season: 'Christmas' };
  if (name === 'Last Sunday after the Epiphany') return { name, slug: 'transfiguration-sunday', season: 'Epiphany' };
  if ((m = name.match(/^(\w+) Sunday after the Epiphany$/))) return { name, slug: `epiphany-${ORDINAL[m[1]]}`, season: 'Epiphany' };
  if ((m = name.match(/^(\w+) Sunday in Lent$/))) return { name, slug: `lent-${ORDINAL[m[1]]}`, season: 'Lent' };
  if ((m = name.match(/^(\w+) Sunday of Easter$/))) return { name, slug: `easter-${ORDINAL[m[1]]}`, season: 'Easter' };
  if ((m = name.match(/^Sunday between (\w+ \d+) and \w+ \d+ inclusive$/))) {
    const proper = PROPER_BY_START[m[1]];
    return { name, slug: proper ? `proper-${proper}` : slugify(name), season: 'Season after Pentecost' };
  }
  if (FIXED_SLUGS[name]) return { name, slug: FIXED_SLUGS[name][0], season: FIXED_SLUGS[name][1] };
  return { name, slug: slugify(name), season: null };
}

/** "Isaiah35:1-10" (typo inherited from the CCT PDF) → book="Isaiah",
 * rest="35:1-10". Tries 3/2/1-word book-name candidates so "1 Samuel",
 * "Song of Solomon" etc. resolve; returns book: null when nothing matches
 * (e.g. the deuterocanonical "Baruch" in an Easter Vigil alternate, which
 * isn't in the app's 66-book canon). */
function splitBookAndRest(segment) {
  const s = segment.trim().replace(/\s+/g, ' ').replace(/^([A-Za-z]+)(\d)/, '$1 $2');
  const words = s.split(' ');
  for (let n = Math.min(3, words.length - 1); n >= 1; n--) {
    const book = canonicalBook(words.slice(0, n).join(' '));
    if (book) return { book, rest: words.slice(n).join(' ') };
  }
  return { book: null, rest: s };
}

/** Canonicalize the book name in one citation segment; anything the app's
 * canon doesn't recognise is left exactly as written rather than dropped. */
function normalizeSegment(raw) {
  const { book, rest } = splitBookAndRest(raw);
  return book ? (rest ? `${book} ${rest}` : book) : raw.trim();
}

/** One <lesson> string ("Psalm 84 or Psalm 24:7-10") → 1+ {kind, ref} rows;
 * a 2nd/3rd/... alternative gets kind suffixed '-alt' / '-alt2' / ... */
export function parseCitation(raw, baseKind) {
  const parts = raw.split(/\s+or\s+/i).map(s => s.trim()).filter(Boolean);
  return parts.map((part, i) => ({
    kind: i === 0 ? baseKind : `${baseKind}-alt${i > 1 ? i : ''}`,
    ref: normalizeSegment(part),
  }));
}

/** lesson order (1-based) among `total` lessons on one day → a kind label.
 * 4 = the standard OT/Psalm/Epistle/Gospel day. 2 = Liturgy of the Palms
 * (Gospel, then Psalm). >=19 = Easter Vigil-style: paired OT+Psalm readings,
 * then Epistle, response Psalm, Gospel. Anything else: 'reading-N'. */
function kindForOrder(order, total) {
  if (total === 4) return ['first', 'psalm', 'second', 'gospel'][order - 1];
  if (total === 2) return order === 1 ? 'gospel' : 'psalm';
  if (total >= 19) {
    if (order === total) return 'gospel';
    if (order === total - 1) return 'psalm-response';
    if (order === total - 2) return 'second';
    return order % 2 === 1 ? `first-${Math.ceil(order / 2)}` : `psalm-${order / 2}`;
  }
  return `reading-${order}`;
}

const YEAR_RE = /<year name="([^"]*)">([\s\S]*?)<\/year>/g;
const DAY_RE = /<day name="([^"]*)">([\s\S]*?)<\/day>/g;
const LESSON_RE = /<lesson order="(\d+)">([^<]*)<\/lesson>/g;

function decodeXmlText(s) {
  return s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'").replace(/&amp;/g, '&').trim();
}

/** rcl_lect.xml → rows shaped for study_lectionary (source_id not yet set by
 * the caller in the readings — set here since it's constant per load). The
 * 4 "holidays" days are replicated into A, B and C (same readings every
 * year, keyed only by the calendar, not the Sunday cycle). */
export function parseXml(xml) {
  const rows = [];
  let ym;
  YEAR_RE.lastIndex = 0;
  while ((ym = YEAR_RE.exec(xml)) !== null) {
    const yearName = ym[1];
    const years = yearName === 'holidays' ? ['A', 'B', 'C'] : [yearName];
    let dm;
    DAY_RE.lastIndex = 0;
    while ((dm = DAY_RE.exec(ym[2])) !== null) {
      const lessons = [];
      let lm;
      LESSON_RE.lastIndex = 0;
      while ((lm = LESSON_RE.exec(dm[2])) !== null) lessons.push({ order: Number(lm[1]), text: decodeXmlText(lm[2]) });
      const total = lessons.length;
      const readings = lessons.flatMap(l => parseCitation(l.text, kindForOrder(l.order, total)));
      const { name, slug, season } = classifyDay(dm[1]);
      for (const year of years) rows.push({ source_id: SOURCE.id, year, slug, name, season, readings });
    }
  }
  return rows;
}

export async function load(client, { dryRun = false } = {}) {
  const xml = await fetchCached(XML_URL, 'rcl_lect.xml');
  let rows = parseXml(xml);
  const limit = Number(process.env.STUDY_LIMIT) || 0;
  if (limit) rows = rows.slice(0, limit);
  // De-dupe on the primary key (source_id, year, slug) — keep the first.
  const seen = new Set();
  const list = [];
  for (const r of rows) {
    const key = `${r.year}|${r.slug}`;
    if (seen.has(key)) continue;
    seen.add(key);
    list.push(r);
  }
  process.stdout.write(`  lectionary: ${list.length} year/day rows (${rows.length} parsed before limit/dedupe)\n`);
  if (dryRun) return list.length;
  await recordSource(client, SOURCE, null);
  await clearSource(client, 'study_lectionary', SOURCE.id);
  await upsertBatches(client, 'study_lectionary', list, { batch: 500 });
  await recordSource(client, SOURCE, list.length);
  return list.length;
}
