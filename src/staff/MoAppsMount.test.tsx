// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { MoAppsMount } from './MoAppsMount';

afterEach(() => { cleanup(); delete window.moApps; });

describe('MoAppsMount', () => {
  it('sets the member-tier config, then clears it on sign-out', () => {
    const set = vi.fn();
    window.moApps = { set };
    const { unmount } = render(<MoAppsMount email="a@b.org" lang="en" />);
    expect(set).toHaveBeenCalledWith({ app: 'dailyword', tier: 'member', email: 'a@b.org', lang: 'en' });
    unmount();
    expect(set).toHaveBeenLastCalledWith(null);
  });
  it('does nothing if the script is absent', () => {
    expect(() => render(<MoAppsMount email="a@b.org" lang="en" />)).not.toThrow();
  });
});
