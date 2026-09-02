import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const api = vi.hoisted(() => ({
  token: '',
  intake: vi.fn(),
  setStaffToken: vi.fn((t: string) => { api.token = t; }),
}));

vi.mock('../staff/api', () => ({
  getStaffToken: () => api.token,
  setStaffToken: api.setStaffToken,
  intake: api.intake,
}));

import {
  looksLikeStaffEmail, splitStaffName, profileFromStaff, sameProfile,
  restoreStaffSession, resetStaffSessionCache, signOutStaff, registerCloudIdentity,
  setAppStaffSignIn, hasAppStaffSignIn,
  provisionPastorCode, clearProvisionedPastorCode, getPastorCode, fetchMyCampusCode, PASTOR_CODE_EVENT,
  setHandTypedPastorCode, isAppStaffSignedIn, STAFF_SESSION_EVENT,
} from './staffIdentity';

const ASHLEY = { email: 'ae@futures.global', role: 'admin', campusId: null, name: 'Ashley Evans', isAdmin: true };

beforeEach(() => {
  api.token = '';
  api.intake.mockReset();
  api.setStaffToken.mockClear();
  resetStaffSessionCache();
  setAppStaffSignIn(true); // signed in through the app, not the /staff portal
});

describe('looksLikeStaffEmail', () => {
  it('accepts any @futures.church address and Ashley, case-insensitively', () => {
    expect(looksLikeStaffEmail('josh@futures.church')).toBe(true);
    expect(looksLikeStaffEmail('  AE@Futures.Global ')).toBe(true);
  });
  it('rejects everything else without a network call', () => {
    expect(looksLikeStaffEmail('someone@gmail.com')).toBe(false);
    expect(looksLikeStaffEmail('futures.church')).toBe(false);
    expect(looksLikeStaffEmail('')).toBe(false);
  });
  it('rejects the generic inboxes the server also blocks', () => {
    expect(looksLikeStaffEmail('hello@futures.church')).toBe(false);
    expect(looksLikeStaffEmail('care@futures.church')).toBe(false);
  });
});

describe('sameProfile', () => {
  const a = { email: 'a@b.c', firstName: 'A', lastName: 'B', phone: '', church: '', city: '', campus: 'x' };
  it('ignores key order (the every-boot rewrite bug)', () => {
    const reordered = { firstName: 'A', campus: 'x', email: 'a@b.c', lastName: 'B', city: '', church: '', phone: '' };
    expect(JSON.stringify(reordered)).not.toBe(JSON.stringify(a)); // the old check
    expect(sameProfile(a, reordered)).toBe(true);
  });
  it('still sees a real difference', () => {
    expect(sameProfile(a, { ...a, firstName: 'Z' })).toBe(false);
    expect(sameProfile(a, null)).toBe(false);
  });
});

describe('splitStaffName / profileFromStaff', () => {
  it('splits the roster display name into first + rest', () => {
    expect(splitStaffName('Ashley Evans')).toEqual({ firstName: 'Ashley', lastName: 'Evans' });
    expect(splitStaffName('  Ryan de la Cruz ')).toEqual({ firstName: 'Ryan', lastName: 'de la Cruz' });
    expect(splitStaffName('')).toEqual({ firstName: '', lastName: '' });
  });

  it('sets email + name from the roster and keeps every other profile field', () => {
    const existing = { email: 'old@example.com', firstName: 'Old', lastName: 'Name', phone: '555', church: 'Futures', city: 'Athens', campus: 'us-alpharetta' };
    expect(profileFromStaff(ASHLEY, existing)).toEqual({
      ...existing, email: 'ae@futures.global', firstName: 'Ashley', lastName: 'Evans',
    });
  });

  it('keeps the device name when the roster has none, and lower-cases the email', () => {
    const existing = { email: 'x@futures.church', firstName: 'Sam', lastName: 'Lee', phone: '', church: '', city: '', campus: '' };
    const staff = { email: 'Sam.Lee@Futures.Church', role: 'campus', campusId: 'us-alpharetta', name: '' };
    expect(profileFromStaff(staff, existing)).toEqual({ ...existing, email: 'sam.lee@futures.church' });
  });

  it('builds a full profile from nothing', () => {
    expect(profileFromStaff(ASHLEY, null)).toEqual({
      email: 'ae@futures.global', firstName: 'Ashley', lastName: 'Evans', phone: '', church: '', city: '', campus: '',
    });
  });
});

describe('restoreStaffSession', () => {
  it('resolves null with no network when there is no token', async () => {
    expect(await restoreStaffSession()).toBeNull();
    expect(api.intake).not.toHaveBeenCalled();
  });

  it('returns null, without a network call, when the token came from /staff (no in-app marker)', async () => {
    api.token = 'z'.repeat(64);
    setAppStaffSignIn(false);
    expect(await restoreStaffSession()).toBeNull();
    expect(api.intake).not.toHaveBeenCalled();
  });

  it('returns the staff record and shares one `me` call per token', async () => {
    api.token = 'a'.repeat(64);
    api.intake.mockResolvedValue({ staff: ASHLEY, pendingCount: 0 });
    const [a, b] = await Promise.all([restoreStaffSession(), restoreStaffSession()]);
    expect(a).toEqual(ASHLEY);
    expect(b).toEqual(ASHLEY);
    expect(await restoreStaffSession()).toEqual(ASHLEY);
    expect(api.intake).toHaveBeenCalledTimes(1);
    expect(api.intake).toHaveBeenCalledWith('me');
  });

  it('resolves null on a rejected token and does not cache the failure', async () => {
    api.token = 'b'.repeat(64);
    api.intake.mockRejectedValueOnce(Object.assign(new Error('Sign in required'), { status: 401 }));
    expect(await restoreStaffSession()).toBeNull();
    api.intake.mockResolvedValueOnce({ staff: ASHLEY });
    expect(await restoreStaffSession()).toEqual(ASHLEY); // retried, not served from cache
    expect(api.intake).toHaveBeenCalledTimes(2);
  });

  it('resolves null (token kept) when the network fails', async () => {
    api.token = 'c'.repeat(64);
    api.intake.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    expect(await restoreStaffSession()).toBeNull();
    expect(api.setStaffToken).not.toHaveBeenCalled();
    expect(api.token).toBe('c'.repeat(64));
  });

  it('a token the server rejects takes the in-app marker and the provisioned code with it', async () => {
    api.token = 'g'.repeat(64);
    localStorage.setItem('dw_pastor_code', 'ABCD1234');
    localStorage.setItem('dw_pastor_code_src', 'signin');
    // intake() clears the token on a 401 before throwing
    api.intake.mockImplementationOnce(async () => { api.token = ''; throw Object.assign(new Error('Sign in required'), { status: 401 }); });
    const heard = vi.fn();
    window.addEventListener(STAFF_SESSION_EVENT, heard);
    expect(await restoreStaffSession()).toBeNull();
    expect(hasAppStaffSignIn()).toBe(false);
    expect(getPastorCode()).toBe('');
    expect(heard).toHaveBeenCalled();
    window.removeEventListener(STAFF_SESSION_EVENT, heard);
  });

  it('a network failure keeps the marker and the provisioned code for next time', async () => {
    api.token = 'h'.repeat(64);
    localStorage.setItem('dw_pastor_code', 'ABCD1234');
    localStorage.setItem('dw_pastor_code_src', 'signin');
    api.intake.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    expect(await restoreStaffSession()).toBeNull();
    expect(hasAppStaffSignIn()).toBe(true);
    expect(getPastorCode()).toBe('ABCD1234');
  });

  it('isAppStaffSignedIn needs BOTH the in-app marker and a token', () => {
    api.token = 'i'.repeat(64);
    expect(isAppStaffSignedIn()).toBe(true);
    setAppStaffSignIn(false);
    expect(isAppStaffSignedIn()).toBe(false); // a /staff-portal token alone never counts
    setAppStaffSignIn(true);
    api.token = '';
    expect(isAppStaffSignedIn()).toBe(false);
  });
});

describe('signOutStaff', () => {
  it('revokes server-side and forgets the token', async () => {
    api.token = 'd'.repeat(64);
    api.intake.mockResolvedValue({ ok: true });
    await signOutStaff();
    expect(api.intake).toHaveBeenCalledWith('logout');
    expect(api.setStaffToken).toHaveBeenCalledWith('');
    expect(api.token).toBe('');
    expect(hasAppStaffSignIn()).toBe(false);
  });

  it('still forgets the token when logout fails', async () => {
    api.token = 'e'.repeat(64);
    api.intake.mockRejectedValue(new Error('offline'));
    await signOutStaff();
    expect(api.token).toBe('');
  });
});

describe('registerCloudIdentity', () => {
  const profile = { email: 'ae@futures.global', firstName: 'Ashley', lastName: 'Evans', phone: '', church: '', city: '', campus: 'us-alpharetta' };

  it('registers unauthenticated and stores the cloud-sync session token', async () => {
    const fetchMock = vi.fn(async () => ({ json: async () => ({ success: true, sessionToken: 'cloud-token' }) }));
    vi.stubGlobal('fetch', fetchMock);
    expect(await registerCloudIdentity(profile, 'pastor_leader')).toBe(true);
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect((init.headers as Record<string, string>).Authorization).toBeUndefined();
    const body = JSON.parse(String(init.body));
    expect(body).toMatchObject({ action: 'register', email: 'ae@futures.global', firstName: 'Ashley', lastName: 'Evans', campus: 'us-alpharetta', persona: 'pastor_leader' });
    expect(localStorage.getItem('dw_session_token')).toBe('cloud-token');
    vi.unstubAllGlobals();
  });

  it('is best effort: a failed call returns false and throws nothing', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch'); }));
    expect(await registerCloudIdentity(profile, 'pastor_leader')).toBe(false);
    expect(localStorage.getItem('dw_session_token')).toBeNull();
    vi.unstubAllGlobals();
  });
});

describe('profileFromStaff — roster campus', () => {
  const staff = { email: 'sam.lee@futures.church', role: 'campus', campusId: 'us-alpharetta', name: 'Sam Lee' };
  const existing = { email: '', firstName: '', lastName: '', phone: '', church: '', city: '', campus: 'us-gwinnett' };

  it('roster (explicit sign-in) replaces the device campus', () => {
    expect(profileFromStaff(staff, existing, { campus: 'roster' }).campus).toBe('us-alpharetta');
  });
  it('fill (boot restore) only takes an empty campus', () => {
    expect(profileFromStaff(staff, existing, { campus: 'fill' }).campus).toBe('us-gwinnett');
    expect(profileFromStaff(staff, { ...existing, campus: '' }, { campus: 'fill' }).campus).toBe('us-alpharetta');
    expect(profileFromStaff(staff, null, { campus: 'fill' }).campus).toBe('us-alpharetta');
  });
  it('keep (default) and a record without a campus leave the device campus alone', () => {
    expect(profileFromStaff(staff, existing).campus).toBe('us-gwinnett');
    expect(profileFromStaff({ ...staff, campusId: null }, existing, { campus: 'roster' }).campus).toBe('us-gwinnett');
  });
});

describe('campus pastor code provisioning', () => {
  const CAMPUS_STAFF = { email: 'sam.lee@futures.church', role: 'campus', campusId: 'us-alpharetta', name: 'Sam Lee' };
  const answer = (body: unknown, ok = true) => vi.fn(async () => ({ ok, status: ok ? 200 : 401, json: async () => body }));

  beforeEach(() => { api.token = 'k'.repeat(64); });
  afterEach(() => { vi.unstubAllGlobals(); });

  it('asks pastor-admin for the signed-in pastor\'s own code with the staff token', async () => {
    const fetchMock = answer({ campusId: 'us-alpharetta', code: 'abcd1234' });
    vi.stubGlobal('fetch', fetchMock);
    expect(await fetchMyCampusCode()).toEqual({ campusId: 'us-alpharetta', code: 'ABCD1234' });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toMatch(/\/api\/pastor-admin$/);
    expect((init.headers as Record<string, string>).Authorization).toBe(`Bearer ${'k'.repeat(64)}`);
    expect(JSON.parse(String(init.body))).toEqual({ action: 'my-campus-code' });
  });

  it('passes the server\'s reason through when a campus exists but no code is minted, and provisions nothing', async () => {
    // A self-assigned campus (the pastor picked it on /staff) awaits Ashley's confirmation.
    vi.stubGlobal('fetch', answer({ campusId: 'us-alpharetta', code: null, reason: 'campus_not_confirmed' }));
    expect(await fetchMyCampusCode()).toStrictEqual({ campusId: 'us-alpharetta', code: null, reason: 'campus_not_confirmed' });
    expect(await provisionPastorCode(CAMPUS_STAFF, { force: true })).toBe(false);
    expect(getPastorCode()).toBe('');
    expect(localStorage.getItem('dw_pastor_code_src')).toBeNull();
    expect(localStorage.getItem('dw_pastor_code_campus')).toBeNull();
    // No reason from the server → the key is absent, not undefined.
    vi.stubGlobal('fetch', answer({ campusId: 'us-alpharetta', code: 'abcd1234' }));
    expect(await fetchMyCampusCode()).toStrictEqual({ campusId: 'us-alpharetta', code: 'ABCD1234' });
  });

  it('sign-in stores the roster code, marks it provisioned, and announces it', async () => {
    vi.stubGlobal('fetch', answer({ campusId: 'us-alpharetta', code: 'abcd1234' }));
    const heard = vi.fn();
    window.addEventListener(PASTOR_CODE_EVENT, heard);
    expect(await provisionPastorCode(CAMPUS_STAFF, { force: true })).toBe(true);
    expect(getPastorCode()).toBe('ABCD1234');
    expect(localStorage.getItem('dw_pastor_code_src')).toBe('signin');
    expect(heard).toHaveBeenCalledTimes(1);
    window.removeEventListener(PASTOR_CODE_EVENT, heard);
  });

  it('boot restore fills a missing code and respects a hand-typed one — no network when one is stored', async () => {
    localStorage.setItem('dw_pastor_code', 'HAND1234'); // no marker = hand-typed
    const fetchMock = answer({ campusId: 'us-alpharetta', code: 'abcd1234' });
    vi.stubGlobal('fetch', fetchMock);
    expect(await provisionPastorCode(CAMPUS_STAFF)).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(getPastorCode()).toBe('HAND1234');
    localStorage.removeItem('dw_pastor_code');
    expect(await provisionPastorCode(CAMPUS_STAFF)).toBe(true);
    expect(getPastorCode()).toBe('ABCD1234');
    expect(localStorage.getItem('dw_pastor_code_campus')).toBe('us-alpharetta');
    // Same campus already provisioned → nothing to do.
    expect(await provisionPastorCode(CAMPUS_STAFF)).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('boot restore repairs a code provisioned for a DIFFERENT roster campus', async () => {
    localStorage.setItem('dw_pastor_code', 'GWIN0000');
    localStorage.setItem('dw_pastor_code_src', 'signin');
    localStorage.setItem('dw_pastor_code_campus', 'us-gwinnett');
    const fetchMock = answer({ campusId: 'us-alpharetta', code: 'abcd1234' });
    vi.stubGlobal('fetch', fetchMock);
    expect(await provisionPastorCode(CAMPUS_STAFF)).toBe(true);
    expect(getPastorCode()).toBe('ABCD1234');
    expect(localStorage.getItem('dw_pastor_code_campus')).toBe('us-alpharetta');
  });

  it('sign-in drops a colleague\'s provisioned code BEFORE asking, so a failed fetch never keeps it', async () => {
    localStorage.setItem('dw_pastor_code', 'GWIN0000');
    localStorage.setItem('dw_pastor_code_src', 'signin');
    localStorage.setItem('dw_pastor_code_campus', 'us-gwinnett');
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch'); }));
    expect(await provisionPastorCode(CAMPUS_STAFF, { force: true })).toBe(false);
    expect(getPastorCode()).toBe(''); // prompt shows; boot refetches next open
    vi.stubGlobal('fetch', answer({ error: 'Rate limited' }, false));
    localStorage.setItem('dw_pastor_code', 'GWIN0000');
    localStorage.setItem('dw_pastor_code_src', 'signin');
    expect(await provisionPastorCode(CAMPUS_STAFF, { force: true })).toBe(false);
    expect(getPastorCode()).toBe('');
  });

  it('sign-in replaces a hand-typed code on success, and a network failure leaves a hand-typed one alone', async () => {
    localStorage.setItem('dw_pastor_code', 'HAND1234');
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch'); }));
    expect(await provisionPastorCode(CAMPUS_STAFF, { force: true })).toBe(false);
    expect(getPastorCode()).toBe('HAND1234');
    vi.stubGlobal('fetch', answer({ campusId: 'us-alpharetta', code: 'abcd1234' }));
    expect(await provisionPastorCode(CAMPUS_STAFF, { force: true })).toBe(true);
    expect(getPastorCode()).toBe('ABCD1234');
    expect(localStorage.getItem('dw_pastor_code_src')).toBe('signin');
  });

  it('a hand-typed code written over a provisioned one loses the marker, so sign-out keeps it', async () => {
    vi.stubGlobal('fetch', answer({ campusId: 'us-alpharetta', code: 'abcd1234' }));
    await provisionPastorCode(CAMPUS_STAFF, { force: true });
    const heard = vi.fn();
    window.addEventListener(PASTOR_CODE_EVENT, heard);
    setHandTypedPastorCode(' 67c1b2b4 ');
    expect(getPastorCode()).toBe('67C1B2B4');
    expect(localStorage.getItem('dw_pastor_code_src')).toBeNull();
    expect(localStorage.getItem('dw_pastor_code_campus')).toBeNull();
    expect(heard).toHaveBeenCalledTimes(1);
    window.removeEventListener(PASTOR_CODE_EVENT, heard);
    clearProvisionedPastorCode();
    expect(getPastorCode()).toBe('67C1B2B4');
    setHandTypedPastorCode('   ');
    expect(getPastorCode()).toBe('67C1B2B4');
  });

  it('gives up on a hung pastor-admin call after the timeout', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', vi.fn((_url: string, init: RequestInit) => new Promise((_resolve, reject) => {
      init.signal?.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })));
    })));
    const pending = fetchMyCampusCode();
    await vi.advanceTimersByTimeAsync(8100);
    expect(await pending).toBeNull();
    vi.useRealTimers();
  });

  it('a colleague without a campus signing in clears a provisioned code, never a hand-typed one', async () => {
    vi.stubGlobal('fetch', answer({ campusId: 'us-alpharetta', code: 'abcd1234' }));
    await provisionPastorCode(CAMPUS_STAFF, { force: true });
    expect(await provisionPastorCode(ASHLEY, { force: true })).toBe(false);
    expect(getPastorCode()).toBe('');
    expect(localStorage.getItem('dw_pastor_code_src')).toBeNull();

    localStorage.setItem('dw_pastor_code', 'HAND1234');
    expect(await provisionPastorCode(ASHLEY, { force: true })).toBe(false);
    expect(getPastorCode()).toBe('HAND1234');
  });

  it('the server answering "no code" at sign-in clears a provisioned code', async () => {
    vi.stubGlobal('fetch', answer({ campusId: 'us-alpharetta', code: 'abcd1234' }));
    await provisionPastorCode(CAMPUS_STAFF, { force: true });
    vi.stubGlobal('fetch', answer({ campusId: null, code: null }));
    expect(await provisionPastorCode(CAMPUS_STAFF, { force: true })).toBe(false);
    expect(getPastorCode()).toBe('');
  });

  it('does nothing without a staff token', async () => {
    api.token = '';
    const fetchMock = answer({ campusId: 'us-alpharetta', code: 'abcd1234' });
    vi.stubGlobal('fetch', fetchMock);
    expect(await provisionPastorCode(CAMPUS_STAFF, { force: true })).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sign-out removes the provisioned code and leaves a hand-typed one', async () => {
    api.intake.mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', answer({ campusId: 'us-alpharetta', code: 'abcd1234' }));
    await provisionPastorCode(CAMPUS_STAFF, { force: true });
    await signOutStaff();
    expect(getPastorCode()).toBe('');

    localStorage.setItem('dw_pastor_code', 'HAND1234');
    api.token = 'm'.repeat(64);
    await signOutStaff();
    expect(getPastorCode()).toBe('HAND1234');
    clearProvisionedPastorCode();
    expect(getPastorCode()).toBe('HAND1234');
  });
});
