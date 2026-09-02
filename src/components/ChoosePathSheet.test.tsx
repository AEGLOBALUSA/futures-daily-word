import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act, type ReactElement } from 'react';

// Pastor lock rides the staff-session hook; the sign-out path is the same
// clearStaffIdentity the old header chip used.
const signedIn = { value: false };
const clearStaffIdentity = vi.fn(() => Promise.resolve());
vi.mock('../utils/useStaffIdentity', () => ({
  useIsPastorSignedIn: () => signedIn.value,
  useStaffIdentity: () => ({ applyStaffIdentity: vi.fn(), clearStaffIdentity }),
}));
const saveSetup = vi.fn();
const setup = { persona: 'new_to_faith', source: 'default' };
vi.mock('../contexts/UserContext', () => ({
  useUser: () => ({ setup, saveSetup }),
}));
vi.mock('../utils/cloudSync', () => ({ syncMisc: vi.fn(), flushNow: vi.fn() }));

import { ChoosePathSheet, PathSwatch } from './ChoosePathSheet';

beforeAll(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});
beforeEach(() => {
  localStorage.clear();
  saveSetup.mockClear();
  clearStaffIdentity.mockClear();
  signedIn.value = false;
  setup.persona = 'new_to_faith';
  setup.source = 'default';
});

function mount(ui: ReactElement): { el: HTMLDivElement; root: Root } {
  const el = document.createElement('div');
  document.body.appendChild(el);
  const root = createRoot(el);
  act(() => { root.render(ui); });
  return { el, root };
}
function click(el: Element | undefined | null) {
  expect(el).toBeTruthy();
  act(() => { (el as HTMLElement).click(); });
}
const option = (text: RegExp) => [...document.querySelectorAll('[role="option"]')].find(o => text.test(o.textContent || ''));
const cta = () => document.querySelector('.dw-cp-cta') as HTMLButtonElement | null;

describe('ChoosePathSheet', () => {
  it('opens on the current path and names the destination on the one CTA', () => {
    const { root } = mount(<ChoosePathSheet open onClose={() => {}} door="home" />);
    expect(document.body.textContent).toContain('Where are you today?');
    expect(option(/new to faith/i)?.getAttribute('aria-selected')).toBe('true');
    expect(cta()?.textContent).toBe('Start Day 1');
    click(option(/part of Futures Church/i));
    expect(cta()?.textContent).toBe("Open today's reading");
    act(() => root.unmount());
  });

  it('a first real choice saves with source onboarding, marks asked-once, closes, and reports the change', () => {
    const onClose = vi.fn();
    const onPicked = vi.fn();
    const { root } = mount(<ChoosePathSheet open onClose={onClose} door="landing" onPicked={onPicked} />);
    click(option(/part of Futures Church/i));
    click(cta());
    expect(saveSetup).toHaveBeenCalledWith({ persona: 'congregation', source: 'onboarding' });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onPicked).toHaveBeenCalledWith('congregation');
    act(() => root.unmount());
  });

  it('a change after a real choice saves with source settings — never default', () => {
    setup.persona = 'congregation';
    setup.source = 'onboarding';
    const { root } = mount(<ChoosePathSheet open onClose={() => {}} door="settings" />);
    click(option(/deeper in the Word/i));
    click(cta());
    expect(saveSetup).toHaveBeenCalledWith({ persona: 'deeper_study', source: 'settings' });
    act(() => root.unmount());
  });

  it('re-picking the path you already have just closes', () => {
    const onClose = vi.fn();
    const onPicked = vi.fn();
    const { root } = mount(<ChoosePathSheet open onClose={onClose} door="home" onPicked={onPicked} />);
    click(cta());
    expect(saveSetup).not.toHaveBeenCalled();
    expect(onPicked).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
    act(() => root.unmount());
  });

  it('paints nothing while closed (mounted with a live open prop)', () => {
    const { el, root } = mount(<ChoosePathSheet open={false} onClose={() => {}} door="home" />);
    expect(el.innerHTML).toBe('');
    act(() => root.unmount());
  });

  it('a signed-in pastor can still change path (a real choice), and sign-out is offered beside it', () => {
    signedIn.value = true;
    setup.persona = 'pastor_leader';
    setup.source = 'settings';
    const onClose = vi.fn();
    const onPicked = vi.fn();
    const { root } = mount(<ChoosePathSheet open onClose={onClose} door="settings" onPicked={onPicked} />);
    expect(option(/pastor and I teach and preach/i)?.getAttribute('aria-selected')).toBe('true');
    expect(document.querySelectorAll('[role="option"][aria-disabled="true"]').length).toBe(0);
    expect(document.body.textContent).toContain('Signed in as pastor');
    expect(document.body.textContent).toContain('Sign out of pastor account');
    click(option(/something hard/i));
    click(cta());
    expect(saveSetup).toHaveBeenCalledWith({ persona: 'comfort', source: 'settings' });
    expect(onPicked).toHaveBeenCalledWith('comfort');
    expect(clearStaffIdentity).not.toHaveBeenCalled();
    act(() => root.unmount());
  });

  it('sign out of pastor account calls clearStaffIdentity and closes', () => {
    signedIn.value = true;
    setup.persona = 'pastor_leader';
    const onClose = vi.fn();
    const { root } = mount(<ChoosePathSheet open onClose={onClose} door="home" />);
    click([...document.querySelectorAll('button')].find(b => /sign out of pastor account/i.test(b.textContent || '')));
    expect(clearStaffIdentity).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(saveSetup).not.toHaveBeenCalled();
    act(() => root.unmount());
  });
});

describe('PathSwatch', () => {
  it('shows the short label and a chevron — never a lock, even for a signed-in pastor', () => {
    const a = mount(<PathSwatch persona="congregation" />);
    expect(a.el.textContent).toContain('Member');
    expect(a.el.querySelector('svg.lucide-chevron-down')).toBeTruthy();
    act(() => a.root.unmount());
    signedIn.value = true;
    const b = mount(<PathSwatch persona="pastor_leader" />);
    expect(b.el.textContent).toContain('Leader');
    expect(b.el.querySelector('svg.lucide-chevron-down')).toBeTruthy();
    expect(b.el.querySelector('svg.lucide-lock')).toBeNull();
    act(() => b.root.unmount());
  });
});
