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

describe('HomeContextChips', () => {
  it('opens Journey chooser and applies the pick there', () => {
    const onPersona = vi.fn();
    const { el, root } = mount(
      <HomeContextChips
        persona="congregation"
        campusId="us-gwinnett"
        onPersonaChange={onPersona}
        onCampusChange={vi.fn()}
      />,
    );
    const journey = [...el.querySelectorAll('button')].find(b => /journey/i.test(b.getAttribute('aria-label') || ''));
    expect(journey).toBeTruthy();
    expect(journey!.textContent).toMatch(/Church Member/i);
    click(journey!);
    const option = document.querySelector('input[value="new_to_faith"]') as HTMLInputElement | null;
    expect(option).toBeTruthy();
    act(() => { option!.click(); });
    expect(onPersona).toHaveBeenCalledWith('new_to_faith');
    act(() => root.unmount());
  });

  it('opens campus options and applies the pick there', () => {
    const onCampus = vi.fn();
    const { el, root } = mount(
      <HomeContextChips
        persona="new_to_faith"
        campusId="us-gwinnett"
        onPersonaChange={vi.fn()}
        onCampusChange={onCampus}
      />,
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

  it('shows New to Faith as status with a green marker, not a filled CTA', () => {
    const { el, root } = mount(
      <HomeContextChips
        persona="new_to_faith"
        campusId="us-gwinnett"
        onPersonaChange={vi.fn()}
        onCampusChange={vi.fn()}
      />,
    );
    const journey = [...el.querySelectorAll('button')].find(b => /journey/i.test(b.getAttribute('aria-label') || ''));
    expect(journey).toBeTruthy();
    expect(journey!.textContent).toMatch(/New to Faith/);
    expect(journey!.className).toContain('dw-journey-selector');
    expect(journey!.className).toContain('is-new');
    expect(el.querySelector('.dw-new-faith-cta')).toBeNull();
    act(() => root.unmount());
  });

  it('still shows a campus control when none is set', () => {
    const { el, root } = mount(
      <HomeContextChips
        persona="congregation"
        campusId=""
        onPersonaChange={vi.fn()}
        onCampusChange={vi.fn()}
      />,
    );
    const campusChip = [...el.querySelectorAll('button')].find(b => /campus/i.test(b.getAttribute('aria-label') || ''));
    expect(campusChip).toBeTruthy();
    act(() => root.unmount());
  });
});
