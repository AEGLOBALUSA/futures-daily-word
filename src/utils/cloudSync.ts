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

// ── localStorage keys that sync to the cloud ──
const SYNC_KEYS = {
  journal:           'dw_journal',
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
  };
}

/** Write cloud data into localStorage (without overwriting non-empty local with empty cloud) */
function applyCloudData(data: Record<string, unknown>) {
  const jsonFields: Array<[string, string]> = [
    ['journal',         SYNC_KEYS.journal],
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
}

/** Track conflicts detected during merge for potential user notification */
let lastMergeConflicts: Array<{ id: string; field: string; cloud: string; local: string }> = [];

export function getLastMergeConflicts() { return lastMergeConflicts; }

/** Merge journal arrays by entry id — keep newest version of each entry.
 *  When both sides modified the same entry, compare updatedAt timestamps.
 *  Conflicts (same timestamp, different content) are logged for UI notification. */
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
  const result = Array.from(map.values()).map(e => {
    const { _source, ...rest } = e;
    return rest;
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
  const resp = await fetch('/api/user-sync', {
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
