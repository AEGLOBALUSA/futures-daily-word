/**
 * OpenBible.info Bible Geocoding Data → study_places.
 * ancient.jsonl (1,342 biblical places, OSIS verse refs) joined to modern.jsonl
 * (coordinates, "lon,lat" strings) through modern_associations by score.
 * CC BY 4.0; geometry from OpenStreetMap (ODbL). Point data only here.
 */
import { fetchCached, parseRef, formatRef, upsertBatches, recordSource, clearSource } from './common.mjs';

export const SOURCE = {
  id: 'openbible-geocoding',
  name: 'OpenBible.info Bible Geocoding Data',
  licence: 'CC BY 4.0',
  attribution: 'Bible place data from OpenBible.info Bible Geocoding Data (github.com/openbibleinfo/Bible-Geocoding-Data), licensed under CC BY 4.0. Contains geometry from OpenStreetMap (ODbL 1.0).',
  url: 'https://github.com/openbibleinfo/Bible-Geocoding-Data',
  share_alike: false,
  language: 'en',
};

const BASE = 'https://raw.githubusercontent.com/openbibleinfo/Bible-Geocoding-Data/main/data/';

const stripPseudo = s => String(s || '').replace(/<\/?(modern|ancient|source)[^>]*>/g, '').replace(/\s+/g, ' ').trim();

export function build(ancientLines, modernLines) {
  const modern = new Map();
  for (const line of modernLines) {
    if (!line.trim()) continue;
    const m = JSON.parse(line);
    modern.set(m.id, m);
  }
  const out = [];
  for (const line of ancientLines) {
    if (!line.trim()) continue;
    const a = JSON.parse(line);
    const refs = [];
    for (const v of a.verses || []) {
      const r = parseRef(v.osis);
      if (r) refs.push(formatRef(r));
    }
    if (!refs.length) continue;
    // Best modern location by association score; lonlat is "lon,lat".
    let lat = null, lon = null;
    const assoc = Object.entries(a.modern_associations || {}).sort((x, y) => (y[1].score || 0) - (x[1].score || 0));
    for (const [mid] of assoc) {
      const m = modern.get(mid);
      const ll = m && m.lonlat;
      if (ll) { const [lo, la] = String(ll).split(',').map(Number); if (Number.isFinite(la) && Number.isFinite(lo)) { lat = la; lon = lo; break; } }
    }
    const types = (a.types || []).join(', ');
    const comment = stripPseudo(a.comment);
    out.push({
      id: a.id,
      name: a.friendly_id || a.url_slug,
      lat, lon,
      description: [types, comment].filter(Boolean).join(' — ').slice(0, 600) || null,
      refs: [...new Set(refs)],
      source_id: SOURCE.id,
    });
  }
  return out;
}

export async function load(client, { dryRun = false } = {}) {
  const ancient = (await fetchCached(BASE + 'ancient.jsonl', 'geo-ancient.jsonl')).split('\n');
  const modern = (await fetchCached(BASE + 'modern.jsonl', 'geo-modern.jsonl')).split('\n');
  const rows = build(ancient, modern);
  process.stdout.write(`  places: ${rows.length} places, ${rows.filter(r => r.lat !== null).length} with coordinates\n`);
  if (dryRun) return rows.length;
  await recordSource(client, SOURCE, null);
  await clearSource(client, 'study_places', SOURCE.id);
  await upsertBatches(client, 'study_places', rows, { batch: 500 });
  await recordSource(client, SOURCE, rows.length);
  return rows.length;
}
