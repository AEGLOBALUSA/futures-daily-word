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
] as const;
const MISC_PREFIXES = ['dw_sermon_', 'dw_book_today_'];

/** Collect the misc-bag keys (static list + dynamic prefixes) from localStorage. */
function collectMisc(): Record<string, string> {
  const out: Record<string, string> = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k) continue;
      if ((MISC_KEYS as readonly string[]).includes(k) || MISC_PREFIXES.some(p => k.startsWith(p))) {
        const v = localStorage.getItem(k);
        if (v != null) out[k] = v;
      }
    }
  } catch { /* ignore */ }
  return out;
}

/** Restore the misc bag — FILL-ONLY. Several of these keys are user-authored
 *  (dw_sermon_notes, dw_user_story, dw_prayed_for) and have no reliable per-change
 *  cloud push, so a blind cloud-wins overwrite on startup could permanently lose a
 *  fresh local edit that hadn't reached the cloud yet. We therefore only restore a
 *  key when local is missing/empty — exactly the reinstall / new-device case this
 *  bag exists for — and never clobber existing local content. */
function applyMisc(misc: unknown) {
  if (!misc || typeof misc !== 'object') return;
  for (const [k, v] of Object.entries(misc as Record<string, unknown>)) {
    if (typeof v !== 'string' || !v) continue;
    const local = localStorage.getItem(k);
    const localEmpty = local == null || local === '' || local === '[]' || local === '{}' || local === 'null';
    if (localEmpty) {
      try { localStorage.setItem(k, v); } catch { /* quota */ }
    }
  }
}

// Track the last known sync version from the server
let lastSyncVersion = 0;
let pushTimer: ReturnType<typeof setTimeout> | null = null;
let isSyncing = false;

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

/** Write cloud data into localStorage (without overwriting non-empty local with empty cloud).
 *  NOTE: the journal is deliberately NOT in this list. syncOnStartup merges the journal
 *  (mergeJournals, tombstone-aware) and writes the merged result itself; applying the RAW
 *  cloud journal here would clobber that merge and resurrect deleted (tombstoned) entries. */
function applyCloudData(data: Record<string, unknown>) {
  const jsonFields: Array<[string, string]> = [
    ['highlights',      SYNC_KEYS.highlights],   // Fix 2
    ['streak',          SYNC_KEYS.streak],
    ['activePlans',     SYNC_KEYS.activePlans],
    ['bookPlans',       SYNC_KEYS.bookPlans],
    ['reactions',        SYNC_KEYS.reactions],
    ['pathwayProgress', SYNC_KEYS.pathwayProgress],
  ];

  for (const [cloudKey, localKey] of jsonFields) {
    const cloudVal = data[cloudKey];
    if (cloudVal !== undefined && cloudVal !== null) {
      // Don't overwrite local data with empty cloud data
      const cloudStr = JSON.stringify(cloudVal);
      if (cloudStr !== '[]' && cloudStr !== '{}') {
        localStorage.setItem(localKey, cloudStr);
      } else {
        // Cloud is empty — only write if local is also empty
        const local = localStorage.getItem(localKey);
        if (!local || local === '[]' || local === '{}' || local === 'null') {
          localStorage.setItem(localKey, cloudStr);
        }
      }
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
      localStorage.setItem(localKey, cloudVal);
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
      const t = new Date(String(e.updatedAt || 0)).getTime();
      return !t || (Date.now() - t) < TOMBSTONE_TTL_MS;
    });

  return result.sort((a, b) => {
    const aT = new Date(String(a.date || a.updatedAt || 0)).getTime();
    const bT = new Date(String(b.date || b.updatedAt || 0)).getTime();
    return bT - aT;
  });
}

// ── API calls ──

async function apiCall(action: string, payload: Record<string, unknown>) {
  const { authHeaders, setSessionToken } = await import('./sessionToken');
  const resp = await fetch(`${API_BASE}/api/user-sync`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ action, ...payload }),
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

/** Pull all cloud data for a user */
async function pullFromCloud(email: string) {
  try {
    const result = await apiCall('pull', { email });
    if (result.success && result.data) {
      lastSyncVersion = result.data.syncVersion || 0;
      return result.data;
    }
    return null; // No cloud data (404)
  } catch {
    return null;
  }
}

/** Push all local data to cloud */
export async function pushToCloud(email: string) {
  if (!email || isSyncing) return;
  isSyncing = true;
  try {
    const data = collectLocalData();
    const result = await apiCall('push', { email, data });
    if (result.success) {
      lastSyncVersion = result.syncVersion || lastSyncVersion;
    }
  } catch {
    // Silent fail — localStorage still works
  } finally {
    isSyncing = false;
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

  try {
    const cloud = await pullFromCloud(email);

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

    // Notify components that data may have changed
    window.dispatchEvent(new Event('dw-cloud-sync'));
    window.dispatchEvent(new Event('dw-journal-updated'));

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

/** Force an immediate push (e.g., before user logs out) */
export function flushSync(email: string) {
  if (pushTimer) {
    clearTimeout(pushTimer);
    pushTimer = null;
  }
  return pushToCloud(email);
}
