/**
 * The email-code sheet and its way back. Rendered with react-dom directly (this
 * repo has no @testing-library/dom). Behaviour, not looks: it opens only when
 * cloud sync asks for proof, it never sends the code email by itself, a 409/401
 * (the server forgot this device's pending token) starts again with a fresh
 * token, and a Settings row brings the sheet back after "Not now".
 */
import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

const retry = vi.fn(async () => {});
let parked = false;
vi.mock('../utils/cloudSync', () => ({
  isProofRequired: () => parked,
  retrySyncAfterProof: () => retry(),
}));

import { EmailCodePrompt, EmailCodeReopen } from './EmailCodePrompt';

beforeAll(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});

const reply = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

let calls: { action: string; code?: string }[];
let sendReply: () => Response;
let verifyReply: () => Response;
let host: HTMLElement;
let root: Root;

beforeEach(() => {
  parked = false;
  retry.mockClear();
  calls = [];
  sendReply = () => reply(200, { success: true, sent: true });
  verifyReply = () => reply(200, { success: true });
  localStorage.setItem('dw_profile', JSON.stringify({ email: 'ashley@example.com' }));
  vi.stubGlobal('fetch', vi.fn(async (_u: string, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body || '{}'));
    calls.push(body);
    return body.action === 'proof-send' ? sendReply() : verifyReply();
  }));
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  localStorage.clear();
  vi.unstubAllGlobals();
});

const text = () => host.textContent || '';
const byText = (label: string) =>
  Array.from(host.querySelectorAll('button')).find((b) => (b.textContent || '').includes(label)) as HTMLButtonElement | undefined;
const flush = () => act(async () => { await new Promise((r) => setTimeout(r, 0)); });
const click = async (el: Element | undefined | null) => { expect(el).toBeTruthy(); await act(async () => { (el as HTMLElement).click(); }); await flush(); };
const ask = () => act(() => { window.dispatchEvent(new CustomEvent('dw-proof-required', { detail: { email: 'ashley@example.com' } })); });
async function typeCode(value: string) {
  const input = host.querySelector('[data-testid="email-code-input"]') as HTMLInputElement;
  expect(input).toBeTruthy();
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
  await act(async () => { setter.call(input, value); input.dispatchEvent(new Event('input', { bubbles: true })); });
}

describe('EmailCodePrompt', () => {
  it('stays closed until cloud sync asks for proof, and sends nothing by itself', async () => {
    act(() => root.render(<EmailCodePrompt />));
    expect(host.querySelector('[data-testid="email-code-prompt"]')).toBeNull();
    await ask();
    expect(text()).toContain('a•••@example.com');
    expect(calls).toEqual([]);
  });

  it('a typed code is verified and then the sync runs again', async () => {
    act(() => root.render(<EmailCodePrompt />));
    await ask();
    await click(byText('Email me the code'));
    await typeCode('123456');
    await click(byText('Check the code'));
    expect(calls.at(-1)).toEqual({ action: 'proof-verify', code: '123456' });
    expect(retry).toHaveBeenCalledTimes(1);
  });
});

describe('when the server no longer knows this device\'s pending token', () => {
  it('a 409 on the code starts again: token cleared, a fresh one requested, first step shown', async () => {
    localStorage.setItem('dw_session_token', 'old-pending-token');
    verifyReply = () => reply(409, { success: false, error: 'token_gone' });
    act(() => root.render(<EmailCodePrompt />));
    await ask();
    await click(byText('Email me the code'));
    await typeCode('123456');
    await click(byText('Check the code'));

    expect(retry).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('dw_session_token')).toBeNull();
    expect(host.querySelector('[data-testid="email-code-input"]')).toBeNull();
    expect(byText('Email me the code')).toBeTruthy();
    expect(host.querySelector('[role="alert"]')?.textContent).toContain('timed out');
  });

  it('a 401 when asking for the code starts again the same way', async () => {
    localStorage.setItem('dw_session_token', 'old-pending-token');
    sendReply = () => reply(401, { error: 'Unauthorized' });
    act(() => root.render(<EmailCodePrompt />));
    await ask();
    await click(byText('Email me the code'));
    expect(retry).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('dw_session_token')).toBeNull();
  });
});

describe('the way back after "Not now"', () => {
  it('shows nothing unless the sync is waiting for the code', () => {
    act(() => root.render(<EmailCodeReopen />));
    expect(host.querySelector('[data-testid="proof-reopen"]')).toBeNull();
  });

  it('shows a row while the sync is parked, and tapping it brings the sheet back (sending nothing)', async () => {
    parked = true;
    act(() => root.render(<><EmailCodePrompt /><EmailCodeReopen /></>));
    await click(byText('Not now'));
    expect(host.querySelector('[data-testid="email-code-prompt"]')).toBeNull();

    await click(host.querySelector('[data-testid="proof-reopen"]'));
    expect(host.querySelector('[data-testid="email-code-prompt"]')).toBeTruthy();
    expect(calls).toEqual([]);
  });

  it('disappears once the code has been accepted', async () => {
    parked = true;
    act(() => root.render(<><EmailCodePrompt /><EmailCodeReopen /></>));
    await click(byText('Email me the code'));
    await typeCode('123456');
    retry.mockImplementationOnce(async () => { parked = false; });
    await click(byText('Check the code'));
    expect(host.querySelector('[data-testid="proof-reopen"]')).toBeNull();
  });
});
