/**
 * Shared rate limiter for Netlify functions.
 *
 * The old per-file limiters were module-level in-memory objects, scoped to a
 * single warm Lambda instance — Netlify scales horizontally and recycles
 * instances, so every cold start granted a fresh budget and concurrent
 * instances never shared counters. That made the nominal limits on the paid
 * endpoints (claude, polly-tts, elevenlabs-tts) ineffective under fan-out.
 *
 * This limiter records each hit in the Supabase table `rate_limit_hits`
 * (key text, created_at timestamptz default now()) and counts hits in the
 * window across ALL instances. If the table doesn't exist yet, or the DB
 * call fails, it degrades to the in-memory check only — never blocking a
 * legitimate request because of infra trouble (fail-open, same exposure as
 * the previous per-instance limiters).
 *
 * Table bootstrap (run once in Supabase SQL editor):
 *   create table if not exists rate_limit_hits (
 *     key text not null,
 *     created_at timestamptz not null default now()
 *   );
 *   create index if not exists rate_limit_hits_key_time_idx
 *     on rate_limit_hits (key, created_at);
 *   alter table rate_limit_hits enable row level security;
 */

const { createClient } = require("@supabase/supabase-js");

let sb;
function getDb() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) return null;
  if (!sb) sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  return sb;
}

// In-memory fallback — same semantics as the per-file limiters this replaces.
const memHits = {};
function checkMemRate(key, max, windowMs) {
  const now = Date.now();
  if (!memHits[key]) memHits[key] = [];
  memHits[key] = memHits[key].filter(t => now - t < windowMs);
  if (memHits[key].length >= max) return true;
  memHits[key].push(now);
  if (Object.keys(memHits).length > 500) {
    for (const k of Object.keys(memHits)) {
      if (memHits[k].every(t => now - t >= windowMs)) delete memHits[k];
    }
  }
  return false;
}

/**
 * Returns true when the caller has exceeded `max` hits in the window.
 * @param {string} name  Endpoint bucket name, e.g. "claude".
 * @param {string} ip    Client IP (first x-forwarded-for entry).
 * @param {number} max   Max hits per window.
 * @param {number} windowMs  Window size (default 60s).
 */
async function isSharedRateLimited(name, ip, max, windowMs = 60000) {
  const key = `${name}:${ip}`;

  // Cheap local check first — also the only enforcement if the DB is unavailable.
  if (checkMemRate(key, max, windowMs)) return true;

  try {
    const db = getDb();
    if (!db) return false;

    const { error: insErr } = await db.from("rate_limit_hits").insert({ key });
    if (insErr) return false; // table missing / DB down — memory-only mode

    const since = new Date(Date.now() - windowMs).toISOString();
    const { count, error } = await db
      .from("rate_limit_hits")
      .select("*", { count: "exact", head: true })
      .eq("key", key)
      .gte("created_at", since);
    if (error || count == null) return false;

    // Opportunistic cleanup so the table doesn't grow unbounded — scoped to
    // THIS bucket's keys. Unscoped, every 60-second caller (study, claude, the
    // TTS functions) purged rows older than ten minutes across the whole
    // table, collapsing any 24-hour bucket to ten minutes (review, 3 Sep 2026).
    if (Math.random() < 0.02) {
      await db.from("rate_limit_hits")
        .delete()
        .like("key", `${name}:%`)
        .lt("created_at", new Date(Date.now() - 10 * windowMs).toISOString());
    }

    return count > max;
  } catch {
    return false;
  }
}

// ── Count now, record later ─────────────────────────────────────────────────
// For a bucket that must only count SUCCESSFUL work (an email that actually
// went out), not attempts: a refused or failed request must not spend the
// person's allowance. Same storage, same fail-open posture as above.

function countMem(key, windowMs) {
  const now = Date.now();
  if (!memHits[key]) return 0;
  memHits[key] = memHits[key].filter(t => now - t < windowMs);
  return memHits[key].length;
}

function recordMem(key) {
  if (!memHits[key]) memHits[key] = [];
  memHits[key].push(Date.now());
}

/** Hits recorded for `name:id` inside the window — the higher of memory and the shared table. */
async function countSharedHits(name, id, windowMs) {
  const key = `${name}:${id}`;
  const local = countMem(key, windowMs);
  try {
    const db = getDb();
    if (!db) return local;
    const since = new Date(Date.now() - windowMs).toISOString();
    const { count, error } = await db
      .from("rate_limit_hits")
      .select("*", { count: "exact", head: true })
      .eq("key", key)
      .gte("created_at", since);
    if (error || count == null) return local;
    return Math.max(local, count);
  } catch {
    return local;
  }
}

/** Record one hit for `name:id`. Never throws. */
async function recordSharedHit(name, id) {
  const key = `${name}:${id}`;
  recordMem(key);
  try {
    const db = getDb();
    if (!db) return;
    await db.from("rate_limit_hits").insert({ key });
  } catch {
    /* memory-only mode */
  }
}

module.exports = { isSharedRateLimited, countSharedHits, recordSharedHit };
