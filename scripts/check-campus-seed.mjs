#!/usr/bin/env node
/**
 * The campus seed and its two bundled copies must say the same thing (B09-02).
 *
 *   supabase/migrations/20261002140000_dw_campuses.sql   the seed (source)
 *   supabase/migrations/20261004180000_dw_campus_towns.sql  the seed's other towns (B09-07F)
 *   netlify/functions/lib/campuses.fallback.json         the functions' copy
 *   src/data/campuses.fallback.ts                        the reader app's copy
 *
 * The copies are what the app shows when the table cannot be read, so they
 * must match the seed row for row: same ids, names, towns, regions, time
 * zones, congregations, livestream links, Planning Center spellings and order.
 * It also holds the seed to the 22 campuses the app carried on 2 Oct 2026
 * (21 campuses plus "Non-Futures Church"): new campuses are added by the
 * owner in /staff, never by editing the seed.
 *
 *   node scripts/check-campus-seed.mjs          check; exits 1 on any difference
 *   node scripts/check-campus-seed.mjs --write  rewrite both copies from the seed
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SEED = join(root, 'supabase/migrations/20261002140000_dw_campuses.sql');
const TOWNS_SEED = join(root, 'supabase/migrations/20261004180000_dw_campus_towns.sql');
const JSON_COPY = join(root, 'netlify/functions/lib/campuses.fallback.json');
const TS_COPY = join(root, 'src/data/campuses.fallback.ts');

// The list as tokens.ts carried it on 2 Oct 2026 (origin/main edfc9843), in order.
const IDS_2_OCT = [
  'au-paradise', 'au-adelaide-city', 'au-salisbury', 'au-south', 'au-clare-valley',
  'au-mount-barker', 'au-victor-harbor', 'au-copper-coast',
  'us-gwinnett', 'us-kennesaw', 'us-alpharetta', 'us-futuros-duluth', 'us-futuros-kennesaw',
  'us-futuros-grayson', 'us-franklin',
  'id-solo', 'id-cemani', 'id-bali', 'id-samarinda', 'id-langowan',
  'br-rio', 'other',
];

/** Split one SQL tuple body on top-level commas (quotes and array[...] respected). */
function splitTuple(body) {
  const out = [];
  let cur = '';
  let q = false;
  let depth = 0;
  for (let i = 0; i < body.length; i++) {
    const c = body[i];
    if (q) {
      if (c === "'" && body[i + 1] === "'") { cur += "''"; i++; continue; }
      if (c === "'") q = false;
      cur += c;
      continue;
    }
    if (c === "'") { q = true; cur += c; continue; }
    if (c === '[' || c === '(') depth++;
    if (c === ']' || c === ')') depth--;
    if (c === ',' && depth === 0) { out.push(cur.trim()); cur = ''; continue; }
    cur += c;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

function sqlValue(v) {
  if (v === 'null') return null;
  if (/^-?\d+$/.test(v)) return Number(v);
  if (v === "'{}'::text[]") return [];
  const arr = /^array\[(.*)\]::text\[\]$/s.exec(v);
  if (arr) return splitTuple(arr[1]).map(sqlValue);
  const str = /^'(.*)'$/s.exec(v);
  if (str) return str[1].replace(/''/g, "'");
  throw new Error(`Cannot read seed value: ${v}`);
}

/** The seed's other towns per campus id, from the towns migration's update (B09-07F). */
export function readTownsSeed(sql = readFileSync(TOWNS_SEED, 'utf8')) {
  const start = sql.indexOf('set towns = v.towns');
  if (start < 0) throw new Error('No towns update in the towns migration');
  const from = sql.indexOf('(values', start);
  const end = sql.indexOf(') as v(id, towns)', from);
  if (from < 0 || end < 0) throw new Error('Cannot read the towns update');
  const towns = {};
  const re = /^\s*\((.*)\),?\s*$/gm;
  const body = sql.slice(from + '(values'.length, end);
  let m;
  while ((m = re.exec(body))) {
    const [id, list] = splitTuple(m[1]).map(sqlValue);
    towns[id] = list;
  }
  return towns;
}

export function readSeed(sql = readFileSync(SEED, 'utf8'), townsById = readTownsSeed()) {
  const start = sql.indexOf('insert into public.dw_campuses');
  if (start < 0) throw new Error('No seed insert in the migration');
  const head = /insert into public\.dw_campuses \(([^)]*)\) values/.exec(sql.slice(start));
  const cols = head[1].split(',').map((s) => s.trim());
  const body = sql.slice(start + head[0].length, sql.indexOf('on conflict', start));
  const rows = [];
  const re = /^\s*\((.*)\),?\s*$/gm;
  let m;
  while ((m = re.exec(body))) {
    const vals = splitTuple(m[1]).map(sqlValue);
    if (vals.length !== cols.length) throw new Error(`Seed row has ${vals.length} values for ${cols.length} columns: ${m[1]}`);
    const r = Object.fromEntries(cols.map((c, i) => [c, vals[i]]));
    rows.push({
      id: r.id,
      name: r.name,
      city: r.city,
      towns: townsById[r.id] || [],
      region: r.region,
      congregation: r.congregation,
      timeZone: r.time_zone,
      sundayUntil: '16:00',
      videoUrl: r.video_url,
      pcoNames: r.pco_names,
      sortOrder: r.sort_order,
      active: true,
    });
  }
  return rows;
}

function tsCopy(rows) {
  return `/**
 * The reader app's bundled copy of the campus seed (B09-02). GENERATED by
 * \`node scripts/check-campus-seed.mjs --write\` from
 * supabase/migrations/20261002140000_dw_campuses.sql; do not edit by hand.
 * Shown when the campus list cannot be fetched. The live list is the
 * dw_campuses table, kept by the owner in /staff -> Settings -> Campuses.
 */
import type { CampusRow } from './campuses';

export const FALLBACK_CAMPUSES: CampusRow[] = ${JSON.stringify(
    rows.map(({ pcoNames: _p, active: _a, ...rest }) => rest),
    null,
    2,
  )};
`;
}

function main() {
  const rows = readSeed();
  const write = process.argv.includes('--write');
  if (write) {
    writeFileSync(JSON_COPY, JSON.stringify(rows, null, 2) + '\n');
    writeFileSync(TS_COPY, tsCopy(rows));
    console.log(`Wrote ${rows.length} campuses to both copies.`);
  }
  const problems = [];
  const ids = rows.map((r) => r.id);
  if (JSON.stringify(ids) !== JSON.stringify(IDS_2_OCT)) {
    problems.push(`The seed is not the 22 campuses of 2 Oct 2026, in order:\n  seed: ${ids.join(', ')}`);
  }
  const sorted = [...rows].sort((a, b) => a.sortOrder - b.sortOrder);
  if (sorted.some((r, i) => r.id !== rows[i].id)) problems.push('The seed sort_order does not follow its row order.');
  const json = JSON.parse(readFileSync(JSON_COPY, 'utf8'));
  if (JSON.stringify(json) !== JSON.stringify(rows)) problems.push('netlify/functions/lib/campuses.fallback.json differs from the seed (run with --write).');
  if (readFileSync(TS_COPY, 'utf8') !== tsCopy(rows)) problems.push('src/data/campuses.fallback.ts differs from the seed (run with --write).');
  if (problems.length) {
    console.error(problems.join('\n'));
    process.exit(1);
  }
  console.log(`Campus seed OK: ${rows.length} campuses, both bundled copies match.`);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
