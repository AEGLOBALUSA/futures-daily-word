import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act, type ReactElement } from 'react';
import type { AlphaFeature } from '../alpharetta-gate/types';
import AlpharettaPanel from './AlpharettaPanel';

function mount(ui: ReactElement): { el: HTMLDivElement; root: Root } {
  const el = document.createElement('div');
  document.body.appendChild(el);
  const root = createRoot(el);
  act(() => { root.render(ui); });
  return { el, root };
}

beforeAll(() => { (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true; });
afterEach(() => { document.body.innerHTML = ''; });

describe('AlpharettaPanel', () => {
  it('shows the creator empty state from props', () => {
    const { el, root } = mount(<AlpharettaPanel features={[]} creator ready onOpen={vi.fn()} />);
    expect(el.textContent).toContain('Your Alpharetta space is ready');
    expect(el.querySelector('a[href="https://claude.ai/code"]')).toBeTruthy();
    act(() => root.unmount());
  });

  it('calls onOpen for a feature card', () => {
    const Page = (() => null) as unknown as AlphaFeature['Page'];
    const feature = { id: 'first-feature', title: 'First feature', visibility: 'creator', Page } as AlphaFeature;
    const onOpen = vi.fn();
    const { el, root } = mount(<AlpharettaPanel features={[feature]} creator ready onOpen={onOpen} />);
    act(() => { (el.querySelector('button[aria-label="First feature"]') as HTMLButtonElement).click(); });
    expect(onOpen).toHaveBeenCalledWith(feature);
    act(() => root.unmount());
  });

  it('shows loading while the gate is not ready', () => {
    const { el, root } = mount(<AlpharettaPanel features={[]} creator={false} ready={false} onOpen={vi.fn()} />);
    expect(el.textContent).toContain('Loading…');
    act(() => root.unmount());
  });
});
