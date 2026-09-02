/**
 * Pastor sign-in identity — the in-app half of the staff intake auth.
 *
 * Two token systems, kept apart on purpose:
 *   - dw_staff_token   → staff_sessions (intake.js). Proves "this is a pastor".
 *   - dw_session_token → profiles.session_token_hashes (user-sync / user-profile).
 *     Proves "this device may sync THIS email's data".
 * The staff token is never sent to user-sync, and vice versa.
 */
import { intake, getStaffToken, setStaffToken } from '../staff/api';
import { API_BASE } from './api-base';
import { setSessionToken } from './sessionToken';
import type { UserProfile, SetupState } from '../contexts/UserContext';

export interface StaffRecord {
  email: string;
  role: string;
  name: string;
  campusId?: string | null;
  isAdmin?: boolean;
}

/** Set only by the app's own sign-in card, cleared on sign-out. The /staff
 *  portal writes the SAME dw_staff_token, so without this marker a colleague's
 *  /staff login on a shared device would silently re-identify the Daily Word
 *  app (persona, name, email) for whoever else uses it. */
const APP_SIGNIN_KEY = 'dw_staff_app_signin';

export function hasAppStaffSignIn(): boolean {
  try { return localStorage.getItem(APP_SIGNIN_KEY) === '1'; } catch { return false; }
}

export function setAppStaffSignIn(on: boolean) {
  try {
    if (on) localStorage.setItem(APP_SIGNIN_KEY, '1');
    else localStorage.removeItem(APP_SIGNIN_KEY);
  } catch { /* quota */ }
}

export const PASTOR_PERSONA = 'pastor_leader';
/** Stamped on sign-in. `source: 'settings'` = a real choice, so saveSetup syncs it cross-device. */
export const PASTOR_SETUP: SetupState = { persona: PASTOR_PERSONA, source: 'settings' };
/** Stamped on sign-out. */
export const SIGNED_OUT_SETUP: SetupState = { persona: 'congregation', source: 'settings' };

/** Client-side mirror of the server allow-list (isAllowlistedEmail in intake-core):
 *  any @futures.church address, plus Ashley. Saves a rate-limited auth_status call
 *  for a curious congregant on shared church wifi. The server stays the authority. */
const BLOCKED_INBOXES = new Set(['hello@futures.church', 'care@futures.church']);

export function looksLikeStaffEmail(email: string): boolean {
  const e = String(email || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return false;
  if (BLOCKED_INBOXES.has(e)) return false; // generic inboxes, not people (mirrors intake-core)
  return e === 'ae@futures.global' || e.endsWith('@futures.church');
}

export function splitStaffName(name: string): { firstName: string; lastName: string } {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  return { firstName: parts[0] || '', lastName: parts.slice(1).join(' ') };
}

const EMPTY_PROFILE: UserProfile = { email: '', firstName: '', lastName: '', phone: '', church: '', city: '', campus: '' };

/** The profile a staff record implies: their work email and roster name; every
 *  other field (campus, phone, …) stays as the device already has it. */
export function profileFromStaff(staff: StaffRecord, existing: UserProfile | null): UserProfile {
  const base: UserProfile = { ...EMPTY_PROFILE, ...(existing || {}) };
  const { firstName, lastName } = splitStaffName(staff.name);
  return {
    ...base,
    email: String(staff.email || '').trim().toLowerCase(),
    firstName: firstName || base.firstName,
    lastName: lastName || base.lastName,
  };
}

/** Field-by-field profile equality. NOT JSON.stringify: profileFromStaff emits
 *  keys in EMPTY_PROFILE order while UserContext's server-merge emits its own
 *  order, so a string compare reported a difference on every single boot and
 *  re-wrote the profile (plus an `update` POST) forever. */
export function sameProfile(a: UserProfile | null, b: UserProfile | null): boolean {
  if (!a || !b) return a === b;
  return (['email', 'firstName', 'lastName', 'phone', 'church', 'city', 'campus'] as const)
    .every(k => (a[k] || '') === (b[k] || ''));
}

// One `me` round-trip per stored token, shared by the App boot and the Settings
// card. Only a positive answer is cached: a rejected token is already gone
// (intake() clears it on 401) and a network failure must be retried next time.
let restoreCache: { token: string; promise: Promise<StaffRecord | null> } | null = null;

/** Who the stored staff token belongs to.
 *  - no token        → null (no network)
 *  - token rejected  → null (intake() already cleared it on 401)
 *  - network / 5xx   → null, token kept for next time */
export function restoreStaffSession(): Promise<StaffRecord | null> {
  const token = getStaffToken();
  // No token, or a token this app never issued (a /staff sign-in on a shared
  // device) → no identity, and no network call.
  if (!token || !hasAppStaffSignIn()) { restoreCache = null; return Promise.resolve(null); }
  if (restoreCache && restoreCache.token === token) return restoreCache.promise;
  const promise = intake<{ staff?: StaffRecord }>('me')
    .then(res => (res && res.staff && res.staff.email ? res.staff : null))
    .catch(() => null)
    .then(staff => {
      if (!staff && restoreCache && restoreCache.token === token) restoreCache = null;
      return staff;
    });
  restoreCache = { token, promise };
  return promise;
}

/** Forget the cached `me` answer (after a fresh sign-in). */
export function resetStaffSessionCache() { restoreCache = null; }

/** Revoke the staff session server-side (best effort) and forget the token. */
export async function signOutStaff(): Promise<void> {
  // Drop the marker + cached `me` BEFORE the await: a cloud-sync remount during
  // the round-trip would otherwise mount a fresh card that reads the stale
  // positive cache and shows "Signed in" for a session being revoked.
  setAppStaffSignIn(false);
  restoreCache = null;
  try { await intake('logout'); } catch { /* token may already be dead */ }
  setStaffToken('');
  restoreCache = null;
}

/** Give this device a cloud-sync session for the pastor's email — the same
 *  unauthenticated `register` the EmailGate uses (fill-only server-side, so an
 *  existing profile is never overwritten). Needed whenever the email changes:
 *  user-sync / user-profile authenticate by TOKEN and ignore the email in the
 *  body, so the previous email's token would keep syncing the previous account
 *  and the profile sync would flip the email straight back. Best effort. */
export async function registerCloudIdentity(profile: UserProfile, persona: string): Promise<boolean> {
  let lang = 'en';
  try { lang = localStorage.getItem('dw_lang') || 'en'; } catch { /* ignore */ }
  try {
    const res = await fetch(`${API_BASE}/api/user-profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'register',
        email: profile.email,
        firstName: profile.firstName,
        lastName: profile.lastName,
        campus: profile.campus || '',
        persona,
        lang,
      }),
    });
    const data = await res.json().catch(() => ({})) as { sessionToken?: string };
    if (data && data.sessionToken) {
      setSessionToken(data.sessionToken);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}
