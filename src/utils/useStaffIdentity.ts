/**
 * useStaffIdentity — turn a staff record into this device's identity (and back).
 * Goes through UserContext so Home / Settings re-render in place; there is no
 * window event for dw_setup (context state is the mechanism).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useUser } from '../contexts/UserContext';
import { clearSessionToken } from './sessionToken';
import { resetSyncSession } from './cloudSync';
import {
  PASTOR_PERSONA, PASTOR_SETUP, SIGNED_OUT_SETUP, STAFF_SESSION_EVENT,
  isAppStaffSignedIn, profileFromStaff, provisionPastorCode, registerCloudIdentity, sameProfile, signOutStaff,
  type StaffRecord,
} from './staffIdentity';

/** Whether THIS app holds a pastor session right now (in-app marker + token),
 *  re-read whenever the session comes or goes — sign-in / sign-out in Settings,
 *  the Home chip, or a token rejected at boot — so a Home that stays mounted
 *  across tabs never shows a stale lock. */
export function useIsPastorSignedIn(): boolean {
  const [signedIn, setSignedIn] = useState(() => isAppStaffSignedIn());
  useEffect(() => {
    const onChange = () => setSignedIn(isAppStaffSignedIn());
    window.addEventListener(STAFF_SESSION_EVENT, onChange);
    onChange();
    return () => window.removeEventListener(STAFF_SESSION_EVENT, onChange);
  }, []);
  return signedIn;
}

/** Sources that mean "nobody chose this" — only these may be overwritten by the
 *  boot re-stamp. A real choice (settings / onboarding / upgrade) is the user's,
 *  including a sign-out or a different persona picked on another device and
 *  pulled in newest-wins; re-stamping over it starts a cross-device ping-pong. */
const AUTO_SOURCES = new Set(['default', 'sunday-guest']);

export function useStaffIdentity() {
  const { userProfile, setup, saveProfile, saveSetup } = useUser();
  // Latest context values for callers that captured this callback earlier
  // (the App boot effect runs once, before any sign-in).
  const latest = useRef({ userProfile, setup });
  latest.current = { userProfile, setup };

  /**
   * Stamp the pastor persona + roster name/email/campus, and provision the
   * campus pastor code.
   * Idempotent: an already-signed-in pastor re-opening the app writes nothing
   * (and pushes nothing to the cloud).
   *
   * `boot` is the silent restore path and is deliberately conservative — it
   * never switches the device to a different account (that needs the sign-in
   * form and its warning), never overrides a persona the user chose, only
   * FILLS an empty campus, and only fills a missing campus code.
   */
  const applyStaffIdentity = useCallback(async (staff: StaffRecord, opts?: { boot?: boolean }) => {
    const boot = !!opts?.boot;
    const campusMode = boot ? 'fill' : 'roster';
    const staffEmail = String(staff.email || '').trim().toLowerCase();
    const currentEmail = (latest.current.userProfile?.email || '').trim().toLowerCase();

    if (boot && currentEmail && currentEmail !== staffEmail) return;

    if (!boot && currentEmail !== staffEmail) {
      // The cloud token authenticates the OLD email server-side (auth.js reads
      // the token, not the body), and cloudSync's session state (pull gate,
      // sync version, queued push) still belongs to that account. Drop both,
      // then get a token for the pastor's email before any effect fires.
      clearSessionToken();
      resetSyncSession();
      await registerCloudIdentity(profileFromStaff(staff, latest.current.userProfile, { campus: campusMode }), PASTOR_PERSONA);
    }

    // Re-read after the await — a server profile merge may have landed.
    const { userProfile: current, setup: currentSetup } = latest.current;
    const next = profileFromStaff(staff, current, { campus: campusMode });
    // Profile first, then persona: saveSetup's cloud push reads dw_profile.email.
    if (!sameProfile(next, current)) saveProfile(next);

    const mayStamp = !boot
      || !currentSetup?.persona
      || AUTO_SOURCES.has(currentSetup.source || '');
    if (mayStamp && currentSetup?.persona !== PASTOR_PERSONA) saveSetup(PASTOR_SETUP);

    // Campus Overview auth — last, so a Home already on screen picks the code up
    // (dw-pastor-code-changed) with the campus + persona already in place.
    await provisionPastorCode(staff, { force: !boot });
  }, [saveProfile, saveSetup]);

  /** Sign out: revoke + forget the staff token (and the code it provisioned),
   *  back to the Church Member persona. The profile (and its cloud backup)
   *  stays — that is the person, not the role. */
  const clearStaffIdentity = useCallback(async () => {
    await signOutStaff();
    saveSetup(SIGNED_OUT_SETUP);
  }, [saveSetup]);

  return { applyStaffIdentity, clearStaffIdentity };
}
