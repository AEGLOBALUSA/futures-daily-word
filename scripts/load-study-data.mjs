#!/usr/bin/env node
/**
 * Load the study data layer (docs/PASTOR-STUDY-PREACH-PLAN.md, Part 3) into the
 * Daily Word Supabase project. Repeatable: each source clears and reloads its
 * own rows and records itself in study_sources with the attribution its
 * licence requires.
 *
 *   node scripts/load-study-data.mjs crossrefs lexicon places [--dry-run]
 *   node scripts/load-study-data.mjs all
 *
 * Needs SUPABASE_URL + SUPABASE_SERVICE_KEY in the environment (the Daily Word
 * site's, id 5b332733-6735-44a9-90b9-ac21862f2615 — this repo's Netlify link
 * points elsewhere). Never print or commit them.
 */
import { db } from './study/common.mjs';

const LOADERS = {
  crossrefs: () => import('./study/crossrefs.mjs'),
  lexicon: () => import('./study/lexicon.mjs'),
  places: () => import('./study/places.mjs'),
  commentary: () => import('./study/commentary.mjs'),
  words: () => import('./study/words.mjs'),
  tagged: () => import('./study/tagged.mjs'),
  illustrations: () => import('./study/illustrations.mjs'),
  people: () => import('./study/people.mjs'),
  topics: () => import('./study/topics.mjs'),
  lectionary: () => import('./study/lectionary.mjs'),
};

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const names = args.filter(a => !a.startsWith('--'));
const wanted = names.includes('all') ? Object.keys(LOADERS) : names;
if (!wanted.length) {
  console.error(`usage: node scripts/load-study-data.mjs <${Object.keys(LOADERS).join('|')}|all> [--dry-run]`);
  process.exit(2);
}

// STUDY_LIMIT is a dry-run aid; a real load must never be silently truncated.
if (!dryRun && process.env.STUDY_LIMIT) {
  console.warn(`STUDY_LIMIT=${process.env.STUDY_LIMIT} ignored — limits apply to --dry-run only`);
  delete process.env.STUDY_LIMIT;
}
const client = dryRun ? null : db();
for (const name of wanted) {
  if (!LOADERS[name]) { console.error(`unknown source: ${name}`); process.exit(2); }
  process.stdout.write(`\n▶ ${name}${dryRun ? ' (dry run)' : ''}\n`);
  const started = Date.now();
  try {
    const mod = await LOADERS[name]();
    const n = await mod.load(client, { dryRun });
    process.stdout.write(`✓ ${name}: ${n} rows in ${((Date.now() - started) / 1000).toFixed(1)}s\n`);
  } catch (err) {
    console.error(`✗ ${name}: ${err && err.message}`);
    process.exit(1);
  }
}
