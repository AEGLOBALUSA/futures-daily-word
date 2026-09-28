import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act, lazy, type ReactElement } from 'react';
import type { AlphaFeature } from './types';

const state = vi.hoisted(() => ({
  staff: { campusId: 'us-alpharetta', role: 'pastor', isAdmin: false },
  profile: { campus: 'us-alpharetta' },
  features: [] as AlphaFeature[],
  track: vi.fn(),
}));

vi.mock('../contexts/UserContext', () => ({ useUser: () => ({ userProfile: state.profile }) }));
vi.mock('./useAlphaStaff', () => ({ useAlphaStaff: () => state.staff }));
vi.mock('../utils/analytics', () => ({ track: state.track }));
vi.mock('./features', () => ({ FEATURES: state.features }));

import AlpharettaPanel from './AlpharettaPanel';

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

beforeEach(() => {
  state.staff = { campusId: 'us-alpharetta', role: 'pastor', isAdmin: false };
  state.profile = { campus: 'us-alpharetta' };
  state.features.splice(0);
  state.track.mockReset();
});

afterEach(() => { document.body.innerHTML = ''; });

describe('AlpharettaPanel', () => {
  it('shows the creator empty state and Claude link', () => {
    const { root } = mount(<AlpharettaPanel />);
    expect(document.body.textContent).toContain('Your Alpharetta space is ready');
    expect(document.querySelector('a[href="https://claude.ai/code"]')).toBeTruthy();
    act(() => root.unmount());
  });

  it('opens a feature page and tracks it', async () => {
    const Page = lazy(async () => ({ default: ({ onClose }: { onClose: () => void }) => <button type="button" onClick={onClose}>Close feature</button> }));
    state.features.push({ id: 'first-feature', title: 'First feature', visibility: 'creator', Page });
    const { el, root } = mount(<AlpharettaPanel />);
    act(() => { (el.querySelector('button[aria-label="First feature"]') as HTMLButtonElement).click(); });
    await flush();
    expect(state.track).toHaveBeenCalledWith('alpharetta_feature_open', 'first-feature');
    expect(el.textContent).toContain('Close feature');
    act(() => root.unmount());
  });

  it('keeps Back available when a feature page throws', async () => {
    const Page = lazy(async () => ({ default: () => { throw new Error('broken'); } }));
    state.features.push({ id: 'broken-feature', title: 'Broken feature', visibility: 'creator', Page });
    const { el, root } = mount(<AlpharettaPanel />);
    act(() => { (el.querySelector('button[aria-label="Broken feature"]') as HTMLButtonElement).click(); });
    await flush();
    expect(el.textContent).toContain("This feature couldn't load. Everything else still works.");
    const back = [...el.querySelectorAll('button')].find(button => button.textContent === 'Back to Alpharetta');
    expect(back).toBeTruthy();
    act(() => { (back as HTMLButtonElement).click(); });
    expect(el.textContent).toContain('Broken feature');
    act(() => root.unmount());
  });
});
