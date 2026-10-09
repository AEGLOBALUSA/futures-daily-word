import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act, type ReactElement } from 'react';

vi.mock('../utils/cloudSync', () => ({ pushNow: vi.fn(), schedulePush: vi.fn(), syncMisc: vi.fn() }));
vi.mock('../utils/analytics', () => ({ track: vi.fn() }));
vi.mock('../utils/api', () => ({ fetchPassage: vi.fn(async () => ''), fetchAICommentary: vi.fn(async () => '') }));
vi.mock('../contexts/ScriptureSelectionContext', () => ({
  useScriptureSelection: () => ({
    selection: { text: 'For God so loved', verseRefs: ['John 3:16'], source: 'range' },
    setSelection: vi.fn(),
  }),
}));

import { VerseNoteDrawer } from './VerseNoteDrawer';
import { InlineReflection } from './InlineReflection';
import { ScriptureModal } from '../screens/JournalScreen';

beforeAll(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});
beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); document.body.innerHTML = ''; });

function mount(ui: ReactElement): Root {
  const el = document.createElement('div');
  document.body.appendChild(el);
  const root = createRoot(el);
  act(() => { root.render(ui); });
  return root;
}

function type(value: string) {
  const el = document.querySelector('textarea') as HTMLTextAreaElement;
  act(() => {
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

function click(label: RegExp) {
  const b = Array.from(document.querySelectorAll('button')).find(x => label.test((x.getAttribute('aria-label') || '') + (x.textContent || '')))!;
  act(() => { b.click(); });
}

const draftKeys = () => Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i)!).filter(k => k.includes('draft'));

/** Make only the journal write fail (quota), leaving draft writes alone. */
function failJournalWrite() {
  const real = localStorage.setItem.bind(localStorage);
  vi.spyOn(localStorage, 'setItem').mockImplementation((k: string, v: string) => {
    if (k === 'dw_journal') throw new DOMException('full', 'QuotaExceededError');
    real(k, v);
  });
}

const FAILED = /device storage is full/i;

describe('VerseNoteDrawer save result', () => {
  it('failure: no "Saved", draft kept, drawer open, error shown, Save retries', () => {
    failJournalWrite();
    const onClose = vi.fn();
    const root = mount(<VerseNoteDrawer open onClose={onClose} />);
    type('my thought');
    click(/save/i);
    act(() => { vi.advanceTimersByTime(3000); });
    expect(document.body.textContent).toMatch(FAILED);
    expect(document.body.textContent).not.toMatch(/Saved/);
    expect(localStorage.getItem('dw_note_draft:John 3:16')).toBe('my thought');
    expect(onClose).not.toHaveBeenCalled();
    vi.restoreAllMocks();
    click(/save/i);
    act(() => { vi.advanceTimersByTime(3000); });
    expect(JSON.parse(localStorage.getItem('dw_journal')!)[0].body).toBe('my thought');
    expect(onClose).toHaveBeenCalled();
    act(() => root.unmount());
  });

  it('success: saves, shows Saved, clears the draft, closes', () => {
    const onClose = vi.fn();
    const root = mount(<VerseNoteDrawer open onClose={onClose} />);
    type('my thought');
    click(/save/i);
    act(() => { vi.advanceTimersByTime(3000); });
    expect(document.body.textContent).toMatch(/Saved/);
    expect(document.body.textContent).not.toMatch(FAILED);
    expect(localStorage.getItem('dw_note_draft:John 3:16')).toBeNull();
    expect(onClose).toHaveBeenCalled();
    act(() => root.unmount());
  });
});

describe('InlineReflection save result', () => {
  const ui = <InlineReflection label="Reflect" prompt="What stood out?" verseRef="John 3:16" />;

  it('failure: no "Saved", draft kept, editor open, error shown', () => {
    failJournalWrite();
    const root = mount(ui);
    click(/Reflect/);
    type('a reflection');
    expect(draftKeys().length).toBe(1);
    click(/save/i);
    act(() => { vi.advanceTimersByTime(3000); });
    expect(document.body.textContent).toMatch(FAILED);
    expect(document.body.textContent).not.toMatch(/Saved/);
    expect((document.querySelector('textarea') as HTMLTextAreaElement).value).toBe('a reflection');
    expect(draftKeys().length).toBe(1);
    act(() => root.unmount());
  });

  it('success: saves, shows Saved, clears the draft', () => {
    const root = mount(ui);
    click(/Reflect/);
    type('a reflection');
    click(/save/i);
    act(() => { vi.advanceTimersByTime(3000); });
    expect(document.body.textContent).toMatch(/Saved/);
    expect(document.body.textContent).not.toMatch(FAILED);
    expect(JSON.parse(localStorage.getItem('dw_journal')!)[0].body).toBe('a reflection');
    expect(draftKeys().length).toBe(0);
    act(() => root.unmount());
  });
});

describe('ScriptureModal (Journal) save result', () => {
  const render = (onSave: () => boolean, onClose: () => void) =>
    mount(<ScriptureModal passage="John 3:16" planTitle={null} dayNum={null} existingNote={undefined} onSave={onSave} onClose={onClose} />);

  it('failure: no "Saved", does not close, error shown, draft kept', () => {
    const onClose = vi.fn();
    const root = render(() => false, onClose);
    type('study note');
    click(/save note/i);
    act(() => { vi.advanceTimersByTime(3000); });
    expect(document.body.textContent).toMatch(FAILED);
    expect(document.body.textContent).not.toMatch(/Saved/);
    expect((document.querySelector('textarea') as HTMLTextAreaElement).value).toBe('study note');
    expect(onClose).not.toHaveBeenCalled();
    act(() => root.unmount());
  });

  it('success: shows Saved then closes', () => {
    const onClose = vi.fn();
    const root = render(() => true, onClose);
    type('study note');
    click(/save note/i);
    expect(document.body.textContent).toMatch(/Saved/);
    act(() => { vi.advanceTimersByTime(1500); });
    expect(onClose).toHaveBeenCalled();
    act(() => root.unmount());
  });
});
