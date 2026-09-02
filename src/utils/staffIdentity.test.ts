import { describe, it, expect, vi, beforeEach } from 'vitest';

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
