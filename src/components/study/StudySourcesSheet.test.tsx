import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act, type ReactElement } from 'react';
import { readFileSync } from 'fs';
import { join } from 'path';

vi.mock('../../utils/study', () => ({
  fetchStudySources: () => Promise.resolve({
    sources: [{ id: 's1', name: 'Matthew Henry', licence: 'Public domain', attribution: 'Public domain', record_count: 10 }],
  }),
}));

import { StudySourcesSheet } from './StudySourcesSheet';

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

describe('StudySourcesSheet', () => {
  it('does not import or call useModalA11y — useSubView only (source grep)', () => {
    const src = readFileSync(join(__dirname, 'StudySourcesSheet.tsx'), 'utf8');
    expect(src).toMatch(/useSubView/);
    expect(src).not.toMatch(/useModalA11y/);
  });

  it('renders nothing while closed, then mounts StudySourcesCard once opened', async () => {
    const onClose = vi.fn();
    const { root } = mount(<StudySourcesSheet open={false} onClose={onClose} lang="en" />);
    expect(document.body.textContent).not.toContain('Where this comes from');
    expect(document.querySelector('[data-testid="study-sources-sheet"]')).toBeNull();

    act(() => { root.render(<StudySourcesSheet open onClose={onClose} lang="en" />); });
    expect(document.querySelector('[data-testid="study-sources-sheet"]')).toBeTruthy();
    expect(document.body.textContent).toContain('Where this comes from');
    await act(async () => { await Promise.resolve(); });
    expect(document.body.textContent).toContain('Matthew Henry');

    act(() => root.unmount());
  });

  it('calls onClose exactly once when the close button is tapped', () => {
    const onClose = vi.fn();
    const { root } = mount(<StudySourcesSheet open onClose={onClose} lang="en" />);
    const closeBtn = document.querySelector('[data-testid="study-sources-sheet-close"]') as HTMLElement;
    expect(closeBtn).toBeTruthy();
    act(() => { closeBtn.click(); });
    expect(onClose).toHaveBeenCalledTimes(1);
    act(() => root.unmount());
  });
});
