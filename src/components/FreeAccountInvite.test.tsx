import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act, type ReactElement } from 'react';
import { FreeAccountInvite } from './FreeAccountInvite';
import { EmailGate } from './EmailGate';
import { UserProvider } from '../contexts/UserContext';

beforeAll(() => { (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true; });

let mounted: Array<{ root: Root; el: HTMLElement }> = [];
afterEach(() => {
  for (const m of mounted) { act(() => m.root.unmount()); m.el.remove(); }
  mounted = [];
});

function render(ui: ReactElement) {
  const el = document.createElement('div');
  document.body.appendChild(el);
  const root = createRoot(el);
  act(() => { root.render(ui); });
  mounted.push({ root, el });
  return el;
}

describe('FreeAccountInvite', () => {
  it('offers a free account and opens the existing email gate', async () => {
    localStorage.setItem('dw_setup', JSON.stringify({ persona: 'new_to_faith', source: 'default' }));
    const el = render(
      <UserProvider>
        <FreeAccountInvite />
        <EmailGate />
      </UserProvider>,
    );
    expect(el.textContent).toContain('Create a free account');
    expect(el.textContent).toContain('free to read and listen');
    const btn = el.querySelector('[data-testid="free-account-cta"]') as HTMLButtonElement;
    await act(async () => { btn.click(); });
    expect(el.textContent).toContain('Create your free account');
    expect(el.textContent).toContain('Reading and listening stay free');
  });

  it('stays out of the way once an account exists', () => {
    localStorage.setItem('dw_profile', JSON.stringify({ email: 'a@b.com', firstName: 'Ada' }));
    const el = render(
      <UserProvider>
        <FreeAccountInvite />
      </UserProvider>,
    );
    expect(el.querySelector('[data-testid="free-account-invite"]')).toBeNull();
  });
});
