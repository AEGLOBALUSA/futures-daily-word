/**
 * Theographic Bible Metadata (people) → study_people.
 * Source: robertrouse/theographic-bible-metadata, CSV/People.csv (CC BY-SA 4.0).
 *
 * CSV columns (36, UTF-8 with BOM): personLookup,status,personID,displayTitle,
 * name,surname,alsoCalled,isProperName,ambiguous,Disambiguation (temp),gender,
 * occupations,birthYear,minYear,deathYear,maxYear,birthPlace,deathPlace,
 * memberOf,eastons,dictText,events,eventGroups,verseCount,verses,mother,father,
 * partners,children,siblings,halfSiblingsSameMother,halfSiblingsSameFather,
 * chaptersWritten,alphaGroup,slug,modified.
 *
 * `verses` is a comma-joined list of single-verse OSIS refs ("Gen.17.19,Gen.17.21,…"),
 * parsed with parseRef/formatRef into the app's canonical 'Book C:V' form. Records
 * with no parseable ref are skipped (per the loader brief — nothing to index them by).
 * `dictText` (Easton's Bible Dictionary prose, embedded per-person) carries
 * malformed-ish markdown links like "[Ex. 6:20](/exod#Exod.6.20)" — stripped to
 * their link text for a plain-text description.
 */
import { fetchCached, parseRef, formatRef, upsertBatches, recordSource, clearSource } from './common.mjs';

export const SOURCE = {
  id: 'theographic-people',
  name: 'Theographic Bible Metadata — People',
  licence: 'CC BY-SA 4.0',
  attribution: "Theographic Bible Metadata by Robert Rouse (Viz.Bible), https://github.com/robertrouse/theographic-bible-metadata, licensed under CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/). Includes KJV (1769) text and Easton's Bible Dictionary (1897), public domain.",
  url: 'https://github.com/robertrouse/theographic-bible-metadata',
  share_alike: true, // CC BY-SA: any redistributed adaptation of this data must carry the same licence.
  language: 'en',
  notes: "ShareAlike (CC BY-SA 4.0) applies to this dataset. The source repo's own bibliography notes that upstream person identification drew on Tyndale TIPNR, which is CC BY-NC — flagged here for licence review even though the repo itself ships CC BY-SA 4.0.",
};

const CSV_URL = 'https://raw.githubusercontent.com/robertrouse/theographic-bible-metadata/master/CSV/People.csv';

/** Minimal RFC-4180 CSV parser: quoted fields, "" escaping, embedded newlines/commas. */
export function parseCSV(text) {
  const rows = [];
  let row = [], field = '', inQuotes = false;
  const s = text.charCodeAt(0) === 0xFEFF ? text.slice(1) : text; // strip BOM
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inQuotes) {
      if (c === '"') {
        if (s[i + 1] === '"') { field += '"'; i++; } else { inQuotes = false; }
      } else field += c;
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field); field = '';
    } else if (c === '\r') {
      // ignore; the following \n (or end) closes the row
    } else if (c === '\n') {
      row.push(field); field = '';
      rows.push(row); row = [];
    } else field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}

function toRecords(rows) {
  if (!rows.length) return [];
  const header = rows[0];
  const out = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r.length || (r.length === 1 && r[0] === '')) continue;
    const rec = {};
    header.forEach((h, j) => { rec[h] = r[j] ?? ''; });
    out.push(rec);
  }
  return out;
}

/** Markdown links "[text](url)" → "text"; collapse whitespace. */
function cleanText(s) {
  return String(s || '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

const titleCase = s => String(s || '').split('_')[0].replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

/** Short line: gender / occupation(s) / a family hint, then an Easton snippet, ≤300 chars. */
export function describePerson(rec) {
  const head = [];
  if (rec.gender) head.push(rec.gender);
  if (rec.occupations) head.push(rec.occupations);
  if (rec.memberOf) head.push(rec.memberOf);
  const father = String(rec.father || '').split(',')[0].trim();
  const mother = String(rec.mother || '').split(',')[0].trim();
  if (father || mother) head.push(`child of ${titleCase(father || mother)}`);
  const headline = head.join(' — ');
  const dict = cleanText(rec.dictText);
  const budget = 300 - (headline ? headline.length + 3 : 0);
  if (!dict || budget <= 20) return headline ? headline.slice(0, 300) : (dict ? dict.slice(0, 300) : null);
  const snippet = dict.length > budget ? dict.slice(0, budget - 1).replace(/\s+\S*$/, '') + '…' : dict;
  return (headline ? `${headline} — ${snippet}` : snippet).slice(0, 300);
}

/** rows[] + a skip count. `limit` (if > 0) caps how many CSV records are processed. */
export function parsePeople(csvText, { limit = 0 } = {}) {
  let records = toRecords(parseCSV(csvText));
  if (limit > 0) records = records.slice(0, limit);
  const out = [];
  let skippedNoRefs = 0;
  for (const rec of records) {
    const name = (rec.name || rec.displayTitle || '').trim();
    if (!name || !rec.personID) continue;
    const refs = [];
    for (const raw of String(rec.verses || '').split(',')) {
      const v = raw.trim();
      if (!v) continue;
      const r = parseRef(v);
      if (r) refs.push(formatRef(r));
    }
    const uniqRefs = [...new Set(refs)];
    if (!uniqRefs.length) { skippedNoRefs++; continue; }
    out.push({
      id: `theo-${rec.personID}`,
      name,
      description: describePerson(rec),
      refs: uniqRefs,
      source_id: SOURCE.id,
    });
  }
  return { rows: out, skippedNoRefs, processed: records.length };
}

export async function load(client, { dryRun = false } = {}) {
  const limit = Number(process.env.STUDY_LIMIT) || 0;
  const csv = await fetchCached(CSV_URL, 'theographic-people.csv');
  const { rows, skippedNoRefs, processed } = parsePeople(csv, { limit });
  process.stdout.write(`  people: ${processed} records processed${limit ? ` (STUDY_LIMIT=${limit})` : ''}, ${rows.length} rows with refs, ${skippedNoRefs} skipped (no refs)\n`);
  if (dryRun) return rows.length;
  await recordSource(client, SOURCE, null);
  await clearSource(client, 'study_people', SOURCE.id);
  await upsertBatches(client, 'study_people', rows, { batch: 1000 });
  await recordSource(client, SOURCE, rows.length);
  return rows.length;
}
