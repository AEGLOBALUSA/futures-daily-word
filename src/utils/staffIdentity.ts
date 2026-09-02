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
import { API_BASE, localApiBase } from './api-base';
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

/** window event: the app's staff session came or went (sign-in, sign-out, a
 *  token rejected at boot). Home's chip lock and the Settings card re-read. */
export const STAFF_SESSION_EVENT = 'dw-staff-session-changed';

export function setAppStaffSignIn(on: boolean) {
  try {
    if (on) localStorage.setItem(APP_SIGNIN_KEY, '1');
    else localStorage.removeItem(APP_SIGNIN_KEY);
  } catch { /* quota */ }
  try { window.dispatchEvent(new Event(STAFF_SESSION_EVENT)); } catch { /* ignore */ }
}

/** True while THIS app holds a pastor session: the in-app marker AND a token. */
export function isAppStaffSignedIn(): boolean {
  return hasAppStaffSignIn() && !!getStaffToken();
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

/** How the roster campus meets the device's campus:
 *  - 'roster' — an explicit sign-in: the roster is authoritative, it replaces
 *    whatever the device had (a campus pastor belongs to their campus).
 *  - 'fill'   — the silent boot restore: only an EMPTY campus is filled, so a
 *    campus the person picked on purpose (visiting another campus) survives.
 *  - 'keep'   — leave the device campus alone. */
export type CampusMode = 'roster' | 'fill' | 'keep';

/** The profile a staff record implies: their work email and roster name, plus
 *  the roster campus per `campus`; every other field (phone, city, …) stays as
 *  the device already has it. */
export function profileFromStaff(
  staff: StaffRecord,
  existing: UserProfile | null,
  opts?: { campus?: CampusMode },
): UserProfile {
  const base: UserProfile = { ...EMPTY_PROFILE, ...(existing || {}) };
  const { firstName, lastName } = splitStaffName(staff.name);
  const mode: CampusMode = opts?.campus || 'keep';
  const rosterCampus = String(staff.campusId || '').trim();
  const campus = mode === 'keep' || !rosterCampus
    ? base.campus
    : mode === 'roster' ? rosterCampus : (base.campus || rosterCampus);
  return {
    ...base,
    email: String(staff.email || '').trim().toLowerCase(),
    firstName: firstName || base.firstName,
    lastName: lastName || base.lastName,
    campus,
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
      // intake() drops the token on a 401 (expired after 14 days, or revoked in
      // /staff → People). The session's leftovers go with it: the in-app marker
      // and the campus code sign-in provisioned. A network failure keeps the
      // token, so it keeps both — next open retries.
      if (!staff && !getStaffToken()) {
        clearProvisionedPastorCode();
        setAppStaffSignIn(false);
      }
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
  // The campus code sign-in provisioned goes with the session (a hand-typed
  // one from before sign-in existed is left alone — see PASTOR_CODE_SRC_KEY).
  clearProvisionedPastorCode();
  try { await intake('logout'); } catch { /* token may already be dead */ }
  setStaffToken('');
  restoreCache = null;
}

// ── Campus pastor code ──────────────────────────────────────────────────────
// X-Pastor-Code for the home Campus Overview and the Settings admin rows. It is
// SHA-256(campusId + PASTOR_SECRET) — only the server can produce it — so
// sign-in asks pastor-admin `my-campus-code` for the signed-in pastor's OWN
// roster campus and stores it here, instead of the pastor typing eight hex
// characters someone once emailed them.

export const PASTOR_CODE_KEY = 'dw_pastor_code';
/** 'signin' when sign-in wrote dw_pastor_code; absent for a hand-typed code. */
const PASTOR_CODE_SRC_KEY = 'dw_pastor_code_src';
/** The roster campus a provisioned code belongs to — boot refetches when the
 *  signed-in pastor's campus is a different one. */
const PASTOR_CODE_CAMPUS_KEY = 'dw_pastor_code_campus';
/** window event: dw_pastor_code changed (HomeScreen refetches the overview). */
export const PASTOR_CODE_EVENT = 'dw-pastor-code-changed';

function announcePastorCode() {
  try { window.dispatchEvent(new Event(PASTOR_CODE_EVENT)); } catch { /* ignore */ }
}

export function getPastorCode(): string {
  try { return localStorage.getItem(PASTOR_CODE_KEY) || ''; } catch { return ''; }
}

/** Which roster campus the stored code was provisioned for ('' = hand-typed). */
function provisionedCodeCampus(): string {
  try {
    if (localStorage.getItem(PASTOR_CODE_SRC_KEY) !== 'signin') return '';
    return localStorage.getItem(PASTOR_CODE_CAMPUS_KEY) || '';
  } catch { return ''; }
}

/** Remove the code only if sign-in provisioned it. */
export function clearProvisionedPastorCode(): void {
  try {
    if (localStorage.getItem(PASTOR_CODE_SRC_KEY) !== 'signin') return;
    localStorage.removeItem(PASTOR_CODE_KEY);
    localStorage.removeItem(PASTOR_CODE_SRC_KEY);
    localStorage.removeItem(PASTOR_CODE_CAMPUS_KEY);
  } catch { return; }
  announcePastorCode();
}

/** A code the pastor typed themselves (Campus Overview prompt). No marker, so
 *  sign-out leaves it alone — it was never the session's to take. */
export function setHandTypedPastorCode(code: string): void {
  const clean = String(code || '').trim().toUpperCase();
  if (!clean) return;
  try {
    localStorage.setItem(PASTOR_CODE_KEY, clean);
    localStorage.removeItem(PASTOR_CODE_SRC_KEY);
    localStorage.removeItem(PASTOR_CODE_CAMPUS_KEY);
  } catch { return; }
  announcePastorCode();
}

/** The signed-in pastor's own campus code from the server (roster-derived, the
 *  client names no campus). null = no session, rejected token, or no network.
 *  `{ code: null }` = the server answered and this person has no campus code
 *  (admin / hub staff without a roster campus). */
export async function fetchMyCampusCode(): Promise<{ campusId: string | null; code: string | null } | null> {
  const token = getStaffToken();
  if (!token) return null;
  // Bounded: the sign-in card awaits this, and a hung socket must not hold it
  // on "Please wait…" — the boot path fills the code on the next open.
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), 8000) : null;
  try {
    const res = await fetch(`${localApiBase()}/api/pastor-admin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: 'my-campus-code' }),
      ...(controller ? { signal: controller.signal } : {}),
    });
    if (!res.ok) return null;
    const data = await res.json().catch(() => null) as { campusId?: string | null; code?: string | null } | null;
    if (!data) return null;
    const code = typeof data.code === 'string' && data.code.trim() ? data.code.trim().toUpperCase() : null;
    return { campusId: typeof data.campusId === 'string' && data.campusId ? data.campusId : null, code };
  } catch {
    return null;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** Provision dw_pastor_code for a signed-in pastor. Best effort, never throws.
 *  - explicit sign-in (`force`): any code a PREVIOUS sign-in provisioned is
 *    dropped first, so a failed fetch degrades to "no code, prompt shown" and
 *    never to a colleague's code under this pastor's name; the roster answer
 *    then replaces whatever is stored, hand-typed included;
 *  - boot restore (no `force`): fills when nothing is stored, and re-asks when
 *    the stored code was provisioned for a DIFFERENT roster campus (it repairs
 *    itself on the next open); a hand-typed code is respected;
 *  - no answer from the server (offline, dead token): nothing else changes. */
export async function provisionPastorCode(staff: StaffRecord, opts?: { force?: boolean }): Promise<boolean> {
  const force = !!opts?.force;
  const campusId = String(staff.campusId || '').trim();
  if (force) clearProvisionedPastorCode();
  if (!campusId) return false;
  if (!force && getPastorCode()) {
    const provisionedFor = provisionedCodeCampus();
    if (!provisionedFor || provisionedFor === campusId) return false;
  }
  const answer = await fetchMyCampusCode();
  if (!answer || !answer.code) return false;
  try {
    localStorage.setItem(PASTOR_CODE_KEY, answer.code);
    localStorage.setItem(PASTOR_CODE_SRC_KEY, 'signin');
    localStorage.setItem(PASTOR_CODE_CAMPUS_KEY, answer.campusId || campusId);
  } catch { return false; }
  announcePastorCode();
  return true;
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
