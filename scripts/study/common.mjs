/**
 * Shared helpers for the study data loaders (scripts/load-study-data.mjs).
 *
 * Run with the Daily Word Supabase service key in the environment — never
 * commit it, never print it:
 *   SUPABASE_URL=… SUPABASE_SERVICE_KEY=… node scripts/load-study-data.mjs <source>
 * (pull both with `NETLIFY_SITE_ID=5b332733-6735-44a9-90b9-ac21862f2615 netlify env:get NAME`;
 *  this repo's Netlify link points at a DIFFERENT site, so the id is not optional).
 */
import { createClient } from '@supabase/supabase-js';
import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
/** One book canon for the function and the loaders — netlify/functions/lib/study-ref.js. */
const ref = require('../../netlify/functions/lib/study-ref.js');
export const BOOKS = ref.BOOKS;
export const canonicalBook = ref.canonicalBook;
export const chapterCount = ref.chapterCount;
export const isOldTestament = ref.isOldTestament;
export const parseRef = ref.parseRef;
export const formatRef = ref.formatRef;

// ── Supabase ────────────────────────────────────────────────────────────────
export function db() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_KEY must be set (never commit them).');
  return createClient(url, key, { auth: { persistSession: false } });
}

/** Upsert in batches; throws on the first error with the batch index. */
export async function upsertBatches(client, table, rows, { batch = 1000, onConflict } = {}) {
  let done = 0;
  for (let i = 0; i < rows.length; i += batch) {
    const slice = rows.slice(i, i + batch);
    const { error } = await client.from(table).upsert(slice, onConflict ? { onConflict } : undefined);
    if (error) throw new Error(`${table} batch ${i / batch} failed: ${error.message}`);
    done += slice.length;
    if (done % (batch * 20) === 0 || done === rows.length) process.stdout.write(`  ${table}: ${done}/${rows.length}\n`);
  }
  return done;
}

/** Record the source + count so the Sources screen can print it. */
export async function recordSource(client, source, recordCount) {
  const { error } = await client.from('study_sources').upsert({
    ...source,
    loaded_at: new Date().toISOString(),
    record_count: recordCount,
  });
  if (error) throw new Error(`study_sources upsert failed: ${error.message}`);
}

/** Delete everything a source loaded before re-loading it (idempotent loads). */
export async function clearSource(client, table, sourceId) {
  const { error } = await client.from(table).delete().eq('source_id', sourceId);
  if (error) throw new Error(`clear ${table}/${sourceId} failed: ${error.message}`);
}

// ── Download cache (raw source files live outside the repo) ────────────────
export const CACHE_DIR = process.env.STUDY_CACHE_DIR || join(process.env.HOME || '.', '.cache', 'futures-study-sources');

export async function fetchCached(url, name, { binary = false } = {}) {
  mkdirSync(CACHE_DIR, { recursive: true });
  const file = join(CACHE_DIR, name);
  if (existsSync(file)) return binary ? readFileSync(file) : readFileSync(file, 'utf8');
  process.stdout.write(`  fetching ${url}\n`);
  const res = await fetch(url, { headers: { 'User-Agent': 'futures-daily-word study loader (ae@futures.global)' } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(file, buf);
  return binary ? buf : buf.toString('utf8');
}

/** Strip HTML to readable plain text (commentaries arrive as HTML fragments). */
export function htmlToText(html) {
  return String(html || '')
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6]|blockquote|tr)>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}
