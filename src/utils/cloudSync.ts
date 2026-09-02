/**
 * Cloud Sync — backs up and restores all user data via Supabase.
 *
 * Lifecycle:
 *   1. User logs in (email gate) -> syncOnStartup() pulls cloud data
 *   2. If cloud has data -> merge into localStorage
 *   3. If no cloud data -> push localStorage as first backup
 *   4. On any data change -> debounced push to cloud (5s delay)
 *
 * All sync is non-blocking. If it fails, localStorage still works.
 */
import { API_BASE } from './api-base';

// ── localStorage keys that sync to the cloud ──
const SYNC_KEYS = {
  journal:           'dw_journal',
  highlights:        'dw_highlights',   // Fix 2: sync verse highlights across devices
  streak:            'dw_streak_v2',
  activePlans:       'dw_activeplans',
  bookPlans:         'dw_book_plans',
  reactions:         'dw_reactions',
  pathwayProgress:   'dw_pathway_progress',
  fontSize:          'dw_font_size',
  darkMode:          'dw_dark',
  translation:       'dw_translation',
  translationManual: 'dw_translation_manual',
  profilePic:        'dw_profile_pic',
} as const;

// ── The long tail of smaller per-user keys. These don't each deserve a DB
// column, so they ride to the cloud inside a single `misc` JSONB bag (see the
// `misc` column added by supabase-misc-column.sql + user-sync.js). Without this
// they were lost on reinstall / a new device. Listed keys are synced verbatim;
// listed prefixes sweep up dynamic per-id keys (sermon fill-ins, book pointers). ──
const MISC_KEYS = [
  'dw_sermon_notes',         // free-form sermon notes index (Messages sermon view)
  'dw_user_story',           // "My Season" — the AI's personal context
  'dw_reading_slots',        // reading cadence / scheduled slots
  'dw_todays_plan_passages', // today's resolved plan passages
  'dw_plan_day_offset',
  'dw_chapters_per_day',
  'dw_comfort_daily',
  'dw_personal_media_url',
  'dw_prayed_for',           // prayer-wall "prayed for" set
  'dw_setup',                // persona / pathway — core personalization (newest-wins)
  'dw_lang',                 // UI language preference (newest-wins)
] as const;
const MISC_PREFIXES = ['dw_sermon_', 'dw_book_today_'];

/** The exact key predicate for the misc bag — shared by collectMisc (what we push)
 *  and applyMisc (what we accept). applyMisc MUST enforce this too: without it a
 *  poisoned or stale cloud bag could write ANY localStorage key on this device
 *  (dw_profile, dw_session_token, dw_journal — a side door around the
 *  tombstone-aware journal merge). */
function isSyncedMiscKey(k: string): boolean {
  return (MISC_KEYS as readonly string[]).includes(k) || MISC_PREFIXES.some(p => k.startsWith(p));
}

// Per-key last-write timestamps so the bag can do newest-wins cross-device instead
// of pure fill-only. Rides to the cloud as a regular misc key.
const MISC_META_KEY = 'dw_misc_meta';

// Free-text user content: ALWAYS fill-only (never clobber a local edit, even with a
// newer cloud timestamp), because these aren't structured for a real merge.
const AUTHORED_MISC = new Set(['dw_user_story', 'dw_sermon_notes', 'dw_prayed_for']);
function isAuthored(k: string): boolean {
  return AUTHORED_MISC.has(k) || k.startsWith('dw_sermon_');
}

function readMiscMeta(): Record<string, number> {
  try {
    const raw = localStorage.getItem(MISC_META_KEY);
    return raw ? (JSON.parse(raw) as Record<string, number>) : {};
  } catch { return {}; }
}

/** Write a misc-bag key locally, stamp its update time, and schedule a cloud push.
 *  Use this (instead of a bare localStorage.setItem) at every misc-key write site so
 *  the key (a) reliably backs up and (b) participates in newest-wins cross-device. */
export function syncMisc(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
    const meta = readMiscMeta();
    meta[key] = Date.now();
    localStorage.setItem(MISC_META_KEY, JSON.stringify(meta));
  } catch { /* quota */ }
  pushNow();
}

// The cloud's prayed-for set from the last pull, captured in applyMisc for the
// push-time union in collectMisc (see both sites).
let lastCloudPrayedFor: unknown[] | null = null;

/** Collect the misc-bag keys (static list + dynamic prefixes) + the meta map. */
function collectMisc(): Record<string, string> {
  const out: Record<string, string> = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k) continue;
      if (k === MISC_META_KEY || isSyncedMiscKey(k)) {
        const v = localStorage.getItem(k);
        if (v != null) out[k] = v;
      }
    }
  } catch { /* ignore */ }
  // dw_prayed_for is an add-only set and (being AUTHORED) fill-only on apply, so two
  // devices' sets would otherwise never converge — the cloud kept only the last
  // pusher's copy and a reinstall lost the other device's prayer entries. Push the
  // UNION of local + the last-pulled cloud copy instead (apply stays fill-only).
  if (Array.isArray(lastCloudPrayedFor) && lastCloudPrayedFor.length) {
    try {
      const localRaw = JSON.parse(out['dw_prayed_for'] || '[]') as unknown;
      const localArr = Array.isArray(localRaw) ? localRaw : [];
      out['dw_prayed_for'] = JSON.stringify([...new Set([...localArr, ...lastCloudPrayedFor])]);
    } catch { /* ignore */ }
  }
  return out;
}

/** Restore the misc bag.
 *  - Empty/absent local key  → fill from cloud (the reinstall / new-device case).
 *  - Free-text authored key  → never clobber existing local content (fill-only).
 *  - Other keys with a NEWER cloud timestamp → cloud wins (cross-device update),
 *    so e.g. persona/language/reading-cadence chosen on one device follow the user
 *    without ever overwriting a fresher local edit (per-key updatedAt comparison). */
function applyMisc(misc: unknown) {
  if (!misc || typeof misc !== 'object') return;
  const bag = misc as Record<string, unknown>;
  let cloudMeta: Record<string, number> = {};
  try { cloudMeta = bag[MISC_META_KEY] ? JSON.parse(String(bag[MISC_META_KEY])) : {}; } catch { /* ignore */ }
  const localMeta = readMiscMeta();

  // Remember the cloud's prayed-for set for collectMisc's push-time union.
  try {
    const cp = bag['dw_prayed_for'];
    if (typeof cp === 'string') {
      const parsed = JSON.parse(cp) as unknown;
      if (Array.isArray(parsed)) lastCloudPrayedFor = parsed;
    }
  } catch { /* ignore */ }

  for (const [k, v] of Object.entries(bag)) {
    if (k === MISC_META_KEY) continue;
    if (!isSyncedMiscKey(k)) continue; // whitelist — see isSyncedMiscKey
    if (typeof v !== 'string' || !v) continue;
    const local = localStorage.getItem(k);
    const localEmpty = local == null || local === '' || local === '[]' || local === '{}' || local === 'null';
    if (localEmpty) {
      try { localStorage.setItem(k, v); } catch { /* quota */ }
      continue;
    }
    if (isAuthored(k)) continue;                 // never clobber free text
    if ((cloudMeta[k] || 0) > (localMeta[k] || 0)) {
      try { localStorage.setItem(k, v); } catch { /* quota */ }
    }
  }

  // Merge meta (max timestamp per key) so future comparisons stay correct.
  const merged: Record<string, number> = { ...localMeta };
  for (const [k, t] of Object.entries(cloudMeta)) {
    if ((merged[k] || 0) < (t as number)) merged[k] = t as number;
  }
  try { localStorage.setItem(MISC_META_KEY, JSON.stringify(merged)); } catch { /* quota */ }
}

// Track the last known sync version from the server
let lastSyncVersion = 0;
let pushTimer: ReturnType<typeof setTimeout> | null = null;
let isSyncing = false;
// Data-safety gate: no push may run until one pull has SUCCEEDED this session —
// either real cloud data or a true "no cloud row yet" 404. A push before then
// (e.g. after a transient pull failure on a fresh install) would overwrite the
// user's only backup with unmerged/empty local state.
let pullSucceeded = false;
// Coalesced "push requested but not run" marker — set while gated on the pull, or
// while a push is already in flight (edits made after that push's snapshot would
// otherwise be silently dropped). The keepalive option is OR-ed across requests.
let pendingPush: { keepalive: boolean } | null = null;
// Startup-pull retry (backoff) — see syncOnStartup.
let pullRetryTimer: ReturnType<typeof setTimeout> | null = null;
let pullRetryDelayMs = 30000;

/** Atomically read-and-clear the coalesced push request (a helper function so TS
 *  can't stale-narrow the module variable across pushToCloud's await). */
function takePendingPush(): { keepalive: boolean } | null {
  const p = pendingPush;
  pendingPush = null;
  return p;
}

// ── Helpers ──

function readJSON(key: string, fallback: unknown = null): unknown {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function readString(key: string): string {
  return localStorage.getItem(key) || '';
}

/** Collect all syncable data from localStorage */
export function collectLocalData() {
  return {
    journal:           readJSON(SYNC_KEYS.journal, []) as unknown[],
    highlights:        readJSON(SYNC_KEYS.highlights, {}) as Record<string, unknown>,
    streak:            readJSON(SYNC_KEYS.streak, {}) as Record<string, unknown>,
    activePlans:       readJSON(SYNC_KEYS.activePlans, []) as unknown[],
    bookPlans:         readJSON(SYNC_KEYS.bookPlans, {}) as Record<string, unknown>,
    reactions:         readJSON(SYNC_KEYS.reactions, {}) as Record<string, unknown>,
    pathwayProgress:   readJSON(SYNC_KEYS.pathwayProgress, {}) as Record<string, unknown>,
    fontSize:          readString(SYNC_KEYS.fontSize),
    darkMode:          readString(SYNC_KEYS.darkMode),
    translation:       readString(SYNC_KEYS.translation),
    translationManual: readString(SYNC_KEYS.translationManual),
    profilePic:        readString(SYNC_KEYS.profilePic),
    misc:              collectMisc(),
  };
}

function asRecord(v: unknown): Record<string, unknown> | null {
  return (v && typeof v === 'object' && !Array.isArray(v)) ? v as Record<string, unknown> : null;
}

/** Pick between the cloud and the local copy of one plan (reading or book plan).
 *  Live vs live: more progress wins (local wins ties, as before). A removal
 *  tombstone ({ removed: true, removedAt }) wins over a live copy unless the live
 *  copy has MORE progress than the tombstone captured at quit time — so a quit
 *  sticks across devices, but real progress made elsewhere revives the plan.
 *  (NOTE: nothing writes these tombstones today — PlansScreen.resetPlan hard-
 *  deletes the key, so this branch is dormant. A quit sticks on the deleting
 *  device via user-sync's guard (an empty field is honoured only from a client
 *  whose lastSyncVersion matches the stored sync_version); another device that
 *  still holds a live copy will revive the plan through this union merge — a
 *  known pre-existing gap. Wiring the tombstone writer requires every
 *  dw_activeplans consumer to filter removed entries first.) */
type PlanCopy = { removed?: boolean; removedAt?: number };
function mergePlanCopies(cloudV: unknown, localV: unknown, progressOf: (p: unknown) => number): unknown {
  if (cloudV == null) return localV;
  if (localV == null) return cloudV;
  const c = cloudV as PlanCopy;
  const l = localV as PlanCopy;
  if (c.removed && l.removed) return (c.removedAt || 0) >= (l.removedAt || 0) ? c : l;
  if (c.removed) return progressOf(localV) > progressOf(cloudV) ? localV : cloudV;
  if (l.removed) return progressOf(cloudV) > progressOf(localV) ? cloudV : localV;
  return progressOf(cloudV) > progressOf(localV) ? cloudV : localV;
}

/** Drop removal tombstones old enough that every device has seen the quit.
 *  Missing/invalid removedAt ⇒ retain (never prune a deletion of unknown age). */
function prunePlanTombstones(map: Record<string, unknown>) {
  for (const [id, v] of Object.entries(map)) {
    const p = v as PlanCopy | null;
    if (p && p.removed && typeof p.removedAt === 'number' && Date.now() - p.removedAt > TOMBSTONE_TTL_MS) {
      delete map[id];
    }
  }
}

/** Write cloud data into localStorage (without overwriting non-empty local with empty cloud).
 *  NOTE: the journal is deliberately NOT in this list. syncOnStartup merges the journal
 *  (mergeJournals, tombstone-aware) and writes the merged result itself; applying the RAW
 *  cloud journal here would clobber that merge and resurrect deleted (tombstoned) entries.
 *  Every setItem is individually guarded so one quota failure (e.g. a huge restored
 *  profilePic) can't abort the rest of the restore. */
function applyCloudData(data: Record<string, unknown>) {
  // Fields kept on simple "non-empty cloud wins". Highlights/streak/plans get real
  // per-entry merges below because users edit them on several devices.
  const jsonFields: Array<[string, string]> = [
    ['reactions',        SYNC_KEYS.reactions],
    ['pathwayProgress', SYNC_KEYS.pathwayProgress],
  ];

  for (const [cloudKey, localKey] of jsonFields) {
    const cloudVal = data[cloudKey];
    if (cloudVal !== undefined && cloudVal !== null) {
      // Don't overwrite local data with empty cloud data
      const cloudStr = JSON.stringify(cloudVal);
      if (cloudStr !== '[]' && cloudStr !== '{}') {
        try { localStorage.setItem(localKey, cloudStr); } catch { /* quota */ }
      } else {
        // Cloud is empty — only write if local is also empty
        const local = localStorage.getItem(localKey);
        if (!local || local === '[]' || local === '{}' || local === 'null') {
          try { localStorage.setItem(localKey, cloudStr); } catch { /* quota */ }
        }
      }
    }
  }

  // Highlights — union-merge by verseKey instead of wholesale overwrite, so an
  // offline device's un-pushed highlights survive the next startup pull and two
  // devices' sets converge. Each entry carries `timestamp`; newer copy wins.
  {
    const cloudH = asRecord(data.highlights);
    if (cloudH && Object.keys(cloudH).length > 0) {
      const localH = asRecord(readJSON(SYNC_KEYS.highlights, {})) || {};
      const merged: Record<string, unknown> = { ...localH };
      for (const [k, cv] of Object.entries(cloudH)) {
        const lv = merged[k] as { timestamp?: number } | undefined;
        const ct = (cv as { timestamp?: number } | null)?.timestamp || 0;
        if (!lv || ct > (lv.timestamp || 0)) merged[k] = cv;
      }
      try { localStorage.setItem(SYNC_KEYS.highlights, JSON.stringify(merged)); } catch { /* quota */ }
    }
  }

  // Streak — keep the side whose lastDate is later (tie → higher count) instead of
  // blind cloud-wins: a second device pulling an older cloud copy must not
  // un-record today or regress the count another device already pushed.
  {
    const cs = asRecord(data.streak) as { count?: number; lastDate?: string } | null;
    if (cs && Object.keys(cs).length > 0) {
      const ls = asRecord(readJSON(SYNC_KEYS.streak, {})) as { count?: number; lastDate?: string } | null;
      const cd = String(cs.lastDate || '');
      const ld = String(ls?.lastDate || '');
      const cloudWins = !ls || Object.keys(ls).length === 0
        || cd > ld
        || (cd === ld && (cs.count || 0) > (ls?.count || 0));
      if (cloudWins) {
        try { localStorage.setItem(SYNC_KEYS.streak, JSON.stringify(cs)); } catch { /* quota */ }
      }
    }
  }

  // Book plans — per-book merge (most progress wins) instead of wholesale
  // overwrite, honouring removal tombstones the same way as activePlans below.
  {
    const cbp = asRecord(data.bookPlans);
    if (cbp && Object.keys(cbp).length > 0) {
      const lbp = asRecord(readJSON(SYNC_KEYS.bookPlans, {})) || {};
      const merged: Record<string, unknown> = { ...cbp };
      for (const [id, lp] of Object.entries(lbp)) {
        merged[id] = mergePlanCopies(merged[id], lp,
          p => (p as { currentChapter?: number } | undefined)?.currentChapter || 0);
      }
      prunePlanTombstones(merged);
      try { localStorage.setItem(SYNC_KEYS.bookPlans, JSON.stringify(merged)); } catch { /* quota */ }
    }
  }

  // Active plans — union-merge cloud + local by planId (the client stores active
  // plans as an object map { planId: progress }). Enabling cloud sync must never DROP
  // a plan that exists on only one device, so merge instead of overwrite: keep every
  // plan from both sides; on a per-plan conflict prefer the copy with more progress
  // (mergePlanCopies also honours removal tombstones so a quit can stick).
  {
    const cp = asRecord(data.activePlans) || {};
    const lp = asRecord(readJSON(SYNC_KEYS.activePlans, {})) || {};
    const merged: Record<string, unknown> = { ...cp };
    for (const [id, localPlan] of Object.entries(lp)) {
      merged[id] = mergePlanCopies(merged[id], localPlan,
        p => (p as { lastDay?: number } | undefined)?.lastDay || 0);
    }
    prunePlanTombstones(merged);
    if (Object.keys(merged).length > 0) {
      try { localStorage.setItem(SYNC_KEYS.activePlans, JSON.stringify(merged)); } catch { /* quota */ }
    }
  }

  const stringFields: Array<[string, string]> = [
    ['fontSize',          SYNC_KEYS.fontSize],
    ['darkMode',          SYNC_KEYS.darkMode],
    ['translation',       SYNC_KEYS.translation],
    ['translationManual', SYNC_KEYS.translationManual],
    ['profilePic',        SYNC_KEYS.profilePic],
  ];

  for (const [cloudKey, localKey] of stringFields) {
    const cloudVal = data[cloudKey];
    if (typeof cloudVal === 'string' && cloudVal) {
      try { localStorage.setItem(localKey, cloudVal); } catch { /* quota */ }
    }
  }

  // The misc bag (sermon fill-ins, "my season" story, reading cadence, etc.)
  applyMisc(data.misc);
}

/** Track conflicts detected during merge for potential user notification */
let lastMergeConflicts: Array<{ id: string; field: string; cloud: string; local: string }> = [];

export function getLastMergeConflicts() { return lastMergeConflicts; }

/** Merge journal arrays by entry id — keep newest version of each entry.
 *  When both sides modified the same entry, compare updatedAt timestamps.
 *  Conflicts (same timestamp, different content) are logged for UI notification.
 *
 *  Soft-delete tombstones ({ id, deleted:true, updatedAt }) ride through the same
 *  newest-wins path: a delete carries a fresh updatedAt, so it beats the older live
 *  copy on every device and the entry stays deleted instead of being resurrected.
 *  Tombstones are retained (so the deletion keeps propagating) but pruned after
 *  TOMBSTONE_TTL_MS to stop the journal array growing unbounded. */
const TOMBSTONE_TTL_MS = 180 * 24 * 60 * 60 * 1000; // 180 days
function mergeJournals(cloud: unknown[], local: unknown[]): unknown[] {
  const map = new Map<string, Record<string, unknown>>();
  lastMergeConflicts = [];

  for (const entry of (cloud || [])) {
    const e = entry as Record<string, unknown>;
    if (e && e.id) map.set(String(e.id), { ...e, _source: 'cloud' });
  }

  for (const entry of (local || [])) {
    const e = entry as Record<string, unknown>;
    if (!e || !e.id) continue;
    const existing = map.get(String(e.id));
    if (!existing) {
      map.set(String(e.id), e);
    } else {
      const existingTime = new Date(String(existing.updatedAt || existing.date || 0)).getTime();
      const localTime = new Date(String(e.updatedAt || e.date || 0)).getTime();
      if (localTime > existingTime) {
        map.set(String(e.id), e);
      } else if (localTime === existingTime) {
        // Same timestamp — check if content actually differs
        const cloudBody = String(existing.body || existing.text || '');
        const localBody = String(e.body || e.text || '');
        if (cloudBody !== localBody) {
          // True conflict: keep the longer version (more content preserved)
          lastMergeConflicts.push({
            id: String(e.id),
            field: 'body',
            cloud: cloudBody.slice(0, 80),
            local: localBody.slice(0, 80),
          });
          if (localBody.length >= cloudBody.length) {
            map.set(String(e.id), e);
          }
          // else keep cloud version (already in map)
        }
      }
      // else cloud is newer — keep existing (already in map)
    }
  }

  // Strip internal _source marker
  const result = Array.from(map.values())
    .map(e => {
      const { _source, ...rest } = e;
      return rest;
    })
    // Prune tombstones whose deletion is old enough that every device has synced it.
    .filter(e => {
      if (!e.deleted) return true;
      // NaN-safe: new Date(String(0)) parses as year 2000 in V8, which made a
      // tombstone with no updatedAt look ~26 years stale and prune instantly.
      // Unknown age ⇒ retain, so the deletion keeps propagating.
      const t = e.updatedAt ? new Date(String(e.updatedAt)).getTime() : NaN;
      return Number.isNaN(t) || (Date.now() - t) < TOMBSTONE_TTL_MS;
    });

  return result.sort((a, b) => {
    const aT = new Date(String(a.date || a.updatedAt || 0)).getTime();
    const bT = new Date(String(b.date || b.updatedAt || 0)).getTime();
    return bT - aT;
  });
}

// ── API calls ──

async function apiCall(action: string, payload: Record<string, unknown>, opts?: { keepalive?: boolean }) {
  const { authHeaders, setSessionToken } = await import('./sessionToken');
  const body = JSON.stringify({ action, ...payload });
  // keepalive lets the request finish after the page is torn down (background/close/
  // reload) — critical for the flush path — but the browser caps keepalive bodies at
  // 64KiB of the ENCODED body, so only use it when the payload is comfortably small;
  // otherwise fall back to a normal best-effort fetch (which is what happened before
  // anyway). Measure BYTES, not string length: multibyte es/pt/id journals encode
  // 1.1–3x their char count, and an over-quota keepalive fetch rejects outright
  // (the flush would silently never happen for exactly the heaviest users).
  const keepalive = !!opts?.keepalive && new Blob([body]).size < 60000;
  const resp = await fetch(`${API_BASE}/api/user-sync`, {
    method: 'POST',
    headers: authHeaders(),
    body,
    keepalive,
  });
  if (resp.status === 401) {
    throw new Error('AUTH_FAILED');
  }
  if (!resp.ok && resp.status !== 404) {
    throw new Error(`Sync API error: ${resp.status}`);
  }
  const data = await resp.json();
  // Store migration token if provided
  if (data.sessionToken) {
    setSessionToken(data.sessionToken);
  }
  return data;
}

/** Pull all cloud data for a user.
 *  Returns the data object, or null ONLY for a true "no cloud row yet" 404.
 *  THROWS on every other failure (network, 5xx, rate-limit): a failed pull must
 *  never be mistaken for "no data" — that's how the first-backup push used to
 *  overwrite the user's only backup with a fresh install's empty state. */
async function pullFromCloud(email: string) {
  const result = await apiCall('pull', { email });
  if (result.success && result.data) {
    lastSyncVersion = result.data.syncVersion || 0;
    pullSucceeded = true;
    return result.data;
  }
  // A parsed 404 body ({ success:false }) is the only path here: the account
  // genuinely has no cloud row, so seeding a first backup is safe.
  pullSucceeded = true;
  return null;
}

/** Push all local data to cloud */
export async function pushToCloud(email: string, opts?: { keepalive?: boolean }) {
  if (!email) return;
  if (!pullSucceeded || isSyncing) {
    // Gated (no successful pull yet this session) or already in flight — coalesce,
    // never drop: the request is satisfied by syncOnStartup's push-back after the
    // pull succeeds, or by the follow-up push in the finally block below.
    pendingPush = { keepalive: !!(pendingPush?.keepalive || opts?.keepalive) };
    return;
  }
  isSyncing = true;
  pendingPush = null; // this run's snapshot covers everything requested so far
  try {
    const data = collectLocalData();
    const result = await apiCall('push', { email, data, lastSyncVersion }, opts);
    if (result.success) {
      lastSyncVersion = result.syncVersion || lastSyncVersion;
      if (Array.isArray(result.miscWarnings) && result.miscWarnings.length) {
        console.warn('[CloudSync] Fields too large to back up (cloud kept its previous copy):', result.miscWarnings);
      }
    }
  } catch {
    // Silent fail — localStorage still works
  } finally {
    isSyncing = false;
    // A caller may have set pendingPush while this push was in flight — run one
    // follow-up push so those edits are never silently dropped.
    const p = takePendingPush();
    if (p) {
      void pushToCloud(email, { keepalive: p.keepalive });
    }
  }
}

/** Convenience: schedule a debounced push for the signed-in user, if any.
 *  Collapses the repeated "read dw_profile.email then schedulePush" boilerplate
 *  so callers that mutate a synced key don't each re-implement it. */
export function pushNow() {
  try {
    const email = (JSON.parse(localStorage.getItem('dw_profile') || '{}') || {}).email;
    if (email) schedulePush(email);
  } catch { /* ignore */ }
}

/**
 * Schedule a debounced push to cloud.
 * Call this after any data change (journal save, reaction, etc.)
 */
export function schedulePush(email: string) {
  if (!email) return;
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    pushToCloud(email);
    pushTimer = null;
  }, 5000);
}

/**
 * Main sync function — called once on app startup after user is authenticated.
 *
 * Logic:
 *   1. Pull cloud data
 *   2. If cloud exists → merge journal, apply other data, push merged state back
 *   3. If no cloud → push local data as first backup
 */
export async function syncOnStartup(email: string) {
  if (!email) return;
  if (pullRetryTimer) { clearTimeout(pullRetryTimer); pullRetryTimer = null; }

  let cloud;
  try {
    cloud = await pullFromCloud(email);
  } catch (err) {
    // Pull FAILED (network / 5xx / rate-limit) — NOT the same as "no cloud data".
    // Seeding a "first backup" here would overwrite the real backup with unmerged
    // (possibly fresh-install-empty) local state, so: leave the pullSucceeded gate
    // closed (all pushes stay queued), and retry the pull with backoff. Queued
    // work is pushed by the post-merge push-back once a pull finally succeeds.
    console.warn('[CloudSync] Pull failed — holding pushes, will retry:', err);
    pullRetryTimer = setTimeout(() => {
      pullRetryTimer = null;
      syncOnStartup(email);
    }, pullRetryDelayMs);
    pullRetryDelayMs = Math.min(pullRetryDelayMs * 2, 5 * 60000);
    return;
  }

  try {
    if (!cloud) {
      // First time user — upload everything as initial backup
      await pushToCloud(email);
      return;
    }

    // Cloud exists — merge journal entries
    const localJournal = readJSON(SYNC_KEYS.journal, []) as unknown[];
    const cloudJournal = (cloud.journal || []) as unknown[];

    if (cloudJournal.length > 0 || localJournal.length > 0) {
      const merged = mergeJournals(cloudJournal, localJournal);
      localStorage.setItem(SYNC_KEYS.journal, JSON.stringify(merged));
    }

    // Apply other cloud data (preferences, streak, plans, etc.)
    applyCloudData(cloud);

    // Push the merged state back to cloud
    await pushToCloud(email);

    // Notify components that data may have changed. Tag the journal event as
    // sync-driven so JournalScreen refreshes in place WITHOUT yanking the user to
    // the All Notes tab (that auto-switch is only wanted on a real user save).
    window.dispatchEvent(new Event('dw-cloud-sync'));
    window.dispatchEvent(new CustomEvent('dw-journal-updated', { detail: { source: 'sync' } }));

    // Notify if merge conflicts were detected
    if (lastMergeConflicts.length > 0) {
      window.dispatchEvent(new CustomEvent('dw-sync-conflicts', {
        detail: { conflicts: lastMergeConflicts }
      }));
    }

  } catch (err) {
    console.warn('[CloudSync] Sync failed, using localStorage:', err);
  }
}

/** Force an immediate push (e.g., before user logs out / on background / close).
 *  Uses keepalive so the request survives page teardown. */
export function flushSync(email: string) {
  if (pushTimer) {
    clearTimeout(pushTimer);
    pushTimer = null;
  }
  return pushToCloud(email, { keepalive: true });
}

/** Convenience: immediate keepalive flush for the signed-in user, if any. */
export function flushNow() {
  try {
    const email = (JSON.parse(localStorage.getItem('dw_profile') || '{}') || {}).email;
    if (email) flushSync(email);
  } catch { /* ignore */ }
}
