import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act, type ReactElement } from 'react';
import { UpgradePromptCard } from './UpgradePromptCard';

beforeAll(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});

beforeEach(() => {
  localStorage.clear();
});

function mount(ui: ReactElement): { el: HTMLDivElement; root: Root } {
  const el = document.createElement('div');
  document.body.appendChild(el);
  const root = createRoot(el);
  act(() => { root.render(ui); });
  return { el, root };
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

describe('UpgradePromptCard', () => {
  it('does not show Ready for More / Let\'s Go for new_to_faith after 60+ days or a finished path', () => {
    localStorage.setItem('dw_first_open', daysAgo(90));
    localStorage.setItem('dw_pathway_progress', JSON.stringify({
      enrolled: true,
      currentDay: 41,
      completedDays: Array.from({ length: 40 }, (_, i) => i + 1),
    }));
    const { el, root } = mount(
      <UpgradePromptCard persona="new_to_faith" onUpgrade={vi.fn()} />,
    );
    expect(el.textContent).not.toMatch(/Ready for More/i);
    expect(el.textContent).not.toMatch(/Let's Go/i);
    expect(el.textContent).not.toMatch(/growing in your faith/i);
    act(() => root.unmount());
  });

  it('still shows Go Deeper? for congregation when conditions are met', () => {
    localStorage.setItem('dw_activeplans', JSON.stringify({
      a: { completedDays: [1] },
      b: { completedDays: [1] },
      c: { completedDays: [1] },
    }));
    const { el, root } = mount(
      <UpgradePromptCard persona="congregation" onUpgrade={vi.fn()} />,
    );
    expect(el.textContent).toMatch(/Go Deeper\?/);
    expect(el.textContent).toMatch(/Let's Go/);
    act(() => root.unmount());
  });
});
