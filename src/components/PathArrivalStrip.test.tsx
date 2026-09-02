import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act, type ReactElement } from 'react';

const signedIn = { value: false };
vi.mock('../utils/useStaffIdentity', () => ({
  useIsPastorSignedIn: () => signedIn.value,
  useStaffIdentity: () => ({ applyStaffIdentity: vi.fn(), clearStaffIdentity: vi.fn() }),
}));

import { PathArrivalStrip } from './PathArrivalStrip';
import { markPathArrival, readPathArrival, clearPathArrival } from '../utils/choosePath';

beforeAll(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});
beforeEach(() => { sessionStorage.clear(); signedIn.value = false; });

function mount(ui: ReactElement): { el: HTMLDivElement; root: Root } {
  const el = document.createElement('div');
  document.body.appendChild(el);
  const root = createRoot(el);
  act(() => { root.render(ui); });
  return { el, root };
}

describe('PathArrivalStrip', () => {
  it('names the pastor study and offers sign-in when no staff session exists', () => {
    const onNavigate = vi.fn();
    const { el, root } = mount(<PathArrivalStrip persona="pastor_leader" lang="en" onNavigate={onNavigate} onDismiss={() => {}} />);
    expect(el.textContent).toContain("You're in the pastor study");
    expect(el.textContent).toContain('Between You & God');
    const link = [...el.querySelectorAll('button')].find(b => /sign in for campus tools/i.test(b.textContent || ''));
    expect(link).toBeTruthy();
    act(() => { link!.click(); });
    expect(onNavigate).toHaveBeenCalledWith('more');
    act(() => root.unmount());
  });

  it('shows the signed-in state with the campus for a signed-in pastor', () => {
    signedIn.value = true;
    const { el, root } = mount(<PathArrivalStrip persona="pastor_leader" lang="en" campusId="us-gwinnett" onDismiss={() => {}} />);
    expect(el.textContent).toContain('Signed in as pastor · Gwinnett');
    expect(el.textContent).not.toMatch(/sign in for campus tools/i);
    act(() => root.unmount());
  });

  it('every other path gets its own confirmation, and the × dismisses', () => {
    const onDismiss = vi.fn();
    const { el, root } = mount(<PathArrivalStrip persona="congregation" lang="en" onDismiss={onDismiss} />);
    expect(el.textContent).toContain('Ashley & Jane');
    expect(el.textContent).not.toMatch(/pastor/i);
    act(() => { (el.querySelector('button[aria-label="Dismiss"]') as HTMLButtonElement).click(); });
    expect(onDismiss).toHaveBeenCalledTimes(1);
    act(() => root.unmount());
  });
});

describe('arrival flag', () => {
  it('is read for the saved path only, then cleared on dismiss', () => {
    markPathArrival('deeper_study');
    expect(readPathArrival('congregation')).toBe(false); // wrong path clears it
    markPathArrival('deeper_study');
    expect(readPathArrival('deeper_study')).toBe(true);
    clearPathArrival();
    expect(readPathArrival('deeper_study')).toBe(false);
  });
});
