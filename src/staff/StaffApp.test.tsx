import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act, type ReactElement } from 'react';

vi.mock('./api', () => ({
  getStaffToken: () => 'test-token',
  setStaffToken: vi.fn(),
  intake: vi.fn(),
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

  it('shows a plain sign-in with a neutral first-time line, and no code box', async () => {
    const { el, root } = await openSignIn();
    expect(el.textContent).toContain('First time? Ask Ashley Evans for your setup code.');
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
});
