import { describe, it, expect, vi, afterEach } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { MoAppsMount } from './MoAppsMount';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

afterEach(() => { delete window.moApps; });

describe('MoAppsMount', () => {
  it('sets the member-tier config, then clears it on sign-out', async () => {
    const set = vi.fn();
    window.moApps = { set };
    const root = createRoot(document.createElement('div'));
    await act(async () => { root.render(<MoAppsMount email="a@b.org" lang="en" />); });
    expect(set).toHaveBeenCalledWith({ app: 'dailyword', tier: 'member', email: 'a@b.org', lang: 'en' });
    await act(async () => { root.unmount(); });
    expect(set).toHaveBeenLastCalledWith(null);
  });
  it('does nothing if the script is absent', async () => {
    const root = createRoot(document.createElement('div'));
    await act(async () => { root.render(<MoAppsMount email="a@b.org" lang="en" />); });
    await act(async () => { root.unmount(); });
  });
});
