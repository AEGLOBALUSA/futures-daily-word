/**
 * Her Planning Center campus, for the campus guess (B09-07F).
 *
 * A signed-in reader with no campus yet (her Planning Center record had no
 * campus when she signed up, or its spelling was only matched to a campus
 * later in /staff) should be asked about the campus her church record names,
 * not handed her region's list. The app holds her email (her profile); the
 * same read-only pco-sync `lookup` the email gate relies on turns it into a
 * campus id on the server, Planning Center's campus name mapped through the
 * owner's campus rows. Never `sync`: that writes her profile, and only her tap
 * on Yes may save a campus.
 *
 * Held in memory only, once per email per page load. No answer (no Planning
 * Center match, a rate limit, offline, slow) is just "no campus": the guess
 * goes on to her town and region.
 */
import { useEffect, useState } from 'react';
import { API_BASE } from './api-base';
import { authHeaders } from './sessionToken';

export const PCO_LOOKUP_URL = `${API_BASE}/api/pco-sync`;
/** Past this the card stops waiting and asks from her town or region. */
export const PCO_LOOKUP_TIMEOUT_MS = 4000;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ID_SHAPE = /^[a-z]{2}-[a-z0-9-]{2,40}$/;

/** Answers the server gave this page load, per email (a failed call is not kept, so the next open tries again). */
const answered = new Map<string, Promise<string | null>>();

function emailKey(email: string | null | undefined): string {
  const key = String(email || '').trim().toLowerCase();
  return EMAIL.test(key) ? key : '';
}

/**
 * The campus id her Planning Center record names, or null. Pure apart from the
 * one request; a proven reader's token rides along so her lookup is not held to
 * the anonymous per-connection limit.
 */
export function lookupPcoCampus(
  email: string,
  fetchImpl: typeof fetch = (...args) => fetch(...args),
  timeoutMs = PCO_LOOKUP_TIMEOUT_MS,
): Promise<string | null> {
  const key = emailKey(email);
  if (!key) return Promise.resolve(null);
  const known = answered.get(key);
  if (known) return known;

  let timer: ReturnType<typeof setTimeout> | undefined;
  const late = new Promise<'late'>((resolve) => { timer = setTimeout(() => resolve('late'), timeoutMs); });
  const call = (async (): Promise<string | null | 'failed'> => {
    try {
      const res = await fetchImpl(PCO_LOOKUP_URL, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ action: 'lookup', email: key }),
      });
      if (!res.ok) return 'failed';
      const data = await res.json();
      const id = data && data.found && data.profile && typeof data.profile.campus === 'string'
        ? data.profile.campus.trim()
        : '';
      return ID_SHAPE.test(id) ? id : null;
    } catch {
      return 'failed';
    }
  })();

  const result = Promise.race([call, late]).then((r) => {
    clearTimeout(timer);
    if (r === 'failed' || r === 'late') {
      answered.delete(key);
      return null;
    }
    return r;
  });
  answered.set(key, result);
  return result;
}

/**
 * Her Planning Center campus for a screen. `pending` is true until the lookup
 * answers, so the card can wait rather than swap its question. Off (or no
 * email): nothing is looked up and nothing is pending.
 */
export function usePcoCampus(email: string | null | undefined, enabled: boolean): { campusId: string | null; pending: boolean } {
  const key = enabled ? emailKey(email) : '';
  const [answer, setAnswer] = useState<{ key: string; campusId: string | null } | null>(null);

  useEffect(() => {
    if (!key) return;
    let alive = true;
    void lookupPcoCampus(key).then((campusId) => { if (alive) setAnswer({ key, campusId }); });
    return () => { alive = false; };
  }, [key]);

  if (!key) return { campusId: null, pending: false };
  if (!answer || answer.key !== key) return { campusId: null, pending: true };
  return { campusId: answer.campusId, pending: false };
}

/** Test seam. */
export function __resetPcoCampusForTests(): void {
  answered.clear();
}
