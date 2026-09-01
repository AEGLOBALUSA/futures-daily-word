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
  it('opens persona options on the chip and applies the pick there', () => {
    const onPersona = vi.fn();
    const { el, root } = mount(
      <HomeContextChips
        persona="congregation"
        campusId="us-gwinnett"
        onPersonaChange={onPersona}
        onCampusChange={vi.fn()}
      />,
    );
    const personaChip = [...el.querySelectorAll('button')].find(b => /church member/i.test(b.textContent || ''));
    expect(personaChip).toBeTruthy();
    click(personaChip!);
    const option = [...document.querySelectorAll('[role="option"]')].find(b => /i'm new to this/i.test(b.textContent || ''));
    expect(option).toBeTruthy();
    click(option!);
    expect(onPersona).toHaveBeenCalledWith('new_to_faith');
    act(() => root.unmount());
  });

  it('opens campus options on the chip and applies the pick there', () => {
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

  it('still shows a campus chip when none is set', () => {
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
