import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act, type ReactElement } from 'react';

vi.mock('../../utils/study', () => ({
  fetchChapterStudy: vi.fn(),
  fetchStudySources: vi.fn(),
}));
vi.mock('../../utils/api', () => ({
  fetchPassage: vi.fn(),
}));

import { fetchChapterStudy, fetchStudySources } from '../../utils/study';
import { fetchPassage } from '../../utils/api';
import { ScriptureSelectionProvider } from '../../contexts/ScriptureSelectionContext';
import { CrossRefsCard } from './CrossRefsCard';

beforeAll(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});
beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

function mount(ui: ReactElement): { el: HTMLDivElement; root: Root } {
  const el = document.createElement('div');
  document.body.appendChild(el);
  const root = createRoot(el);
  act(() => { root.render(ui); });
  return { el, root };
}

// The card session-caches its chapter-level fetch by chapterRef, so each test
// uses its own chapterRef — otherwise a later test would silently read an
// earlier test's cached result instead of exercising its own mock.
let chapterCounter = 0;
function mountCard(onSelectText = vi.fn()) {
  const chapterRef = `John ${++chapterCounter}`;
  const { el, root } = mount(
    <ScriptureSelectionProvider>
      <CrossRefsCard chapterRef={chapterRef} translation="ESV" lang="en" onSelectText={onSelectText} />
    </ScriptureSelectionProvider>
  );
  return { el, root, onSelectText, chapterRef };
}

async function expandCard(el: HTMLDivElement) {
  await act(async () => {
    (el.querySelector('h2') as HTMLElement).parentElement!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await Promise.resolve();
  });
}

describe('CrossRefsCard', () => {
  it('renders the provenance line from the mocked source metadata', async () => {
    (fetchStudySources as ReturnType<typeof vi.fn>).mockResolvedValue({
      sources: [{
        id: 'openbible-crossrefs', name: 'OpenBible.info Cross References', licence: 'CC BY 4.0',
        attribution: 'OpenBible.info', url: null, share_alike: false, language: 'en',
        loaded_at: null, record_count: 1000, edition: null,
      }],
    });
    (fetchChapterStudy as ReturnType<typeof vi.fn>).mockResolvedValue({
      ref: 'John 3', commentary: [],
      crossRefs: [{ verse: 16, refs: [{ ref: 'Romans 5:8', votes: 10 }] }],
    });

    const { el, root } = mountCard();
    await expandCard(el);
    await act(async () => { await Promise.resolve(); });

    const prov = el.querySelector('[data-testid="crossrefs-provenance"]');
    expect(prov).toBeTruthy();
    expect(prov!.textContent).toContain('OpenBible.info Cross References');
    expect(prov!.textContent).toContain('CC BY 4.0');

    act(() => root.unmount());
  });

  it('a chip tap calls fetchPassage with the tapped ref and mounts the passage text', async () => {
    (fetchStudySources as ReturnType<typeof vi.fn>).mockResolvedValue({ sources: [] });
    (fetchChapterStudy as ReturnType<typeof vi.fn>).mockResolvedValue({
      ref: 'John 3', commentary: [],
      crossRefs: [{ verse: 16, refs: [{ ref: 'Romans 5:8', votes: 10 }] }],
    });
    (fetchPassage as ReturnType<typeof vi.fn>).mockResolvedValue('For God so loved the world.');

    const { el, root } = mountCard();
    await expandCard(el);
    await act(async () => { await Promise.resolve(); });

    const chip = [...el.querySelectorAll('[data-testid="crossrefs-chip"]')].find(b => b.textContent === 'Romans 5:8') as HTMLButtonElement;
    expect(chip).toBeTruthy();
    await act(async () => {
      chip.click();
      await Promise.resolve();
    });

    expect(fetchPassage).toHaveBeenCalledWith('Romans 5:8', 'ESV');
    expect(el.textContent).toContain('For God so loved the world.');

    act(() => root.unmount());
  });

  it('renders the empty copy and no chip when crossRefs is empty', async () => {
    (fetchStudySources as ReturnType<typeof vi.fn>).mockResolvedValue({ sources: [] });
    (fetchChapterStudy as ReturnType<typeof vi.fn>).mockResolvedValue({
      ref: 'John 3', commentary: [], crossRefs: [],
    });

    const { el, root } = mountCard();
    await expandCard(el);
    await act(async () => { await Promise.resolve(); });

    expect(el.querySelector('[data-testid="crossrefs-empty"]')).toBeTruthy();
    expect(el.textContent).toContain('No cross-references yet for this passage.');
    expect(el.querySelectorAll('[data-testid="crossrefs-chip"]').length).toBe(0);

    act(() => root.unmount());
  });

  it('a target linked from two verses opens only under the tapped verse', async () => {
    (fetchStudySources as ReturnType<typeof vi.fn>).mockResolvedValue({ sources: [] });
    (fetchChapterStudy as ReturnType<typeof vi.fn>).mockResolvedValue({
      ref: 'John 3', commentary: [],
      crossRefs: [
        { verse: 3, refs: [{ ref: 'Romans 5:8', votes: 10 }] },
        { verse: 16, refs: [{ ref: 'Romans 5:8', votes: 10 }] },
      ],
    });
    (fetchPassage as ReturnType<typeof vi.fn>).mockResolvedValue('For God so loved the world.');

    const { el, root } = mountCard();
    await expandCard(el);
    await act(async () => { await Promise.resolve(); });

    const chips = [...el.querySelectorAll('[data-testid="crossrefs-chip"]')].filter(b => b.textContent === 'Romans 5:8') as HTMLButtonElement[];
    expect(chips.length).toBe(2);

    // Tap the chip under verse 16 (the second group).
    await act(async () => {
      chips[1].click();
      await Promise.resolve();
    });

    const groups = [...el.querySelectorAll('[data-testid="crossrefs-verse-group"]')];
    expect(groups.length).toBe(2);
    const verse3Group = groups.find(g => g.getAttribute('data-verse') === '3')!;
    const verse16Group = groups.find(g => g.getAttribute('data-verse') === '16')!;

    expect(verse3Group.textContent).not.toContain('For God so loved the world.');
    expect(verse16Group.textContent).toContain('For God so loved the world.');

    act(() => root.unmount());
  });

  it('tapping a chip does not call onSelectText', async () => {
    (fetchStudySources as ReturnType<typeof vi.fn>).mockResolvedValue({ sources: [] });
    (fetchChapterStudy as ReturnType<typeof vi.fn>).mockResolvedValue({
      ref: 'John 3', commentary: [],
      crossRefs: [{ verse: 16, refs: [{ ref: 'Romans 5:8', votes: 10 }] }],
    });
    (fetchPassage as ReturnType<typeof vi.fn>).mockResolvedValue('For God so loved the world.');

    const { el, root, onSelectText } = mountCard();
    await expandCard(el);
    await act(async () => { await Promise.resolve(); });

    const chip = [...el.querySelectorAll('[data-testid="crossrefs-chip"]')].find(b => b.textContent === 'Romans 5:8') as HTMLButtonElement;
    await act(async () => {
      chip.click();
      await Promise.resolve();
    });

    expect(el.textContent).toContain('For God so loved the world.');
    expect(onSelectText).not.toHaveBeenCalled();

    act(() => root.unmount());
  });

  it('does not fetch before the card is expanded', async () => {
    (fetchStudySources as ReturnType<typeof vi.fn>).mockResolvedValue({ sources: [] });
    (fetchChapterStudy as ReturnType<typeof vi.fn>).mockResolvedValue({
      ref: 'John 3', commentary: [],
      crossRefs: [{ verse: 16, refs: [{ ref: 'Romans 5:8', votes: 10 }] }],
    });

    const { el, root } = mountCard();
    await act(async () => { await Promise.resolve(); });

    expect(fetchChapterStudy).not.toHaveBeenCalled();

    await expandCard(el);
    await act(async () => { await Promise.resolve(); });

    expect(fetchChapterStudy).toHaveBeenCalledTimes(1);

    act(() => root.unmount());
  });

  it('a second open of the same chip does not refetch the passage', async () => {
    (fetchStudySources as ReturnType<typeof vi.fn>).mockResolvedValue({ sources: [] });
    (fetchChapterStudy as ReturnType<typeof vi.fn>).mockResolvedValue({
      ref: 'John 3', commentary: [],
      crossRefs: [{ verse: 16, refs: [{ ref: 'Romans 5:8', votes: 10 }] }],
    });
    (fetchPassage as ReturnType<typeof vi.fn>).mockResolvedValue('For God so loved the world.');

    const { el, root } = mountCard();
    await expandCard(el);
    await act(async () => { await Promise.resolve(); });

    const chip = [...el.querySelectorAll('[data-testid="crossrefs-chip"]')].find(b => b.textContent === 'Romans 5:8') as HTMLButtonElement;

    await act(async () => { chip.click(); await Promise.resolve(); });
    expect(fetchPassage).toHaveBeenCalledTimes(1);

    // Close it.
    await act(async () => { chip.click(); await Promise.resolve(); });
    // Re-open the same chip.
    await act(async () => { chip.click(); await Promise.resolve(); });

    expect(fetchPassage).toHaveBeenCalledTimes(1);

    act(() => root.unmount());
  });
});
