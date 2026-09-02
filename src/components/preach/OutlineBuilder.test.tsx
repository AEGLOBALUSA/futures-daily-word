/**
 * OutlineBuilder — assertions on data-testid/structure, not translated text:
 * the `preach_*` i18n keys aren't registered yet (the orchestrator adds
 * them), so t() returns the raw key at test time for anything preach_-prefixed.
 * `note_saving` / `note_saved` are pre-existing keys and DO render translated
 * text, so the save pill can be asserted on i18n where it's convenient.
 */
import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act, type ReactElement } from 'react';

const prep = vi.hoisted(() => ({ items: [] as { id: string; ref: string; text: string; ts: number }[] }));

vi.mock('../../utils/sermonPrep', () => ({
  getPrepItems: () => prep.items,
}));

import { OutlineBuilder } from './OutlineBuilder';

const KEY = 'dw_preach_outline';

beforeAll(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});

beforeEach(() => {
  localStorage.clear();
  prep.items = [];
});

afterEach(() => {
  vi.useRealTimers();
});

function mount(ui: ReactElement): { el: HTMLDivElement; root: Root } {
  const el = document.createElement('div');
  document.body.appendChild(el);
  const root = createRoot(el);
  act(() => { root.render(ui); });
  return { el, root };
}

function unmount(m: { el: HTMLDivElement; root: Root }) {
  act(() => { m.root.unmount(); });
  m.el.remove();
}

function setInputValue(input: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const proto = input instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')!.set!;
  act(() => {
    setter.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

function click(el: Element) {
  act(() => { (el as HTMLElement).click(); });
}

function testid(el: HTMLElement, id: string): HTMLElement {
  const found = el.querySelector(`[data-testid="${id}"]`);
  expect(found, `missing [data-testid="${id}"]`).toBeTruthy();
  return found as HTMLElement;
}

describe('OutlineBuilder — points', () => {
  it('starts with points, lets you add up to 5 and remove down to 1', () => {
    const m = mount(<OutlineBuilder lang="en" />);
    // Add until the add button disappears (cap at 5).
    for (let i = 0; i < 10; i++) {
      const addBtn = m.el.querySelector('[data-testid="outline-add-point"]');
      if (!addBtn) break;
      click(addBtn);
    }
    expect(m.el.querySelectorAll('[data-testid^="outline-point-heading-"]').length).toBe(5);
    expect(m.el.querySelector('[data-testid="outline-add-point"]')).toBeNull();

    // Remove until only 1 remains — the last one offers no remove button.
    for (let i = 0; i < 10; i++) {
      const removeBtn = m.el.querySelector('[data-testid^="outline-remove-point-"]');
      if (!removeBtn) break;
      click(removeBtn);
    }
    expect(m.el.querySelectorAll('[data-testid^="outline-point-heading-"]').length).toBe(1);
    expect(m.el.querySelector('[data-testid^="outline-remove-point-"]')).toBeNull();
    unmount(m);
  });
});

describe('OutlineBuilder — seed from highlights', () => {
  it('disables the seed button with a muted note when the prep bag is empty', () => {
    const m = mount(<OutlineBuilder lang="en" />);
    const seedBtn = testid(m.el, 'outline-seed-button') as HTMLButtonElement;
    expect(seedBtn.disabled).toBe(true);
    expect(m.el.querySelector('[data-testid="outline-seed-empty-note"]')).toBeTruthy();
    unmount(m);
  });

  it('fills empty point bodies from the newest prep items on click, never overwriting typed text', () => {
    prep.items = [
      { id: '1', ref: 'John 3:16', text: 'For God so loved the world.', ts: 2 },
      { id: '2', ref: 'Romans 8:28', text: 'All things work together for good.', ts: 1 },
    ];
    const m = mount(<OutlineBuilder lang="en" />);
    const seedBtn = testid(m.el, 'outline-seed-button') as HTMLButtonElement;
    expect(seedBtn.disabled).toBe(false);
    click(seedBtn);
    const body0 = testid(m.el, 'outline-point-body-0') as HTMLTextAreaElement;
    const body1 = testid(m.el, 'outline-point-body-1') as HTMLTextAreaElement;
    expect(body0.value).toBe('John 3:16 — For God so loved the world.');
    expect(body1.value).toBe('Romans 8:28 — All things work together for good.');
    unmount(m);
  });
});

describe('OutlineBuilder — framework picker', () => {
  it('picking the 4d chip sets four headings, leaving a typed one alone', () => {
    const m = mount(<OutlineBuilder lang="en" />);
    const heading0 = testid(m.el, 'outline-point-heading-0') as HTMLInputElement;
    setInputValue(heading0, 'My own opener');

    const chip = testid(m.el, 'outline-framework-chip-4d');
    click(chip);

    expect((testid(m.el, 'outline-point-heading-0') as HTMLInputElement).value).toBe('My own opener');
    expect((testid(m.el, 'outline-point-heading-1') as HTMLInputElement).value).toBe('Develop');
    expect((testid(m.el, 'outline-point-heading-2') as HTMLInputElement).value).toBe('Deploy');
    expect((testid(m.el, 'outline-point-heading-3') as HTMLInputElement).value).toBe('Depart');
    expect(chip.getAttribute('aria-selected')).toBe('true');
    unmount(m);
  });

  it('the None chip clears the framework selection', () => {
    const m = mount(<OutlineBuilder lang="en" />);
    click(testid(m.el, 'outline-framework-chip-4d'));
    expect(testid(m.el, 'outline-framework-chip-4d').getAttribute('aria-selected')).toBe('true');
    click(testid(m.el, 'outline-framework-chip-none'));
    expect(testid(m.el, 'outline-framework-chip-none').getAttribute('aria-selected')).toBe('true');
    expect(testid(m.el, 'outline-framework-chip-4d').getAttribute('aria-selected')).toBe('false');
    unmount(m);
  });
});

describe('OutlineBuilder — auto-save', () => {
  it('marks the outline dirty on typing and lands the save in localStorage after the debounce', () => {
    vi.useFakeTimers();
    const onChange = vi.fn();
    const m = mount(<OutlineBuilder lang="en" onChange={onChange} />);

    const title = testid(m.el, 'outline-title') as HTMLInputElement;
    setInputValue(title, 'Grace That Multiplies');

    // Immediately after typing: dirty ("saving"), not yet persisted.
    expect(m.el.textContent).toContain('Saving');
    const beforeSave = localStorage.getItem(KEY);
    const beforeParsed = beforeSave ? JSON.parse(beforeSave) : null;
    expect(beforeParsed?.title).not.toBe('Grace That Multiplies');

    act(() => { vi.advanceTimersByTime(400); });

    const stored = JSON.parse(localStorage.getItem(KEY) || '{}');
    expect(stored.title).toBe('Grace That Multiplies');
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ title: 'Grace That Multiplies' }));
    expect(m.el.textContent).toContain('Saved');

    unmount(m);
  });

  it('debounces rapid edits into a single save', () => {
    vi.useFakeTimers();
    const onChange = vi.fn();
    const m = mount(<OutlineBuilder lang="en" onChange={onChange} />);
    const title = testid(m.el, 'outline-title') as HTMLInputElement;

    setInputValue(title, 'First');
    act(() => { vi.advanceTimersByTime(200); });
    setInputValue(title, 'Second');
    act(() => { vi.advanceTimersByTime(200); });
    setInputValue(title, 'Third');
    act(() => { vi.advanceTimersByTime(400); });

    expect(onChange).toHaveBeenCalledTimes(1);
    const stored = JSON.parse(localStorage.getItem(KEY) || '{}');
    expect(stored.title).toBe('Third');
    unmount(m);
  });
});

describe('OutlineBuilder — preview', () => {
  it('shows outlineToNotes shape in the read-only preview', () => {
    const m = mount(<OutlineBuilder lang="en" />);
    const bigIdea = testid(m.el, 'outline-big-idea') as HTMLTextAreaElement;
    setInputValue(bigIdea, 'The one thing');
    const preview = testid(m.el, 'outline-preview');
    expect(preview.textContent).toContain('The one thing');
    unmount(m);
  });
});
