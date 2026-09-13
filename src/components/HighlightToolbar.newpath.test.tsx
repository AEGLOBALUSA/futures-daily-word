import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act, type ReactElement } from 'react';

import { ScriptureSelectionProvider } from '../contexts/ScriptureSelectionContext';
import { ScripturePassage } from './ScripturePassage';
import { HighlightToolbar } from './HighlightToolbar';

beforeAll(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});
beforeEach(() => { localStorage.clear(); });

function mount(ui: ReactElement): { el: HTMLDivElement; root: Root } {
  const el = document.createElement('div');
  document.body.appendChild(el);
  const root = createRoot(el);
  act(() => { root.render(ui); });
  return { el, root };
}

const PASSAGE_TEXT = '[1] In the beginning God created the heavens and the earth.';
const PASSAGE_REF = 'Genesis 1';
const MULTI_PASSAGE_TEXT =
  '[1] In the beginning God created the heavens and the earth. [2] And the earth was without form, and void.';

function mountFixture(onWhatThisMeans: () => void, text: string = PASSAGE_TEXT) {
  return mount(
    <ScriptureSelectionProvider>
      <ScripturePassage text={text} passageRef={PASSAGE_REF} newPath />
      <HighlightToolbar
        onOpenNotes={() => {}}
        onGoDeeper={() => {}}
        newPath
        onWhatThisMeans={onWhatThisMeans}
      />
    </ScriptureSelectionProvider>
  );
}

describe('HighlightToolbar — newPath is read-only until an explicit Highlight', () => {
  it('tapping a verse on newPath leaves dw_highlights untouched and still opens the toolbar', () => {
    const { el, root } = mountFixture(vi.fn());
    const verseEl = el.querySelector('[role="button"]') as HTMLElement;
    expect(verseEl).toBeTruthy();
    act(() => { verseEl.click(); });

    expect(localStorage.getItem('dw_highlights')).toBeNull();
    // Toolbar is now open — the "What this means" and Highlight actions are present.
    expect(el.textContent).toContain('What this means');
    expect(el.textContent).toContain('Highlight');
    act(() => root.unmount());
  });

  it("pressing the toolbar's Highlight action writes dw_highlights", () => {
    const { el, root } = mountFixture(vi.fn());
    const verseEl = el.querySelector('[role="button"]') as HTMLElement;
    act(() => { verseEl.click(); });
    expect(localStorage.getItem('dw_highlights')).toBeNull();

    const highlightBtn = [...el.querySelectorAll('button')]
      .find(b => /^Highlight$/.test((b.textContent || '').trim()));
    expect(highlightBtn).toBeTruthy();
    act(() => { highlightBtn!.click(); });

    const stored = JSON.parse(localStorage.getItem('dw_highlights') || '{}');
    expect(stored['Genesis 1:1']).toBeTruthy();
    act(() => root.unmount());
  });

  it("the 'What this means' button's onClick is the passed onWhatThisMeans and writes nothing", () => {
    const onWhatThisMeans = vi.fn();
    const { el, root } = mountFixture(onWhatThisMeans);
    const verseEl = el.querySelector('[role="button"]') as HTMLElement;
    act(() => { verseEl.click(); });

    const whatBtn = [...el.querySelectorAll('button')]
      .find(b => (b.textContent || '').includes('What this means'));
    expect(whatBtn).toBeTruthy();
    act(() => { whatBtn!.click(); });

    expect(onWhatThisMeans).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('dw_highlights')).toBeNull();
    act(() => root.unmount());
  });

  it('a tapped verse renders with the selected (gold) state, aria-pressed true', () => {
    const { el, root } = mountFixture(vi.fn());
    const verseEl = el.querySelector('[role="button"]') as HTMLElement;
    act(() => { verseEl.click(); });

    expect(verseEl.getAttribute('aria-pressed')).toBe('true');
    act(() => root.unmount());
  });

  it('after Select All the Highlight button is absent (no single-verse Highlight action)', () => {
    const { el, root } = mountFixture(vi.fn(), MULTI_PASSAGE_TEXT);
    const selectAllBtn = [...el.querySelectorAll('button')]
      .find(b => /select all/i.test((b.textContent || '').trim()));
    expect(selectAllBtn).toBeTruthy();
    act(() => { selectAllBtn!.click(); });

    const highlightBtn = [...el.querySelectorAll('button')]
      .find(b => /^Highlight$/.test((b.textContent || '').trim()));
    expect(highlightBtn).toBeUndefined();
    act(() => root.unmount());
  });

  it('after a single tap the Highlight button is present and writes dw_highlights for exactly that verse key', () => {
    const { el, root } = mountFixture(vi.fn(), MULTI_PASSAGE_TEXT);
    const verseEls = [...el.querySelectorAll('[role="button"]')] as HTMLElement[];
    act(() => { verseEls[0].click(); });

    const highlightBtn = [...el.querySelectorAll('button')]
      .find(b => /^Highlight$/.test((b.textContent || '').trim()));
    expect(highlightBtn).toBeTruthy();
    act(() => { highlightBtn!.click(); });

    const stored = JSON.parse(localStorage.getItem('dw_highlights') || '{}');
    expect(Object.keys(stored)).toEqual(['Genesis 1:1']);
    act(() => root.unmount());
  });
});
