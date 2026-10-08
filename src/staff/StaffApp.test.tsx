import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act, type ReactElement } from 'react';

vi.mock('./api', () => ({
  getStaffToken: () => 'test-token',
  setStaffToken: vi.fn(),
  intake: vi.fn(),
  STAFF_SIGNED_OUT_EVENT: 'dw-staff-signed-out',
}));

import { StaffApp } from './StaffApp';
import { intake } from './api';

beforeAll(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});

function mount(ui: ReactElement): { el: HTMLDivElement; root: Root } {
  const el = document.createElement('div');
  document.body.appendChild(el);
  const root = createRoot(el);
  act(() => { root.render(ui); });
  return { el, root };
}

async function flush() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe('StaffApp admin home', () => {
  beforeEach(() => {
    vi.mocked(intake).mockImplementation(async (action: string) => {
      if (action === 'me') {
        return {
          staff: {
            email: 'ae@futures.global',
            role: 'admin',
            campusId: null,
            name: 'Ashley Evans',
            isAdmin: true,
          },
        };
      }
      return {};
    });
  });

  it('keeps People and History and does not offer Questions', async () => {
    const { el, root } = mount(<StaffApp />);
    await flush();
    const labels = [...el.querySelectorAll('button')].map(b => (b.textContent || '').trim());
    expect(labels).toContain('People');
    expect(labels).toContain('History');
    expect(labels).not.toContain('Questions');
    expect(el.textContent).not.toContain('These are the prompts on each job');
    expect(el.textContent).toMatch(/sermon notes/i);
    act(() => root.unmount());
  });

  it('opens People, History, and an intake job from home', async () => {
    vi.mocked(intake).mockImplementation(async (action: string) => {
      if (action === 'me') {
        return {
          staff: {
            email: 'ae@futures.global',
            role: 'admin',
            campusId: null,
            name: 'Ashley Evans',
            isAdmin: true,
          },
        };
      }
      if (action === 'roster_list') return { roster: [] };
      if (action === 'submissions') return { submissions: [] };
      if (action === 'questions_list') return { questions: [] };
      if (action === 'form') return { questions: [], cornerItems: [], submissions: [], sermons: [] };
      return {};
    });

    const { el, root } = mount(<StaffApp />);
    await flush();

    const clickNamed = async (re: RegExp) => {
      const btn = [...el.querySelectorAll('button')].find(b => re.test(b.textContent || ''));
      expect(btn, `missing button ${re}`).toBeTruthy();
      await act(async () => { btn!.click(); });
      await flush();
    };

    await clickNamed(/^People$/);
    expect(el.textContent).toMatch(/Who can sign in/);
    expect(el.textContent).not.toContain('These are the prompts on each job');

    await clickNamed(/Staff home/);
    await clickNamed(/^History$/);
    expect(el.textContent).toMatch(/What already went live/);
    expect(el.textContent).not.toContain('These are the prompts on each job');

    await clickNamed(/Staff home/);
    await clickNamed(/Put up this week/);
    expect(el.textContent).toMatch(/this week/i);
    expect(el.querySelector('form')).toBeTruthy();

    act(() => root.unmount());
  });
});

describe('StaffApp opens on its first screen (Ashley, 5 Oct 2026)', () => {
  const quickStatus = { congregation: 'futures-usa', sunday: '2026-10-11', up: false, current: null };
  const hubMe = { staff: { email: 'hub@futures.global', role: 'hub', campusId: null, name: 'Hub', isAdmin: false } };
  const adminMe = { staff: { email: 'ae@futures.global', role: 'admin', campusId: null, name: 'Ashley Evans', isAdmin: true } };

  function mockAs(me: unknown) {
    vi.mocked(intake).mockImplementation(async (action: string) => {
      if (action === 'me') return me;
      if (action === 'notes_quick_status') return quickStatus;
      if (action === 'roster_list') return { roster: [] };
      return {};
    });
  }

  beforeEach(() => {
    window.history.replaceState({}, '', '/staff');
  });

  it('the launcher tile (/staff) opens on Staff home, not on Sunday\u2019s notes', async () => {
    mockAs(hubMe);
    const { el, root } = mount(<StaffApp />);
    await flush();
    const h2 = [...el.querySelectorAll('main h2')].map(h => (h.textContent || '').trim());
    expect(h2[0]).toBe('Staff');
    expect(el.textContent).not.toContain('Put up Sunday\u2019s notes for');
    expect(el.querySelector('textarea')).toBeNull();
    expect(vi.mocked(intake).mock.calls.some(c => c[0] === 'notes_quick_status')).toBe(false);
    act(() => root.unmount());
  });

  it('Paste Sunday\u2019s notes on Staff home opens the notes screen, and Staff home comes back', async () => {
    mockAs(hubMe);
    const { el, root } = mount(<StaffApp />);
    await flush();
    const card = [...el.querySelectorAll('button')].find(b => /Paste Sunday\u2019s notes/.test(b.textContent || ''));
    expect(card).toBeTruthy();
    await act(async () => { card!.click(); });
    await flush();
    expect(el.textContent).toContain('Put up Sunday\u2019s notes for');
    expect(el.querySelector('textarea')).toBeTruthy();
    const home = [...el.querySelectorAll('button')].find(b => /Staff home/.test(b.textContent || ''));
    await act(async () => { home!.click(); });
    await flush();
    expect(el.querySelector('textarea')).toBeNull();
    act(() => root.unmount());
  });

  it('a campus pastor sees no Sunday\u2019s notes card', async () => {
    mockAs({ staff: { email: 'cp@futures.global', role: 'campus', campusId: 'alpharetta', name: 'CP', isAdmin: false } });
    const { el, root } = mount(<StaffApp />);
    await flush();
    expect(el.textContent).not.toContain('Paste Sunday\u2019s notes');
    act(() => root.unmount());
  });

  it('a link to Sunday\u2019s notes (/staff?tab=notes) still opens that screen, then leaves the address bar', async () => {
    window.history.replaceState({}, '', '/staff?tab=notes');
    mockAs(hubMe);
    const { el, root } = mount(<StaffApp />);
    await flush();
    expect(el.textContent).toContain('Put up Sunday\u2019s notes for');
    expect(window.location.search).toBe('');
    act(() => root.unmount());
  });

  it('a link to People survives the sign-in check (me) instead of being sent home', async () => {
    window.history.replaceState({}, '', '/staff#people');
    mockAs(adminMe);
    const { el, root } = mount(<StaffApp />);
    await flush();
    expect(el.textContent).toMatch(/Who can sign in/);
    expect(window.location.hash).toBe('');
    act(() => root.unmount());
  });

  it('an owner-only link for someone who is not the owner lands on Staff home, not a blank page', async () => {
    window.history.replaceState({}, '', '/staff?tab=people');
    mockAs(hubMe);
    const { el, root } = mount(<StaffApp />);
    await flush();
    const h2 = [...el.querySelectorAll('main h2')].map(h => (h.textContent || '').trim());
    expect(h2[0]).toBe('Staff');
    act(() => root.unmount());
  });
});

describe('StaffApp hub save never fails silently', () => {
  const HUB_QUESTIONS = [
    { id: 'q-title', sort_order: 110, label: 'What is the title of this message?', help: '', type: 'text', audience: 'hub', required: false, enabled: true, config: { publish: 'sermon_field', sermonKey: 'title' } },
    { id: 'q-yt', sort_order: 240, label: 'Do you already have the YouTube link? If yes, paste it.', help: '', type: 'text', audience: 'hub', required: false, enabled: true, config: { publish: 'sermon_field', sermonKey: 'youtubeUrl' } },
  ];

  async function setInput(el: HTMLInputElement | HTMLTextAreaElement, value: string) {
    const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    await act(async () => {
      Object.getOwnPropertyDescriptor(proto, 'value')!.set!.call(el, value);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });
  }

  async function openHubForm(submitImpl: () => Promise<unknown>) {
    vi.mocked(intake).mockImplementation(async (action: string) => {
      if (action === 'me') {
        return { staff: { email: 'ae@futures.global', role: 'admin', campusId: null, name: 'Ashley Evans', isAdmin: true } };
      }
      if (action === 'form') return { questions: HUB_QUESTIONS, cornerItems: [], submissions: [], sermons: [] };
      if (action === 'submit') return submitImpl();
      return {};
    });
    const { el, root } = mount(<StaffApp />);
    await flush();
    const job = [...el.querySelectorAll('button')].find(b => /Put up this week/.test(b.textContent || ''));
    await act(async () => { job!.click(); });
    await flush();
    return { el, root };
  }

  it('shows a refused save as an alert beside the button, not only at the top of the page', async () => {
    const { el, root } = await openHubForm(async () => { throw new Error('Missing: Who spoke?'); });
    const inputs = [...el.querySelectorAll('input[type="text"], input:not([type])')] as HTMLInputElement[];
    await setInput(inputs[0], 'Grace Wins');
    const save = [...el.querySelectorAll('button')].find(b => /Put this on the congregation page/.test(b.textContent || ''))!;
    await act(async () => { save.click(); });
    await flush();
    const alert = el.querySelector('[role="alert"]');
    expect(alert?.textContent).toContain('Missing: Who spoke?');
    expect(el.textContent).not.toContain('It’s on the congregation page');
    act(() => root.unmount());
  });

  it('names an empty required field beside the button instead of relying on the browser bubble', async () => {
    const submit = vi.fn(async () => ({ ok: true }));
    vi.mocked(intake).mockImplementation(async (action: string) => {
      if (action === 'me') return { staff: { email: 'ae@futures.global', role: 'admin', campusId: null, name: 'Ashley Evans', isAdmin: true } };
      if (action === 'form') return { questions: [{ ...HUB_QUESTIONS[0], required: true }, HUB_QUESTIONS[1]], cornerItems: [], submissions: [], sermons: [] };
      if (action === 'submit') return submit();
      return {};
    });
    const { el, root } = mount(<StaffApp />);
    await flush();
    const job = [...el.querySelectorAll('button')].find(b => /Put up this week/.test(b.textContent || ''));
    await act(async () => { job!.click(); });
    await flush();
    expect(el.querySelector('form')?.hasAttribute('novalidate')).toBe(true);
    const save = [...el.querySelectorAll('button')].find(b => /Put this on the congregation page/.test(b.textContent || ''))!;
    await act(async () => { save.click(); });
    await flush();
    expect(submit).not.toHaveBeenCalled();
    expect(el.querySelector('[role="alert"]')?.textContent).toContain('What is the title of this message?');
    act(() => root.unmount());
  });

  it('offers the three congregations and sends the chosen one with the save', async () => {
    const calls: Record<string, unknown>[] = [];
    vi.mocked(intake).mockImplementation(async (action: string, payload?: Record<string, unknown>) => {
      if (action === 'me') return { staff: { email: 'ae@futures.global', role: 'admin', campusId: null, name: 'Ashley Evans', isAdmin: true } };
      if (action === 'form') return { questions: HUB_QUESTIONS, cornerItems: [], submissions: [], sermons: [] };
      if (action === 'submit') { calls.push(payload || {}); return { ok: true, published: true, publish_result: { sermon: null } }; }
      return {};
    });
    const { el, root } = mount(<StaffApp />);
    await flush();
    const job = [...el.querySelectorAll('button')].find(b => /Put up this week/.test(b.textContent || ''));
    await act(async () => { job!.click(); });
    await flush();
    const select = el.querySelector('[data-testid="staff-congregation"]') as HTMLSelectElement;
    expect([...select.options].map(o => o.textContent)).toEqual(['Futures USA', 'Futures Australia', 'Futuros USA']);
    await act(async () => {
      select.value = 'futures-au';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });
    const inputs = [...el.querySelectorAll('input[type="text"], input:not([type])')] as HTMLInputElement[];
    await setInput(inputs[0], 'Grace Wins');
    const save = [...el.querySelectorAll('button')].find(b => /Put this on the congregation page/.test(b.textContent || ''))!;
    await act(async () => { save.click(); });
    await flush();
    expect(calls[0]?.congregation).toBe('futures-au');
    act(() => root.unmount());
  });

  it('catches a bad YouTube link on the field and does not call submit', async () => {
    const submit = vi.fn(async () => ({ ok: true }));
    const { el, root } = await openHubForm(submit);
    const inputs = [...el.querySelectorAll('input[type="text"], input:not([type])')] as HTMLInputElement[];
    await setInput(inputs[1], 'https://www.youtube.com/@futureschurch');
    expect(el.textContent).toContain('not a YouTube video link');
    const save = [...el.querySelectorAll('button')].find(b => /Put this on the congregation page/.test(b.textContent || ''))!;
    await act(async () => { save.click(); });
    await flush();
    expect(submit).not.toHaveBeenCalled();
    expect(el.querySelector('[role="alert"]')?.textContent).toContain('not a YouTube video link');
    act(() => root.unmount());
  });

  it('reads the published sermon back and names it when the save went live', async () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- typed so mock.calls[0][0] indexes
    const fetchMock = vi.fn(async (..._args: unknown[]) => ({ ok: true, json: async () => ({ sermon: { id: 'grace-wins-2026-09-06', title: 'Grace Wins' } }) }));
    vi.stubGlobal('fetch', fetchMock);
    const { el, root } = await openHubForm(async () => ({
      ok: true, published: true,
      publish_result: { cornerAdded: 0, cornerRemoved: 0, sermon: { id: 'grace-wins-2026-09-06', title: 'Grace Wins', youtubeUrl: '' } },
    }));
    const inputs = [...el.querySelectorAll('input[type="text"], input:not([type])')] as HTMLInputElement[];
    await setInput(inputs[0], 'Grace Wins');
    const save = [...el.querySelectorAll('button')].find(b => /Put this on the congregation page/.test(b.textContent || ''))!;
    await act(async () => { save.click(); });
    await flush();
    await flush();
    expect(el.textContent).toContain('It’s on the Futures USA page: Grace Wins');
    expect(el.querySelector('a[href*="sermon=1"]')?.getAttribute('href')).toContain('congregation=futures-us');
    expect(String(fetchMock.mock.calls[0][0])).toContain('published-sermon?congregation=futures-us');
    vi.unstubAllGlobals();
    act(() => root.unmount());
  });

  it('says a held campus save is waiting, not on the campus corner', async () => {
    const { el, root } = await openHubForm(async () => ({
      ok: true, published: false, pending: true, reason: 'campus_not_confirmed',
    }));
    const inputs = [...el.querySelectorAll('input[type="text"], input:not([type])')] as HTMLInputElement[];
    await setInput(inputs[0], 'Grace Wins');
    const save = [...el.querySelectorAll('button')].find(b => /Put this on the congregation page/.test(b.textContent || ''))!;
    await act(async () => { save.click(); });
    await flush();
    await flush();
    expect(el.textContent).toContain('Saved. It goes on the campus corner once your campus is confirmed.');
    expect(el.textContent).not.toContain('It’s on the campus corner');
    expect(el.textContent).not.toContain('It’s on the Futures USA page');
    act(() => root.unmount());
  });
});

describe('StaffApp sign-in needs a setup code for a first password', () => {
  async function setInput(el: HTMLInputElement, value: string) {
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(el, value);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });
  }
  const byId = (el: HTMLElement, id: string) => el.querySelector(`#${id}`) as HTMLInputElement | null;

  async function openSignIn(statusSetup = false) {
    const calls: { action: string; payload: Record<string, unknown> }[] = [];
    vi.mocked(intake).mockImplementation(async (action: string, payload: Record<string, unknown> = {}) => {
      calls.push({ action, payload });
      if (action === 'me') throw new Error('Sign in required');
      if (action === 'auth_status') return { setup: statusSetup };
      if (action === 'set_password' || action === 'login') return { token: 't'.repeat(64), staff: { email: 'x@futures.church', role: 'campus', campusId: null, name: '', isAdmin: false } };
      return {};
    });
    const mounted = mount(<StaffApp />);
    await flush();
    return { ...mounted, calls };
  }

  it('shows a plain sign-in with the email-me-a-code line, and no code box', async () => {
    const { el, root } = await openSignIn();
    expect(el.textContent).toContain('First time, or forgot your password?');
    expect(el.querySelector('[data-testid="staff-email-code"]')?.textContent).toBe('Email me a code');
    expect(el.textContent).not.toContain('Ask Ashley Evans');
    expect(byId(el, 'staff-code')).toBeNull();
    expect(byId(el, 'staff-confirm')).toBeNull();
    act(() => root.unmount());
  });

  it('asks for the code when a person who has one opens the box, and sends it with the new password', async () => {
    const { el, root, calls } = await openSignIn();
    await act(async () => { (el.querySelector('[data-testid="staff-have-code"]') as HTMLButtonElement).click(); });
    expect(byId(el, 'staff-code')).not.toBeNull();
    await setInput(byId(el, 'staff-email')!, 'new.pastor@futures.church');
    await setInput(byId(el, 'staff-code')!, 'K7M2Q-9XWRT');
    await setInput(byId(el, 'staff-password')!, 'a-long-test-passphrase-9');
    await setInput(byId(el, 'staff-confirm')!, 'a-long-test-passphrase-9');
    await act(async () => { el.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); });
    await flush();
    const set = calls.find(c => c.action === 'set_password');
    expect(set?.payload).toEqual({ email: 'new.pastor@futures.church', password: 'a-long-test-passphrase-9', setupCode: 'K7M2Q-9XWRT' });
    expect(calls.some(c => c.action === 'login')).toBe(false);
    act(() => root.unmount());
  });

  it('switches to the code box on its own when the address has a live code', async () => {
    const { el, root } = await openSignIn(true);
    const email = byId(el, 'staff-email')!;
    await setInput(email, 'new.pastor@futures.church');
    await act(async () => { email.dispatchEvent(new FocusEvent('focusout', { bubbles: true })); });
    await flush();
    expect(byId(el, 'staff-code')).not.toBeNull();
    act(() => root.unmount());
  });

  it('a plain sign-in never sends a setup code', async () => {
    const { el, root, calls } = await openSignIn();
    await setInput(byId(el, 'staff-email')!, 'set.pastor@futures.church');
    await setInput(byId(el, 'staff-password')!, 'a-long-test-passphrase-9');
    await act(async () => { el.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); });
    await flush();
    expect(calls.find(c => c.action === 'login')?.payload).toEqual({ email: 'set.pastor@futures.church', password: 'a-long-test-passphrase-9' });
    act(() => root.unmount());
  });
});

describe('StaffApp sign-in: Email me a code', () => {
  async function setInput(el: HTMLInputElement, value: string) {
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(el, value);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });
  }
  const byId = (el: HTMLElement, id: string) => el.querySelector(`#${id}`) as HTMLInputElement | null;
  const byTestId = (el: HTMLElement, id: string) => el.querySelector(`[data-testid="${id}"]`) as HTMLButtonElement | null;
  const tooMany = () => Object.assign(new Error('Too many attempts. Try again later.'), { status: 429 });

  async function openSignIn(emailCode: () => Promise<unknown> = async () => ({ sent: true })) {
    const calls: { action: string; payload: Record<string, unknown> }[] = [];
    vi.mocked(intake).mockImplementation(async (action: string, payload: Record<string, unknown> = {}) => {
      calls.push({ action, payload });
      if (action === 'me') throw new Error('Sign in required');
      if (action === 'auth_status') return { setup: false };
      if (action === 'email_setup_code') return emailCode();
      if (action === 'set_password') return { token: 't'.repeat(64), staff: { email: 'set.pastor@futures.church', role: 'campus', campusId: null, name: 'Set Pastor', isAdmin: false } };
      return {};
    });
    const mounted = mount(<StaffApp />);
    await flush();
    return { ...mounted, calls };
  }

  it('sends the code, shows the code screen, then sets the password and signs in', async () => {
    const { el, root, calls } = await openSignIn();
    await setInput(byId(el, 'staff-email')!, '  Set.Pastor@Futures.church ');
    await act(async () => { byTestId(el, 'staff-email-code')!.click(); });
    await flush();
    expect(calls.find(c => c.action === 'email_setup_code')?.payload).toEqual({ email: 'set.pastor@futures.church', lang: 'en' });
    expect(el.querySelector('h1')?.textContent).toBe('Choose your password');
    expect(byTestId(el, 'staff-code-sent')?.textContent).toBe('We’ve emailed a code to set.pastor@futures.church if it’s on the staff list. It lasts 30 minutes.');
    expect(byId(el, 'staff-code')).not.toBeNull();
    expect(byId(el, 'staff-password')).not.toBeNull();
    expect(byTestId(el, 'staff-send-another')?.textContent).toBe('Send another code');
    expect(byTestId(el, 'staff-back-to-signin')?.textContent?.trim()).toBe('Back to sign in');
    const main = [...el.querySelectorAll('button[type="submit"]')];
    expect(main.map(b => b.textContent)).toEqual(['Set my password']);

    await setInput(byId(el, 'staff-code')!, 'K7M2Q-9XWRT');
    await setInput(byId(el, 'staff-password')!, 'a-long-test-passphrase-9');
    await setInput(byId(el, 'staff-confirm')!, 'a-long-test-passphrase-9');
    await act(async () => { el.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); });
    await flush();
    expect(calls.find(c => c.action === 'set_password')?.payload).toMatchObject({ password: 'a-long-test-passphrase-9', setupCode: 'K7M2Q-9XWRT' });
    expect(calls.some(c => c.action === 'login')).toBe(false);
    // Signed in: the sign-in form is gone.
    expect(byId(el, 'staff-code')).toBeNull();
    act(() => root.unmount());
  });

  it('asks for the email before sending, beside the button, without calling the server', async () => {
    const { el, root, calls } = await openSignIn();
    await act(async () => { byTestId(el, 'staff-email-code')!.click(); });
    await flush();
    expect(calls.some(c => c.action === 'email_setup_code')).toBe(false);
    const alert = byTestId(el, 'staff-email-code')!.nextElementSibling;
    expect(alert?.getAttribute('role')).toBe('alert');
    expect(alert?.textContent).toBe('Type your work email.');
    act(() => root.unmount());
  });

  it('shows the 429 words beside Email me a code and stays on the sign-in screen', async () => {
    const { el, root } = await openSignIn(async () => { throw tooMany(); });
    await setInput(byId(el, 'staff-email')!, 'set.pastor@futures.church');
    await act(async () => { byTestId(el, 'staff-email-code')!.click(); });
    await flush();
    const alert = byTestId(el, 'staff-email-code')!.nextElementSibling;
    expect(alert?.textContent).toBe('Too many codes asked for. Try again in a few minutes.');
    expect(byId(el, 'staff-code')).toBeNull();
    expect(el.querySelector('h1')?.textContent).toBe('Staff sign-in');
    act(() => root.unmount());
  });

  it('Send another code asks again, and a 429 shows beside that button', async () => {
    let n = 0;
    const { el, root, calls } = await openSignIn(async () => { n += 1; if (n > 1) throw tooMany(); return { sent: true }; });
    await setInput(byId(el, 'staff-email')!, 'set.pastor@futures.church');
    await act(async () => { byTestId(el, 'staff-email-code')!.click(); });
    await flush();
    await act(async () => { byTestId(el, 'staff-send-another')!.click(); });
    await flush();
    expect(calls.filter(c => c.action === 'email_setup_code')).toHaveLength(2);
    const alert = byTestId(el, 'staff-send-another')!.closest('p')!.nextElementSibling;
    expect(alert?.getAttribute('role')).toBe('alert');
    expect(alert?.textContent).toBe('Too many codes asked for. Try again in a few minutes.');
    expect(byId(el, 'staff-code')).not.toBeNull();
    act(() => root.unmount());
  });

  it('translates staff sign-in and keeps password fields when another code is sent', async () => {
    let sends = 0;
    const { el, root } = await openSignIn(async () => { sends += 1; return { sent: true }; });
    await setInput(byId(el, 'staff-email')!, 'set.pastor@futures.church');
    await act(async () => { byTestId(el, 'staff-email-code')!.click(); });
    await flush();
    await setInput(byId(el, 'staff-code')!, 'old-code');
    await setInput(byId(el, 'staff-password')!, 'a-long-test-passphrase-9');
    await setInput(byId(el, 'staff-confirm')!, 'a-long-test-passphrase-9');
    await act(async () => { byTestId(el, 'staff-send-another')!.click(); });
    await flush();
    expect(sends).toBe(2);
    expect((byId(el, 'staff-code') as HTMLInputElement).value).toBe('');
    expect((byId(el, 'staff-password') as HTMLInputElement).value).toBe('a-long-test-passphrase-9');
    expect((byId(el, 'staff-confirm') as HTMLInputElement).value).toBe('a-long-test-passphrase-9');
    expect(el.querySelector('[role="status"]')?.textContent).toContain('Another code is on its way');
    act(() => root.unmount());
  });

  it('renders the staff sign-in copy in Spanish', async () => {
    localStorage.setItem('dw_lang', 'es');
    const { el, root } = await openSignIn();
    expect(el.querySelector('h1')?.textContent).toBe('Inicio de sesión del equipo');
    expect(el.textContent).toContain('Correo de trabajo');
    localStorage.removeItem('dw_lang');
    act(() => root.unmount());
  });

  it('checks the code screen beside the main button before calling the server', async () => {
    const { el, root, calls } = await openSignIn();
    await setInput(byId(el, 'staff-email')!, 'set.pastor@futures.church');
    await act(async () => { byTestId(el, 'staff-email-code')!.click(); });
    await flush();
    const submit = async () => {
      await act(async () => { el.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); });
      await flush();
      return el.querySelector('[role="alert"]')?.textContent;
    };
    expect(await submit()).toBe('Type the code from your email.');
    await setInput(byId(el, 'staff-code')!, 'K7M2Q-9XWRT');
    await setInput(byId(el, 'staff-password')!, 'short');
    expect(await submit()).toBe('Choose a password of at least 10 characters.');
    await setInput(byId(el, 'staff-password')!, 'a-long-test-passphrase-9');
    await setInput(byId(el, 'staff-confirm')!, 'a-long-test-passphrase-X');
    expect(await submit()).toBe('Passwords do not match.');
    expect(calls.some(c => c.action === 'set_password')).toBe(false);
    act(() => root.unmount());
  });

  it('a late answer to Send another code does not undo Back to sign in', async () => {
    let n = 0;
    let release: (v: unknown) => void = () => {};
    const { el, root } = await openSignIn(() => { n += 1; return n === 1 ? Promise.resolve({ sent: true }) : new Promise(r => { release = r; }); });
    await setInput(byId(el, 'staff-email')!, 'set.pastor@futures.church');
    await act(async () => { byTestId(el, 'staff-email-code')!.click(); });
    await flush();
    await act(async () => { byTestId(el, 'staff-send-another')!.click(); });
    await act(async () => { byTestId(el, 'staff-back-to-signin')!.click(); });
    await flush();
    expect(el.querySelector('h1')?.textContent).toBe('Staff sign-in');
    await act(async () => { release({ sent: true }); });
    await flush();
    expect(el.querySelector('h1')?.textContent).toBe('Staff sign-in');
    expect(byId(el, 'staff-code')).toBeNull();
    expect((byTestId(el, 'staff-email-code') as HTMLButtonElement).disabled).toBe(false);
    act(() => root.unmount());
  });

  it('Back to sign in returns to the password screen and clears the code screen', async () => {
    const { el, root } = await openSignIn();
    await setInput(byId(el, 'staff-email')!, 'set.pastor@futures.church');
    await act(async () => { byTestId(el, 'staff-email-code')!.click(); });
    await flush();
    await setInput(byId(el, 'staff-code')!, 'K7M2Q-9XWRT');
    await act(async () => { byTestId(el, 'staff-back-to-signin')!.click(); });
    await flush();
    expect(el.querySelector('h1')?.textContent).toBe('Staff sign-in');
    expect(byId(el, 'staff-code')).toBeNull();
    expect(byTestId(el, 'staff-code-sent')).toBeNull();
    expect(byTestId(el, 'staff-email-code')).not.toBeNull();
    // "I have a code" opens the same screen without sending, with the neutral line.
    await act(async () => { byTestId(el, 'staff-have-code')!.click(); });
    expect(byId(el, 'staff-code')?.value).toBe('');
    expect(byTestId(el, 'staff-code-sent')).toBeNull();
    expect(el.textContent).toContain('Type the code from your email, or the one Ashley gave you.');
    act(() => root.unmount());
  });
});

describe('StaffApp People shows the one-time code to Ashley', () => {
  it('shows the code returned by a password reset, and not again once dismissed', async () => {
    vi.mocked(intake).mockImplementation(async (action: string) => {
      if (action === 'me') return { staff: { email: 'ae@futures.global', role: 'admin', campusId: null, name: 'Ashley Evans', isAdmin: true } };
      if (action === 'roster_list') return { roster: [{ email: 'set.pastor@futures.church', role: 'campus', campus_id: null, display_name: 'Set Pastor', has_password: true, code_live: false, code_expires_at: null }] };
      if (action === 'roster_clear_password') return { ok: true, setupCode: 'K7M2Q-9XWRT', setupCodeExpiresAt: new Date(Date.now() + 72 * 3600_000).toISOString() };
      return {};
    });
    vi.stubGlobal('confirm', () => true);
    const { el, root } = mount(<StaffApp />);
    await flush();
    await act(async () => { [...el.querySelectorAll('button')].find(b => (b.textContent || '').trim() === 'People')!.click(); });
    await flush();
    expect(el.querySelector('[data-testid="staff-setup-code"]')).toBeNull();
    await act(async () => { [...el.querySelectorAll('button')].find(b => /Let them set a new password/.test(b.textContent || ''))!.click(); });
    await flush();
    const card = el.querySelector('[data-testid="staff-setup-code"]');
    expect(card?.textContent).toContain('K7M2Q-9XWRT');
    expect(card?.textContent).toContain('set.pastor@futures.church');
    await act(async () => { [...card!.querySelectorAll('button')].find(b => b.textContent === 'Done')!.click(); });
    expect(el.querySelector('[data-testid="staff-setup-code"]')).toBeNull();
    vi.unstubAllGlobals();
    act(() => root.unmount());
  });

  it('shows Make admin only to the owner, for people who are not already admins', async () => {
    vi.mocked(intake).mockImplementation(async (action: string) => {
      if (action === 'me') return { staff: { email: 'owner@example.com', role: 'admin', campusId: null, name: 'Owner', isAdmin: true } };
      if (action === 'roster_list') return {
        roster: [
          { email: 'hub@example.com', role: 'hub', campus_id: null, display_name: 'Hub person', has_password: true, code_live: false, code_expires_at: null },
          { email: 'admin@example.com', role: 'admin', campus_id: null, display_name: 'Admin person', has_password: true, code_live: false, code_expires_at: null },
        ],
        canMakeAdmin: true,
      };
      if (action === 'roster_make_admin') return { person: { email: 'hub@example.com', role: 'admin' } };
      return {};
    });
    const { el, root } = mount(<StaffApp />);
    await flush();
    await act(async () => { [...el.querySelectorAll('button')].find(b => (b.textContent || '').trim() === 'People')!.click(); });
    await flush();
    expect([...el.querySelectorAll('button')].filter(b => (b.textContent || '').trim() === 'Make admin')).toHaveLength(1);
    expect(el.textContent).toContain('Hub person');
    expect(el.textContent).toContain('Admin person');
    await act(async () => { [...el.querySelectorAll('button')].find(b => (b.textContent || '').trim() === 'Make admin')!.click(); });
    await flush();
    expect(vi.mocked(intake).mock.calls.some(c => c[0] === 'roster_make_admin' && c[1]?.email === 'hub@example.com')).toBe(true);
    expect(el.textContent).toContain('Hub person is now an admin. They can add people and edit Campuses.');
    act(() => root.unmount());

    vi.mocked(intake).mockImplementation(async (action: string) => {
      if (action === 'me') return { staff: { email: 'admin@example.com', role: 'admin', campusId: null, name: 'Admin', isAdmin: true } };
      if (action === 'roster_list') return { roster: [{ email: 'hub@example.com', role: 'hub', campus_id: null, display_name: 'Hub person', has_password: true, code_live: false, code_expires_at: null }], canMakeAdmin: false };
      return {};
    });
    const second = mount(<StaffApp />);
    await flush();
    await act(async () => { [...second.el.querySelectorAll('button')].find(b => (b.textContent || '').trim() === 'People')!.click(); });
    await flush();
    expect([...second.el.querySelectorAll('button')].filter(b => (b.textContent || '').trim() === 'Make admin')).toHaveLength(0);
    act(() => second.root.unmount());
  });
});

describe('StaffApp job form: wording in place and a failed load beside the button (B09-03)', () => {
  const Q_TITLE = { id: 'q-title', sort_order: 110, label: 'What is the title of this message?', help: 'One line.', type: 'text', audience: 'hub', required: false, enabled: true, config: { publish: 'sermon_field', sermonKey: 'title' } };
  const Q_ACTION = { id: 'q-action', sort_order: 120, label: 'Weekly action', help: 'One sentence people can do this week', type: 'long_text', audience: 'hub', required: false, enabled: true, config: {} };
  const Q_CORNER = { id: 'q-corner', sort_order: 10, label: 'What is on this week?', help: '', type: 'text', audience: 'campus', required: false, enabled: true, config: {} };

  type Role = 'admin' | 'hub' | 'campus' | 'media';
  const staffFor = (role: Role) => ({
    email: `${role}@futures.church`, role, campusId: role === 'campus' ? 'us-gwinnett' : null, name: 'Test', isAdmin: role === 'admin',
  });

  async function setInput(el: HTMLInputElement | HTMLTextAreaElement, value: string) {
    const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    await act(async () => {
      Object.getOwnPropertyDescriptor(proto, 'value')!.set!.call(el, value);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });
  }
  const buttons = (el: HTMLElement) => [...el.querySelectorAll('button')];
  const buttonNamed = (el: HTMLElement, re: RegExp) => buttons(el).find(b => re.test((b.textContent || '').trim()));
  async function click(btn: HTMLElement | undefined) {
    expect(btn, 'button missing').toBeTruthy();
    await act(async () => { btn!.click(); });
    await flush();
  }
  /** The input a <label for> points at, found by the label's words (getByLabelText). */
  function byLabelText(el: HTMLElement, text: string): HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null {
    const label = [...el.querySelectorAll('label')].find(l => (l.textContent || '').includes(text));
    const id = label?.getAttribute('for');
    if (!id) return null;
    return el.querySelector(`#${CSS.escape(id)}`);
  }

  async function openForm(role: Role, jobTitle: RegExp, impl: (action: string, body: Record<string, unknown>) => unknown) {
    vi.mocked(intake).mockImplementation(async (action: string, body: Record<string, unknown> = {}) => {
      if (action === 'me') return { staff: staffFor(role) };
      return impl(action, body);
    });
    const { el, root } = mount(<StaffApp />);
    await flush();
    await click(buttonNamed(el, jobTitle));
    await flush();
    return { el, root };
  }

  it('a failed load says so where the button would be, with one Load the form again, and nothing disabled', async () => {
    let fail = true;
    const { el, root } = await openForm('campus', /Update (a|the) campus corner/, async action => {
      if (action === 'form') {
        if (fail) throw new Error('Failed to fetch');
        return { questions: [Q_CORNER], rewordable: [], cornerItems: [], submissions: [], sermons: [] };
      }
      return {};
    });
    expect(el.textContent).toContain('The form didn\'t load. Check your connection and try again.');
    const alert = [...el.querySelectorAll('[role="alert"]')].find(a => /didn't load/.test(a.textContent || ''));
    expect(alert).toBeTruthy();
    expect(buttonNamed(el, /Put this on the campus corner/)).toBeUndefined();
    expect(el.textContent).not.toContain('No questions on this form yet.');
    expect(el.querySelectorAll('[disabled]')).toHaveLength(0);
    const again = buttonNamed(el, /^Load the form again$/);
    expect(again?.classList.contains('dw-next')).toBe(true);
    expect(el.querySelectorAll('.dw-next')).toHaveLength(1);
    fail = false;
    await click(again);
    await flush();
    expect(el.textContent).toContain('What is on this week?');
    expect(el.textContent).not.toContain('The form didn\'t load');
    expect(buttonNamed(el, /Put this on the campus corner/)).toBeTruthy();
    act(() => root.unmount());
  });

  it('a sign-in that ran out opens the sign-in screen instead of a Load-again loop', async () => {
    const { el, root } = await openForm('campus', /Update (a|the) campus corner/, async action => {
      if (action === 'form') {
        // What api.ts does on a 401: clear the token, tell the app, throw.
        window.dispatchEvent(new Event('dw-staff-signed-out'));
        throw Object.assign(new Error('Sign in required'), { status: 401 });
      }
      return {};
    });
    await flush();
    expect(el.querySelector('[data-testid="staff-email-code"]')).toBeTruthy();
    expect(buttonNamed(el, /^Load the form again$/)).toBeUndefined();
    expect(el.textContent).not.toContain('Check your connection');
    act(() => root.unmount());
  });

  it('a server fault on load says to try again in a minute, not to check the connection', async () => {
    const { el, root } = await openForm('campus', /Update (a|the) campus corner/, async action => {
      if (action === 'form') throw Object.assign(new Error('Server error'), { status: 500 });
      return {};
    });
    expect(el.textContent).toContain('The form didn\'t load. Try again in a minute.');
    expect(el.textContent).not.toContain('Check your connection');
    expect(buttonNamed(el, /^Load the form again$/)).toBeTruthy();
    act(() => root.unmount());
  });

  it('an empty form after a good load keeps the button words, aria-disabled, with the reason beside it', async () => {
    const { el, root } = await openForm('campus', /Update (a|the) campus corner/, async action => {
      if (action === 'form') return { questions: [], rewordable: [], cornerItems: [], submissions: [], sermons: [] };
      return {};
    });
    const save = buttonNamed(el, /Put this on the campus corner/)!;
    expect(save).toBeTruthy();
    expect(save.hasAttribute('disabled')).toBe(false);
    expect(save.getAttribute('aria-disabled')).toBe('true');
    expect(el.textContent).toContain('There\'s nothing to fill in on this form yet.');
    act(() => root.unmount());
  });

  it('every question box is tied to its label', async () => {
    const { el, root } = await openForm('hub', /Put up this week/, async action => {
      if (action === 'form') return { questions: [Q_TITLE, Q_ACTION], rewordable: [], cornerItems: [], submissions: [], sermons: [] };
      return {};
    });
    expect(byLabelText(el, 'What is the title of this message?')?.tagName).toBe('INPUT');
    expect(byLabelText(el, 'Weekly action')?.tagName).toBe('TEXTAREA');
    act(() => root.unmount());
  });

  it('hub changes a hub question\'s words in place; the new words show and the typed answer stays', async () => {
    const calls: { action: string; body: Record<string, unknown> }[] = [];
    const { el, root } = await openForm('hub', /Put up this week/, async (action, body) => {
      calls.push({ action, body });
      if (action === 'form') return { questions: [Q_TITLE, Q_ACTION], rewordable: ['q-title', 'q-action'], cornerItems: [], submissions: [], sermons: [] };
      if (action === 'question_wording_save') return { question: { ...Q_ACTION, label: String(body.label), help: String(body.help) } };
      return {};
    });
    await setInput(byLabelText(el, 'Weekly action') as HTMLTextAreaElement, 'Call one person');
    const changes = buttons(el).filter(b => /^Change the wording$/.test((b.textContent || '').trim()));
    expect(changes).toHaveLength(2);
    expect(changes.every(b => !b.hasAttribute("disabled"))).toBe(true);
    await click(changes[1]);
    const label = byLabelText(el, 'Question') as HTMLInputElement;
    const help = byLabelText(el, 'Help text') as HTMLTextAreaElement;
    expect(label.value).toBe('Weekly action');
    expect(help.value).toBe('One sentence people can do this week');
    await setInput(help, 'One thing to do before next Sunday');
    const saveWording = buttonNamed(el, /^Save wording$/)!;
    expect(saveWording.classList.contains('dw-next')).toBe(true);
    expect(el.querySelectorAll('.dw-next')).toHaveLength(1);
    await click(saveWording);
    const sent = calls.find(c => c.action === 'question_wording_save')!;
    expect(sent.body).toMatchObject({ id: 'q-action', label: 'Weekly action', help: 'One thing to do before next Sunday' });
    expect(el.textContent).toContain('One thing to do before next Sunday');
    expect(el.textContent).toContain('Saved. Everyone filling in this form sees the new wording.');
    expect((byLabelText(el, 'Weekly action') as HTMLTextAreaElement).value).toBe('Call one person');
    expect(buttonNamed(el, /^Save wording$/)).toBeUndefined();
    expect(el.querySelectorAll('.dw-next')).toHaveLength(1);
    act(() => root.unmount());
  });

  it('a too-short label is refused beside Save wording without calling the server', async () => {
    const calls: string[] = [];
    const { el, root } = await openForm('hub', /Put up this week/, async action => {
      calls.push(action);
      if (action === 'form') return { questions: [Q_TITLE], rewordable: ['q-title'], cornerItems: [], submissions: [], sermons: [] };
      return {};
    });
    await click(buttonNamed(el, /^Change the wording$/));
    await setInput(byLabelText(el, 'Question') as HTMLInputElement, 'x');
    await click(buttonNamed(el, /^Save wording$/));
    expect(calls).not.toContain('question_wording_save');
    const alert = [...el.querySelectorAll('[role="alert"]')].find(a => /at least 2 characters/.test(a.textContent || ''));
    expect(alert).toBeTruthy();
    act(() => root.unmount());
  });

  it('Staff home opens on Sunday notes when they are not up: one main button with the reason', async () => {
    vi.mocked(intake).mockImplementation(async (action: string) => {
      if (action === 'me') return { staff: staffFor('hub') };
      if (action === 'home') return { notes: { congregation: 'futures-us', congregationName: 'Futures USA', sunday: '2026-10-11', up: false }, usualJob: null };
      return {};
    });
    const { el, root } = mount(<StaffApp />);
    await flush();
    await flush();
    const mains = el.querySelectorAll('.dw-next');
    expect(mains).toHaveLength(1);
    expect(mains[0].textContent).toBe('Paste Sunday\u2019s notes');
    expect(el.textContent).toContain('Futures USA\u2019s notes aren\u2019t up yet.');
    act(() => root.unmount());
  });

  it('a campus pastor and media see no Change the wording', async () => {
    for (const [role, job] of [['campus', /Update (a|the) campus corner/], ['media', /Add the YouTube/]] as const) {
      const { el, root } = await openForm(role, job, async action => {
        if (action === 'form') return { questions: [Q_CORNER, Q_TITLE], rewordable: [], cornerItems: [], submissions: [], sermons: [] };
        return {};
      });
      expect(buttonNamed(el, /Change the wording/)).toBeUndefined();
      act(() => root.unmount());
    }
  });

  it('admin stops asking a question after the in-place confirm; nothing else is sent', async () => {
    const calls: { action: string; body: Record<string, unknown> }[] = [];
    const { el, root } = await openForm('admin', /Put up this week/, async (action, body) => {
      calls.push({ action, body });
      if (action === 'form') return { questions: [Q_TITLE, Q_ACTION], rewordable: ['q-title', 'q-action'], cornerItems: [], submissions: [], sermons: [] };
      if (action === 'question_enabled_set') return { question: { ...Q_ACTION, enabled: false } };
      return {};
    });
    await click(buttons(el).filter(b => /^Change the wording$/.test((b.textContent || '').trim()))[1]);
    await click(buttonNamed(el, /^Stop asking this$/));
    expect(el.textContent).toContain('People filling in this form won\'t see this question. You can bring it back from History.');
    expect(calls.some(c => c.action === 'question_enabled_set')).toBe(false);
    const confirm = buttons(el).filter(b => /^Stop asking this$/.test((b.textContent || '').trim())).pop();
    await click(confirm);
    const sent = calls.find(c => c.action === 'question_enabled_set')!;
    expect(sent.body).toEqual({ id: 'q-action', enabled: false });
    expect(byLabelText(el, 'Weekly action')).toBeNull();
    act(() => root.unmount());
  });

  it('hub sees no Stop asking this', async () => {
    const { el, root } = await openForm('hub', /Put up this week/, async action => {
      if (action === 'form') return { questions: [Q_TITLE], rewordable: ['q-title'], cornerItems: [], submissions: [], sermons: [] };
      return {};
    });
    await click(buttonNamed(el, /^Change the wording$/));
    expect(buttonNamed(el, /Stop asking this/)).toBeUndefined();
    act(() => root.unmount());
  });

  it('History lists switched-off questions with Ask this again', async () => {
    const calls: { action: string; body: Record<string, unknown> }[] = [];
    let off = true;
    vi.mocked(intake).mockImplementation(async (action: string, body: Record<string, unknown> = {}) => {
      calls.push({ action, body });
      if (action === 'me') return { staff: staffFor('admin') };
      if (action === 'submissions') return { submissions: [] };
      if (action === 'questions_list') return { questions: [Q_TITLE, { ...Q_ACTION, enabled: !off }] };
      if (action === 'question_enabled_set') { off = false; return { question: { ...Q_ACTION, enabled: true } }; }
      return {};
    });
    const { el, root } = mount(<StaffApp />);
    await flush();
    await click(buttonNamed(el, /^History$/));
    await flush();
    expect(el.textContent).toContain('Questions no one is asked now');
    expect(el.textContent).toContain('Weekly action');
    await click(buttonNamed(el, /^Ask this again$/));
    await flush();
    expect(calls.find(c => c.action === 'question_enabled_set')!.body).toEqual({ id: 'q-action', enabled: true });
    expect(buttonNamed(el, /^Ask this again$/)).toBeUndefined();
    act(() => root.unmount());
  });
});
