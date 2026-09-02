import { describe, it, expect, vi, beforeAll } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act, type ReactElement } from 'react';
import { HomeContextChips } from './HomeContextChips';

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

function click(el: Element) {
  act(() => { (el as HTMLElement).click(); });
}

// The persona half moved to the PathSwatch / ChoosePathSheet ("Choose your
// path", 2 Sep 2026) — this chip is campus-only now.
describe('HomeContextChips (campus)', () => {
  it('opens campus options on the chip and applies the pick there', () => {
    const onCampus = vi.fn();
    const { el, root } = mount(
      <HomeContextChips campusId="us-gwinnett" onCampusChange={onCampus} />,
    );
    const campusChip = [...el.querySelectorAll('button')].find(b => /gwinnett/i.test(b.textContent || ''));
    expect(campusChip).toBeTruthy();
    click(campusChip!);
    const option = [...document.querySelectorAll('[role="option"]')].find(b => (b.textContent || '').includes('Futures Kennesaw'));
    expect(option).toBeTruthy();
    click(option!);
    expect(onCampus).toHaveBeenCalledWith('us-kennesaw');
    act(() => root.unmount());
  });

  it('renders no persona chip — the path lives in the header swatch', () => {
    const { el, root } = mount(
      <HomeContextChips campusId="us-gwinnett" onCampusChange={vi.fn()} />,
    );
    expect(el.querySelectorAll('button').length).toBe(1);
    expect(el.textContent).not.toMatch(/church member|i'm new/i);
    act(() => root.unmount());
  });

  it('still shows a campus chip when none is set', () => {
    const { el, root } = mount(
      <HomeContextChips campusId="" onCampusChange={vi.fn()} />,
    );
    const campusChip = [...el.querySelectorAll('button')].find(b => /campus/i.test(b.getAttribute('aria-label') || ''));
    expect(campusChip).toBeTruthy();
    act(() => root.unmount());
  });
});
