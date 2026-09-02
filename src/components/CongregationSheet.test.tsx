import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act, type ReactElement } from 'react';
import { CongregationSheet } from './CongregationSheet';
import { getCongregation, CONGREGATION_KEY } from '../utils/congregation';

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

describe('CongregationSheet', () => {
  beforeEach(() => { localStorage.clear(); });

  it('lists the three churches and a tap saves the choice, closes, and reports it', async () => {
    const onClose = vi.fn();
    const onPicked = vi.fn();
    const { el, root } = mount(<CongregationSheet open onClose={onClose} onPicked={onPicked} />);
    const options = [...el.querySelectorAll('[role="option"]')];
    expect(options.map(o => o.querySelector('span span')?.textContent)).toEqual(['Futures USA', 'Futures Australia', 'Futuros USA']);
    await act(async () => { (el.querySelector('[data-testid="congregation-futures-au"]') as HTMLButtonElement).click(); });
    expect(localStorage.getItem(CONGREGATION_KEY)).toBe('futures-au');
    expect(getCongregation()).toBe('futures-au');
    expect(onClose).toHaveBeenCalled();
    expect(onPicked).toHaveBeenCalledWith('futures-au', true);
    act(() => root.unmount());
  });

  it('renders nothing when closed', () => {
    const { el, root } = mount(<CongregationSheet open={false} onClose={() => {}} />);
    expect(el.querySelector('[data-testid="congregation-sheet"]')).toBeNull();
    act(() => root.unmount());
  });
});
