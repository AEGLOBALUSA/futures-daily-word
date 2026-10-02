/**
 * A first-time reader who is in Planning Center gets their PCO name and campus.
 *
 * pco-sync has only ever answered with `profile`; EmailGate read `person`, and
 * the gap stayed hidden while pco-sync inserted the profile itself. Since
 * pco-sync writes nothing for an unproven caller, register is the only write,
 * so EmailGate has to carry the PCO name and campus into it.
 */
import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

const user = vi.hoisted(() => ({ saveProfile: vi.fn(), saveSetup: vi.fn(), setShowEmailGate: vi.fn() }));

vi.mock('../contexts/UserContext', () => ({
  useUser: () => ({
    showEmailGate: true,
    setShowEmailGate: user.setShowEmailGate,
    saveProfile: user.saveProfile,
    saveSetup: user.saveSetup,
    emailGateCallback: { current: null },
  }),
}));
vi.mock('../utils/sessionToken', () => ({ setSessionToken: vi.fn() }));

import { EmailGate } from './EmailGate';

const PIA = 'pia@example.com';

beforeAll(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});

let mounted: { el: HTMLDivElement; root: Root } | null = null;
const fetchMock = vi.fn();

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('dw_setup', JSON.stringify({ persona: 'congregation', source: 'onboarding' }));
  user.saveProfile.mockReset();
  fetchMock.mockReset();
  fetchMock.mockImplementation(async (url: string, init?: { body: string }) => {
    const reply = (data: unknown) => ({ ok: true, status: 200, json: async () => data });
    // The campus picker's list (GET /.netlify/functions/campuses, B09-02): keep the bundled list.
    if (String(url).includes('/functions/campuses')) return { ok: false, status: 503, json: async () => ({}) };
    const body = JSON.parse(init!.body);
    if (String(url).includes('pco-sync')) {
      return reply({ synced: false, profile: { firstName: 'Pia', lastName: 'Pco', email: PIA, campus: 'us-alpharetta', campusName: 'Alpharetta' } });
    }
    if (body.action === 'get') return reply({ profile: null });
    if (body.action === 'register') return reply({ success: true, sessionToken: 'a'.repeat(64) });
    return reply({});
  });
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  if (mounted) { act(() => mounted!.root.unmount()); mounted.el.remove(); mounted = null; }
  vi.unstubAllGlobals();
});

function mount() {
  const el = document.createElement('div');
  document.body.appendChild(el);
  const root = createRoot(el);
  act(() => { root.render(<EmailGate />); });
  mounted = { el, root };
  return el;
}

function type(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
  act(() => {
    setter.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

describe('EmailGate: a new reader who is in PCO', () => {
  it('leaves name and campus blank and still registers with the PCO first name, last name and campus', async () => {
    const el = mount();
    type(el.querySelector('input[type="email"]') as HTMLInputElement, PIA);
    await act(async () => { (el.querySelector('button.dw-btn-primary') as HTMLButtonElement).click(); });
    await act(async () => { for (let i = 0; i < 10; i++) await Promise.resolve(); });

    const reg = fetchMock.mock.calls
      .filter(([, init]) => init && (init as { body?: string }).body)
      .map(([, init]) => JSON.parse((init as { body: string }).body))
      .find((b) => b.action === 'register');
    expect(reg).toMatchObject({ action: 'register', email: PIA, firstName: 'Pia', lastName: 'Pco', campus: 'us-alpharetta', persona: 'congregation' });
    expect(user.saveProfile).toHaveBeenCalledWith(expect.objectContaining({ firstName: 'Pia', lastName: 'Pco', campus: 'us-alpharetta', email: PIA }));
  });
});
