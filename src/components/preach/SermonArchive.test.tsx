import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act, type ReactElement } from 'react';
import { SermonArchive } from './SermonArchive';
import { resetSermonArchiveCache, type ArchivedSermon } from '../../utils/sermonArchive';
import type { SermonNotesData } from '../SermonNotesSurface';

beforeAll(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});

let mounted: { el: HTMLDivElement; root: Root } | null = null;
function mount(ui: ReactElement): HTMLDivElement {
  const el = document.createElement('div');
  document.body.appendChild(el);
  const root = createRoot(el);
  act(() => { root.render(ui); });
  mounted = { el, root };
  return el;
}

async function flush() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
}

function type(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
  act(() => {
    setter.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

function sermon(overrides: Partial<SermonNotesData>): SermonNotesData {
  return { id: 'x', title: 'Untitled', ...overrides };
}

const LIVING_WATER: ArchivedSermon = {
  id: 'a1',
  is_current: false,
  published_at: '2026-08-01T00:00:00.000Z',
  sermon: sermon({
    id: 'a1',
    title: 'Living Water',
    series: 'Grace Series',
    speaker: 'Ashley Evans',
    date: '2026-08-02',
    keyVerse: 'John 4:14',
  }),
};

const FAITH_OVER_FEAR: ArchivedSermon = {
  id: 'a2',
  is_current: true,
  published_at: '2026-08-08T00:00:00.000Z',
  sermon: sermon({
    id: 'a2',
    title: 'Faith Over Fear',
    speaker: 'Ashley Evans',
    date: '2026-08-09',
    keyVerse: 'Romans 8:28',
  }),
};

const SERMONS = [LIVING_WATER, FAITH_OVER_FEAR];

beforeEach(() => {
  resetSermonArchiveCache();
});

afterEach(() => {
  if (mounted) { act(() => mounted!.root.unmount()); mounted.el.remove(); mounted = null; }
  vi.unstubAllGlobals();
  resetSermonArchiveCache();
});

function stubFetch(sermons: ArchivedSermon[]) {
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ sermons }) })));
}

describe('SermonArchive', () => {
  it('renders a loading state, then the list from a stubbed fetch', async () => {
    stubFetch(SERMONS);
    const el = mount(<SermonArchive onOpen={vi.fn()} lang="en" />);
    expect(el.textContent).not.toContain('Living Water');
    await flush();
    const cards = el.querySelectorAll('[data-testid="archive-card"]');
    expect(cards.length).toBe(2);
    expect(el.textContent).toContain('Living Water');
    expect(el.textContent).toContain('Faith Over Fear');
  });

  it('filters the list as the user types in the search box', async () => {
    stubFetch(SERMONS);
    const el = mount(<SermonArchive onOpen={vi.fn()} lang="en" />);
    await flush();
    const input = el.querySelector('[data-testid="archive-search"]') as HTMLInputElement;
    expect(input).toBeTruthy();
    type(input, 'living water');
    await flush();
    const cards = el.querySelectorAll('[data-testid="archive-card"]');
    expect(cards.length).toBe(1);
    expect(el.textContent).toContain('Living Water');
    expect(el.textContent).not.toContain('Faith Over Fear');
  });

  it('filters by a typed scripture reference', async () => {
    stubFetch(SERMONS);
    const el = mount(<SermonArchive onOpen={vi.fn()} lang="en" />);
    await flush();
    const input = el.querySelector('[data-testid="archive-search"]') as HTMLInputElement;
    type(input, 'Romans 8');
    await flush();
    const cards = el.querySelectorAll('[data-testid="archive-card"]');
    expect(cards.length).toBe(1);
    expect(el.textContent).toContain('Faith Over Fear');
  });

  it('calls onOpen with the full sermon when a card is tapped', async () => {
    stubFetch(SERMONS);
    const onOpen = vi.fn();
    const el = mount(<SermonArchive onOpen={onOpen} lang="en" />);
    await flush();
    const card = el.querySelector('[data-testid="archive-card"]') as HTMLButtonElement;
    await act(async () => { card.click(); });
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(onOpen.mock.calls[0][0].id).toBe('a1');
  });

  it('shows an empty state when the archive has nothing published', async () => {
    stubFetch([]);
    const el = mount(<SermonArchive onOpen={vi.fn()} lang="en" />);
    await flush();
    expect(el.querySelectorAll('[data-testid="archive-card"]').length).toBe(0);
  });

  it('is best-effort: a failed fetch renders an empty state, never throws', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('network down'); }));
    const el = mount(<SermonArchive onOpen={vi.fn()} lang="en" />);
    await flush();
    expect(el.querySelectorAll('[data-testid="archive-card"]').length).toBe(0);
  });
});
