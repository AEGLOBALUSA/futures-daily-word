import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act, type ReactElement } from 'react';

// ── Contract modules some are OWNED BY OTHER AGENTS and may not exist on disk
//    yet — mocked here per house rules, never stubbed on disk. ──
vi.mock('../utils/currentSermon', () => ({
  fetchCurrentSermon: vi.fn().mockResolvedValue(null),
}));

vi.mock('../utils/preachOutline', () => ({
  emptyOutline: () => ({
    title: '', passage: '', series: '', date: '', speaker: '',
    bigIdea: '', points: [], weeklyAction: '', updatedAt: 0,
  }),
  loadOutline: () => ({
    title: '', passage: '', series: '', date: '', speaker: '',
    bigIdea: '', points: [], weeklyAction: '', updatedAt: 0,
  }),
  saveOutline: vi.fn(),
  outlineToNotes: () => '',
  seedFromPrep: (o: unknown) => o,
  applyFramework: (o: unknown) => o,
  OUTLINE_EVENT: 'dw-preach-outline-updated',
}));

vi.mock('../components/preach/PrepSheet', () => ({
  PrepSheet: (props: { onAddToOutline: (item: { ref: string; text: string }) => void }) => (
    <div data-testid="mock-prep-sheet">
      <button
        data-testid="mock-add-to-outline"
        onClick={() => props.onAddToOutline({ ref: 'John 1:1', text: 'In the beginning was the Word' })}
      >
        Add to outline
      </button>
    </div>
  ),
}));

vi.mock('../components/preach/OutlineBuilder', () => ({
  OutlineBuilder: () => <div data-testid="mock-outline-builder" />,
}));

vi.mock('../components/preach/PublishSermon', () => ({
  PublishSermon: (props: { onPublished: (r: unknown) => void }) => (
    <div data-testid="mock-publish-sermon">
      <button data-testid="mock-publish-now" onClick={() => props.onPublished({ id: 'abc' })}>
        Publish
      </button>
    </div>
  ),
}));

vi.mock('../components/preach/SermonArchive', () => ({
  SermonArchive: () => <div data-testid="mock-sermon-archive" />,
}));

vi.mock('./SermonNotesScreen', () => ({
  SermonNotesScreen: (props: { embedded?: boolean; readOnly?: boolean }) => (
    <div data-testid="mock-sermon-notes-screen" data-embedded={props.embedded ? '1' : '0'} data-readonly={props.readOnly ? '1' : '0'} />
  ),
}));

vi.mock('../utils/sermonPrep', async () => {
  const actual = await vi.importActual<typeof import('../utils/sermonPrep')>('../utils/sermonPrep');
  return { ...actual, addPrepItem: vi.fn() };
});

import { PreachScreen } from './PreachScreen';
import * as sermonPrep from '../utils/sermonPrep';

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

function setPersona(persona: string) {
  localStorage.setItem('dw_setup', JSON.stringify({ persona, source: 'settings' }));
}

async function flush() {
  await act(async () => { await Promise.resolve(); await Promise.resolve(); });
}

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

describe('PreachScreen', () => {
  it('falls back to the congregation SermonNotesScreen for a non-pastor persona', async () => {
    setPersona('congregation');
    const { el, root } = mount(<PreachScreen onBack={vi.fn()} />);
    await flush();
    expect(el.querySelector('[data-testid="mock-sermon-notes-screen"]')).toBeTruthy();
    expect(el.querySelector('[data-testid="preach-tabs"]')).toBeNull();
    act(() => root.unmount());
  });

  it('renders the four-way tab workspace for pastor_leader', async () => {
    setPersona('pastor_leader');
    const { el, root } = mount(<PreachScreen onBack={vi.fn()} />);
    await flush();
    expect(el.querySelector('[data-testid="preach-tabs"]')).toBeTruthy();
    // Prep is the default segment.
    expect(el.querySelector('[data-testid="mock-prep-sheet"]')).toBeTruthy();
    expect(el.querySelector('[data-testid="mock-outline-builder"]')).toBeNull();
    act(() => root.unmount());
  });

  it('switching segments swaps the visible child', async () => {
    setPersona('pastor_leader');
    const { el, root } = mount(<PreachScreen onBack={vi.fn()} />);
    await flush();

    click(el.querySelector('[data-testid="preach-tab-outline"]')!);
    expect(el.querySelector('[data-testid="mock-outline-builder"]')).toBeTruthy();
    expect(el.querySelector('[data-testid="mock-prep-sheet"]')).toBeNull();

    click(el.querySelector('[data-testid="preach-tab-publish"]')!);
    expect(el.querySelector('[data-testid="mock-publish-sermon"]')).toBeTruthy();
    expect(el.querySelector('[data-testid="mock-outline-builder"]')).toBeNull();

    click(el.querySelector('[data-testid="preach-tab-archive"]')!);
    expect(el.querySelector('[data-testid="mock-sermon-archive"]')).toBeTruthy();
    expect(el.querySelector('[data-testid="mock-publish-sermon"]')).toBeNull();

    act(() => root.unmount());
  });

  it('remembers the last open segment in localStorage', async () => {
    setPersona('pastor_leader');
    const first = mount(<PreachScreen onBack={vi.fn()} />);
    await flush();
    click(first.el.querySelector('[data-testid="preach-tab-publish"]')!);
    expect(localStorage.getItem('dw_preach_tab')).toBe('publish');
    act(() => first.root.unmount());

    const second = mount(<PreachScreen onBack={vi.fn()} />);
    await flush();
    expect(second.el.querySelector('[data-testid="mock-publish-sermon"]')).toBeTruthy();
    act(() => second.root.unmount());
  });

  it('publishing switches to Archive and shows a success line', async () => {
    setPersona('pastor_leader');
    const { el, root } = mount(<PreachScreen onBack={vi.fn()} />);
    await flush();
    click(el.querySelector('[data-testid="preach-tab-publish"]')!);
    click(el.querySelector('[data-testid="mock-publish-now"]')!);
    expect(el.querySelector('[data-testid="mock-sermon-archive"]')).toBeTruthy();
    expect(el.querySelector('[data-testid="preach-published-success"]')).toBeTruthy();
    act(() => root.unmount());
  });

  it("onAddToOutline from the Prep sheet files a prep item", async () => {
    setPersona('pastor_leader');
    const { el, root } = mount(<PreachScreen onBack={vi.fn()} />);
    await flush();
    click(el.querySelector('[data-testid="mock-add-to-outline"]')!);
    expect(sermonPrep.addPrepItem).toHaveBeenCalledTimes(1);
    expect(sermonPrep.addPrepItem).toHaveBeenCalledWith('John 1:1', 'In the beginning was the Word');
    act(() => root.unmount());
  });
});
