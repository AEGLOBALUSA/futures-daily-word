import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act, type ReactElement } from 'react';

const api = vi.hoisted(() => ({
  token: '',
  intake: vi.fn(),
  setStaffToken: vi.fn((t: string) => { api.token = t; }),
}));
const user = vi.hoisted(() => ({
  profile: null as null | { email: string; firstName: string; lastName: string; phone: string; church: string; city: string; campus: string },
  setup: null as null | { persona: string; source: string },
  saveProfile: vi.fn(),
  saveSetup: vi.fn(),
}));
const analytics = vi.hoisted(() => ({ track: vi.fn() }));

vi.mock('../staff/api', () => ({
  getStaffToken: () => api.token,
  setStaffToken: api.setStaffToken,
  intake: api.intake,
}));
vi.mock('../contexts/UserContext', () => ({
  useUser: () => ({
    userProfile: user.profile,
    setup: user.setup,
    profilePic: '',
    isAuthenticated: !!user.profile?.email,
    showEmailGate: false,
    requireEmail: () => {},
    setShowEmailGate: () => {},
    saveProfile: user.saveProfile,
    saveSetup: user.saveSetup,
    setProfilePic: () => {},
    emailGateCallback: { current: null },
  }),
}));
vi.mock('../utils/analytics', () => ({ track: analytics.track }));

import { PastorSignIn } from './PastorSignIn';
import { resetStaffSessionCache, setAppStaffSignIn, signOutStaff } from '../utils/staffIdentity';

const ASHLEY = { email: 'ae@futures.global', role: 'admin', campusId: null, name: 'Ashley Evans', isAdmin: true };
const TOKEN = 'f'.repeat(64);

beforeAll(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});

let mounted: { el: HTMLDivElement; root: Root } | null = null;
function mount(ui: ReactElement) {
  const el = document.createElement('div');
  document.body.appendChild(el);
  const root = createRoot(el);
  act(() => { root.render(ui); });
  mounted = { el, root };
  return el;
}

async function flush() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
}

function type(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
  act(() => {
    setter.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

async function submit(form: HTMLFormElement) {
  await act(async () => { form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); });
  await flush();
}

function buttonNamed(el: HTMLElement, re: RegExp): HTMLButtonElement {
  const btn = [...el.querySelectorAll('button')].find(b => re.test(b.textContent || ''));
  expect(btn, `missing button ${re}`).toBeTruthy();
  return btn!;
}

async function click(btn: HTMLButtonElement) {
  await act(async () => { btn.click(); });
  await flush();
}

beforeEach(() => {
  api.token = '';
  api.intake.mockReset();
  api.setStaffToken.mockClear();
  user.profile = null;
  user.setup = { persona: 'congregation', source: 'settings' };
  user.saveProfile.mockClear();
  user.saveSetup.mockClear();
  analytics.track.mockClear();
  resetStaffSessionCache();
  vi.stubGlobal('fetch', vi.fn(async () => ({ json: async () => ({ success: true, sessionToken: 'cloud-token' }) })));
});

afterEach(() => {
  if (mounted) { act(() => mounted!.root.unmount()); mounted.el.remove(); mounted = null; }
  vi.unstubAllGlobals();
});

describe('PastorSignIn', () => {
  it('starts as a single "Sign in as pastor" row and opens the email field', async () => {
    const el = mount(<PastorSignIn lang="en" />);
    await flush();
    expect(el.textContent).toContain('PASTOR ACCOUNT');
    expect(api.intake).not.toHaveBeenCalled(); // no token → no `me` call
    expect(el.querySelector('input')).toBeNull();
    await click(buttonNamed(el, /Sign in as pastor/));
    const input = el.querySelector('#dw-pastor-email') as HTMLInputElement;
    expect(input).toBeTruthy();
    expect(input.type).toBe('email');
  });

  it('rejects a non-staff email locally, without calling the server', async () => {
    const el = mount(<PastorSignIn lang="en" />);
    await flush();
    await click(buttonNamed(el, /Sign in as pastor/));
    type(el.querySelector('#dw-pastor-email') as HTMLInputElement, 'someone@gmail.com');
    await submit(el.querySelector('form')!);
    expect(el.textContent).toContain('not on the staff list');
    expect(api.intake).not.toHaveBeenCalled();
  });

  it('signs in: password step → login → token stored, persona + profile stamped, signed-in card', async () => {
    user.profile = { email: 'ae@futures.global', firstName: '', lastName: '', phone: '', church: '', city: '', campus: 'us-alpharetta' };
    api.intake.mockImplementation(async (action: string) => {
      if (action === 'auth_status') return { setup: false };
      if (action === 'login') return { token: TOKEN, staff: ASHLEY };
      return {};
    });
    const el = mount(<PastorSignIn lang="en" />);
    await flush();
    await click(buttonNamed(el, /Sign in as pastor/));
    type(el.querySelector('#dw-pastor-email') as HTMLInputElement, 'AE@futures.global');
    await submit(el.querySelector('form')!);
    expect(api.intake).toHaveBeenCalledWith('auth_status', { email: 'ae@futures.global' });

    const pw = el.querySelector('#dw-pastor-password') as HTMLInputElement;
    expect(pw).toBeTruthy();
    expect(pw.autocomplete).toBe('current-password');
    expect(el.querySelector('#dw-pastor-confirm')).toBeNull();
    type(pw, 'correct horse battery');
    await submit(el.querySelector('form')!);

    expect(api.intake).toHaveBeenCalledWith('login', { email: 'ae@futures.global', password: 'correct horse battery' });
    expect(api.setStaffToken).toHaveBeenCalledWith(TOKEN);
    expect(localStorage.getItem('dw_staff_app_signin')).toBe('1'); // gates the boot restore
    expect(user.saveSetup).toHaveBeenCalledWith({ persona: 'pastor_leader', source: 'settings' });
    expect(user.saveProfile).toHaveBeenCalledWith({
      email: 'ae@futures.global', firstName: 'Ashley', lastName: 'Evans', phone: '', church: '', city: '', campus: 'us-alpharetta',
    });
    // Same email as before → the cloud-sync token is left alone (no register call).
    expect(fetch).not.toHaveBeenCalled();
    expect(analytics.track).toHaveBeenCalledWith('pastor_sign_in', 'admin');
    expect(el.textContent).toContain('Signed in as Ashley Evans');
    expect(el.textContent).toContain('ae@futures.global · Admin');
    expect(el.querySelector('input')).toBeNull();
  });

  it('first visit: set-password step with confirmation, mismatch caught locally', async () => {
    api.intake.mockImplementation(async (action: string) => {
      if (action === 'auth_status') return { setup: true };
      if (action === 'set_password') return { token: TOKEN, staff: { email: 'josh@futures.church', role: 'hub', campusId: null, name: 'Josh Greenwood', isAdmin: false } };
      return {};
    });
    const el = mount(<PastorSignIn lang="en" />);
    await flush();
    await click(buttonNamed(el, /Sign in as pastor/));
    type(el.querySelector('#dw-pastor-email') as HTMLInputElement, 'josh@futures.church');
    await submit(el.querySelector('form')!);

    expect(el.textContent).toContain('First time here');
    const pw = el.querySelector('#dw-pastor-password') as HTMLInputElement;
    const confirm = el.querySelector('#dw-pastor-confirm') as HTMLInputElement;
    expect(pw.autocomplete).toBe('new-password');
    expect(confirm).toBeTruthy();

    type(pw, 'twelve characters');
    type(confirm, 'twelve charactersX');
    await submit(el.querySelector('form')!);
    expect(el.textContent).toContain('Passwords do not match');
    expect(api.intake).not.toHaveBeenCalledWith('set_password', expect.anything());

    type(confirm, 'twelve characters');
    await submit(el.querySelector('form')!);
    expect(api.intake).toHaveBeenCalledWith('set_password', { email: 'josh@futures.church', password: 'twelve characters' });
    expect(el.textContent).toContain('Signed in as Josh Greenwood');
    expect(el.textContent).toContain('· Hub');
  });

  it('switching the device to a different email drops the old cloud token and registers the new one', async () => {
    user.profile = { email: 'spouse@example.com', firstName: 'Jane', lastName: 'Evans', phone: '', church: '', city: '', campus: '' };
    localStorage.setItem('dw_session_token', 'old-cloud-token');
    api.intake.mockImplementation(async (action: string) => {
      if (action === 'auth_status') return { setup: false };
      if (action === 'login') return { token: TOKEN, staff: ASHLEY };
      return {};
    });
    const el = mount(<PastorSignIn lang="en" />);
    await flush();
    await click(buttonNamed(el, /Sign in as pastor/));
    type(el.querySelector('#dw-pastor-email') as HTMLInputElement, 'ae@futures.global');
    await submit(el.querySelector('form')!);
    expect(el.textContent).toContain('This device is signed in as spouse@example.com');
    type(el.querySelector('#dw-pastor-password') as HTMLInputElement, 'correct horse battery');
    await submit(el.querySelector('form')!);

    const body = JSON.parse(String((vi.mocked(fetch).mock.calls[0] as unknown as [string, RequestInit])[1].body));
    expect(body).toMatchObject({ action: 'register', email: 'ae@futures.global', firstName: 'Ashley', persona: 'pastor_leader' });
    expect(localStorage.getItem('dw_session_token')).toBe('cloud-token');
    expect(user.saveProfile).toHaveBeenCalledWith(expect.objectContaining({ email: 'ae@futures.global', firstName: 'Ashley', lastName: 'Evans' }));
    expect(el.textContent).toContain('Signed in as Ashley Evans');
  });

  it('shows the server error and stays on the password step for a wrong password', async () => {
    api.intake.mockImplementation(async (action: string) => {
      if (action === 'auth_status') return { setup: false };
      if (action === 'login') throw Object.assign(new Error('Invalid email or password'), { status: 403, data: { error: 'Invalid email or password' } });
      return {};
    });
    const el = mount(<PastorSignIn lang="en" />);
    await flush();
    await click(buttonNamed(el, /Sign in as pastor/));
    type(el.querySelector('#dw-pastor-email') as HTMLInputElement, 'ae@futures.global');
    await submit(el.querySelector('form')!);
    type(el.querySelector('#dw-pastor-password') as HTMLInputElement, 'nope nope nope');
    await submit(el.querySelector('form')!);
    expect(el.textContent).toContain('Invalid email or password');
    expect(el.querySelector('#dw-pastor-password')).toBeTruthy();
    expect(api.setStaffToken).not.toHaveBeenCalled();
    expect(user.saveSetup).not.toHaveBeenCalled();
  });

  it('restores a stored session on mount and signs out cleanly', async () => {
    api.token = TOKEN;
    setAppStaffSignIn(true);
    user.profile = { email: 'ae@futures.global', firstName: 'Ashley', lastName: 'Evans', phone: '', church: '', city: '', campus: '' };
    user.setup = { persona: 'pastor_leader', source: 'settings' };
    api.intake.mockImplementation(async (action: string) => {
      if (action === 'me') return { staff: ASHLEY, pendingCount: 0 };
      if (action === 'logout') return { ok: true };
      return {};
    });
    const el = mount(<PastorSignIn lang="en" />);
    await flush();
    expect(api.intake).toHaveBeenCalledWith('me');
    expect(el.textContent).toContain('Signed in as Ashley Evans');

    await click(buttonNamed(el, /Sign out/));
    expect(api.intake).toHaveBeenCalledWith('logout');
    expect(api.setStaffToken).toHaveBeenCalledWith('');
    expect(api.token).toBe('');
    expect(user.saveSetup).toHaveBeenCalledWith({ persona: 'congregation', source: 'settings' });
    expect(user.saveProfile).not.toHaveBeenCalled(); // the person stays; only the role goes
    expect(analytics.track).toHaveBeenCalledWith('pastor_sign_out');
    expect(el.textContent).toContain('Sign in as pastor');
    expect(el.textContent).not.toContain('Signed in as');
  });

  it('follows a sign-out made elsewhere (the Home chip) while mounted', async () => {
    api.token = TOKEN;
    setAppStaffSignIn(true);
    user.profile = { email: 'ae@futures.global', firstName: 'Ashley', lastName: 'Evans', phone: '', church: '', city: '', campus: '' };
    user.setup = { persona: 'pastor_leader', source: 'settings' };
    api.intake.mockImplementation(async (action: string) => {
      if (action === 'me') return { staff: ASHLEY, pendingCount: 0 };
      if (action === 'logout') return { ok: true };
      return {};
    });
    const el = mount(<PastorSignIn lang="en" />);
    await flush();
    expect(el.textContent).toContain('Signed in as Ashley Evans');
    // The chip's "Sign out of pastor account" runs the same signOutStaff() — not through this card.
    await act(async () => { await signOutStaff(); });
    await flush();
    expect(el.textContent).toContain('Sign in as pastor');
    expect(el.textContent).not.toContain('Signed in as');
  });

  it('a dead stored token falls back to the sign-in row without crashing', async () => {
    api.token = TOKEN;
    setAppStaffSignIn(true);
    api.intake.mockImplementation(async (action: string) => {
      if (action === 'me') { api.token = ''; throw Object.assign(new Error('Sign in required'), { status: 401 }); }
      return {};
    });
    const el = mount(<PastorSignIn lang="en" />);
    await flush();
    expect(el.textContent).toContain('Sign in as pastor');
    expect(el.textContent).not.toContain('Signed in as');
    expect(user.saveSetup).not.toHaveBeenCalled();
  });
});
