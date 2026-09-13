import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act, type ReactElement } from 'react';

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

async function flush() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
}

function clickTab(el: HTMLElement, label: string) {
  const strip = el.querySelector('[data-testid="commentary-tabs"]');
  const btn = strip ? [...strip.querySelectorAll('button')].find(b => b.textContent === label) : undefined;
  if (!btn) throw new Error(`tab not found: ${label}`);
  act(() => { btn.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
}

vi.mock('../../utils/study', async () => {
  const actual = await vi.importActual<typeof import('../../utils/study')>('../../utils/study');
  return {
    ...actual,
    fetchChapterStudy: vi.fn(),
    fetchStudyCommentary: vi.fn(),
  };
});

vi.mock('../../utils/api', () => ({
  fetchAICommentarySourced: vi.fn(),
}));

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe('CommentaryCard', () => {
  it('renders the AI block outside and after the tab strip and sourced provenance line', async () => {
    const study = await import('../../utils/study');
    const api = await import('../../utils/api');
    vi.mocked(study.fetchChapterStudy).mockResolvedValue({
      ref: 'Romans 8',
      commentary: [{ sourceId: 'helloao-matthew-henry', entries: [], count: 3 }],
      crossRefs: [],
    });
    vi.mocked(study.fetchStudyCommentary).mockResolvedValue([{ verseFrom: 1, verseTo: 1, content: 'Sourced commentary text.' }]);
    vi.mocked(api.fetchAICommentarySourced).mockResolvedValue({ text: 'AI generated paragraph.', model: 'claude-x' });

    const { CommentaryCard } = await import('./CommentaryCard');
    const { el, root } = mount(
      <CommentaryCard
        chapterRef="Romans 8"
        lang="en"
        mode="expanded"
        sourced={true}
        onSelectText={() => {}}
        onOpenSources={() => {}}
      />
    );
    await flush();
    await flush();

    const tabStrip = el.querySelector('[data-testid="commentary-tabs"]');
    expect(tabStrip).not.toBeNull();

    const aiBlock = el.querySelector('[data-testid="commentary-ai-block"]');
    expect(aiBlock).not.toBeNull();
    expect(tabStrip!.contains(aiBlock!)).toBe(false);

    // Select the study-layer tab (curated renders first by default).
    const sourceTab = [...tabStrip!.querySelectorAll('button')].find(b => b.textContent === 'Matthew Henry');
    expect(sourceTab).toBeTruthy();
    act(() => { sourceTab!.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    await flush();
    await flush();

    const provenance = el.querySelector('[data-testid="commentary-provenance"]');
    expect(provenance).not.toBeNull();

    // AI block comes after both the tab strip and the sourced provenance line in DOM order.
    const afterTabs = tabStrip!.compareDocumentPosition(aiBlock!);
    expect(afterTabs & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    const afterProvenance = provenance!.compareDocumentPosition(aiBlock!);
    expect(afterProvenance & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    expect(aiBlock!.textContent).toContain('AI generated paragraph.');
    expect(el.textContent).toContain('Sourced commentary text.');

    act(() => root.unmount());
  });

  it('formats the provenance line from the mocked sources map, and name alone when the map lacks the id', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        sources: [
          { id: 'helloao-matthew-henry', name: 'Matthew Henry Commentary', licence: 'Public Domain', attribution: '', url: null, share_alike: false, language: 'en', loaded_at: null, record_count: null, edition: '1706' },
        ],
      }),
    }));
    const study = await import('../../utils/study');
    const api = await import('../../utils/api');
    vi.mocked(study.fetchChapterStudy).mockResolvedValue({
      ref: 'Romans 8',
      commentary: [
        { sourceId: 'helloao-matthew-henry', entries: [], count: 2 },
      ],
      crossRefs: [],
    });
    vi.mocked(study.fetchStudyCommentary).mockResolvedValue([{ verseFrom: 1, verseTo: 1, content: 'Henry text.' }]);
    vi.mocked(api.fetchAICommentarySourced).mockResolvedValue({ text: 'ai text', model: null });

    const { CommentaryCard } = await import('./CommentaryCard');
    const { el, root } = mount(
      <CommentaryCard chapterRef="Romans 8" lang="en" mode="expanded" sourced={true} onSelectText={() => {}} onOpenSources={() => {}} />
    );
    await flush();
    await flush();
    clickTab(el, 'Matthew Henry');
    await flush();
    await flush();

    const provenance = el.querySelector('[data-testid="commentary-provenance"]');
    expect(provenance!.textContent).toContain('Matthew Henry Commentary');
    expect(provenance!.textContent).toContain('Public Domain');

    act(() => root.unmount());
  });

  it('falls back to the source name alone when the sources map has no entry for it', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ sources: [] }) }));
    const study = await import('../../utils/study');
    const api = await import('../../utils/api');
    vi.mocked(study.fetchChapterStudy).mockResolvedValue({
      ref: 'Romans 8',
      commentary: [{ sourceId: 'unknown-test-source', entries: [], count: 1 }],
      crossRefs: [],
    });
    vi.mocked(study.fetchStudyCommentary).mockResolvedValue([{ verseFrom: 1, verseTo: 1, content: 'Unknown text.' }]);
    vi.mocked(api.fetchAICommentarySourced).mockResolvedValue({ text: 'ai text', model: null });

    const { CommentaryCard } = await import('./CommentaryCard');
    const { el, root } = mount(
      <CommentaryCard chapterRef="Romans 8" lang="en" mode="expanded" sourced={true} onSelectText={() => {}} onOpenSources={() => {}} />
    );
    await flush();
    await flush();
    clickTab(el, 'unknown-test-source');
    await flush();
    await flush();

    const provenance = el.querySelector('[data-testid="commentary-provenance"]');
    expect(provenance!.textContent?.trim()).toBe('unknown-test-source');

    act(() => root.unmount());
  });

  it('never labels the curated entry as one of the published commentaries', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ sources: [] }) }));
    const study = await import('../../utils/study');
    const api = await import('../../utils/api');
    vi.mocked(study.fetchChapterStudy).mockResolvedValue({ ref: 'Psalms 23', commentary: [], crossRefs: [] });
    vi.mocked(study.fetchStudyCommentary).mockResolvedValue([]);
    vi.mocked(api.fetchAICommentarySourced).mockResolvedValue({ text: 'ai text', model: null });

    const { CommentaryCard } = await import('./CommentaryCard');
    // "Psalms 23" exists in src/data/commentary.ts under both "Matthew Henry" and "Thayer's".
    const { el, root } = mount(
      <CommentaryCard chapterRef="Psalms 23" lang="en" mode="expanded" sourced={true} onSelectText={() => {}} onOpenSources={() => {}} />
    );
    await flush();
    await flush();

    const tabStrip = el.querySelector('[data-testid="commentary-tabs"]');
    expect(tabStrip).not.toBeNull();
    expect(tabStrip!.textContent).not.toContain('Matthew Henry');
    expect(tabStrip!.textContent).not.toContain("Thayer's");
    expect(tabStrip!.textContent).toContain('Daily Word editors');

    act(() => root.unmount());
  });

  it('never fetches the AI paragraph while collapsed', async () => {
    const study = await import('../../utils/study');
    const api = await import('../../utils/api');
    vi.mocked(study.fetchChapterStudy).mockResolvedValue({ ref: 'Romans 8', commentary: [], crossRefs: [] });
    vi.mocked(study.fetchStudyCommentary).mockResolvedValue([]);
    vi.mocked(api.fetchAICommentarySourced).mockResolvedValue({ text: 'ai text', model: null });

    const { CommentaryCard } = await import('./CommentaryCard');
    const { el, root } = mount(
      <CommentaryCard chapterRef="Romans 8" lang="en" mode="collapsed" sourced={true} onSelectText={() => {}} onOpenSources={() => {}} />
    );
    await flush();

    expect(api.fetchAICommentarySourced).not.toHaveBeenCalled();
    expect(el.querySelector('[data-testid="commentary-ai-block"]')).toBeNull();

    act(() => root.unmount());
  });

  it('pages: switching chapterRef clears the previous chapter commentary and fetches fresh for the new chapter', async () => {
    const study = await import('../../utils/study');
    const api = await import('../../utils/api');
    vi.mocked(study.fetchChapterStudy).mockImplementation(async (ref: string) => ({
      ref,
      commentary: [{ sourceId: 'helloao-gill', entries: [], count: 1 }],
      crossRefs: [],
    }));
    vi.mocked(study.fetchStudyCommentary).mockImplementation(async (ref: string) => [
      { verseFrom: 1, verseTo: 1, content: ref === 'Romans 8' ? 'Romans 8 Gill text.' : 'Romans 9 Gill text.' },
    ]);
    vi.mocked(api.fetchAICommentarySourced).mockResolvedValue({ text: 'ai text', model: null });

    const { CommentaryCard } = await import('./CommentaryCard');
    const { el, root } = mount(
      <CommentaryCard chapterRef="Romans 8" lang="en" mode="expanded" sourced={true} onSelectText={() => {}} onOpenSources={() => {}} />
    );
    await flush();
    await flush();
    clickTab(el, 'John Gill');
    await flush();
    await flush();
    expect(el.textContent).toContain('Romans 8 Gill text.');

    act(() => {
      root.render(
        <CommentaryCard chapterRef="Romans 9" lang="en" mode="expanded" sourced={true} onSelectText={() => {}} onOpenSources={() => {}} />
      );
    });
    await flush();
    await flush();

    expect(el.textContent).not.toContain('Romans 8 Gill text.');

    clickTab(el, 'John Gill');
    await flush();
    await flush();

    expect(el.textContent).toContain('Romans 9 Gill text.');
    expect(study.fetchStudyCommentary).toHaveBeenCalledWith('Romans 9', 'helloao-gill');

    act(() => root.unmount());
  });

  it('renders nothing and fetches nothing for an empty chapterRef', async () => {
    const study = await import('../../utils/study');
    const api = await import('../../utils/api');
    const { CommentaryCard } = await import('./CommentaryCard');
    const { el, root } = mount(
      <CommentaryCard chapterRef="" lang="en" mode="expanded" sourced={true} onSelectText={() => {}} onOpenSources={() => {}} />
    );
    await flush();

    expect(el.textContent).toBe('');
    expect(study.fetchChapterStudy).not.toHaveBeenCalled();
    expect(api.fetchAICommentarySourced).not.toHaveBeenCalled();

    act(() => root.unmount());
  });

  it('congregation shape (sourced=false, collapsed): expanding never fetches the AI paragraph', async () => {
    const study = await import('../../utils/study');
    const api = await import('../../utils/api');
    vi.mocked(study.fetchChapterStudy).mockResolvedValue({ ref: 'Romans 8', commentary: [], crossRefs: [] });
    vi.mocked(study.fetchStudyCommentary).mockResolvedValue([]);
    vi.mocked(api.fetchAICommentarySourced).mockResolvedValue({ text: 'ai text', model: null });

    const { CommentaryCard } = await import('./CommentaryCard');
    const { el, root } = mount(
      <CommentaryCard chapterRef="Romans 8" lang="en" mode="collapsed" sourced={false} onSelectText={() => {}} onOpenSources={() => {}} />
    );
    await flush();

    const header = el.querySelector('h2')!.parentElement as HTMLElement;
    act(() => { header.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    await flush();
    await flush();

    expect(api.fetchAICommentarySourced).not.toHaveBeenCalled();

    act(() => root.unmount());
  });

  it('renders the fetch-failed line for a null result and the empty line for an empty array', async () => {
    const study = await import('../../utils/study');
    const api = await import('../../utils/api');
    vi.mocked(study.fetchChapterStudy).mockResolvedValue({
      ref: 'Romans 8',
      commentary: [
        { sourceId: 'helloao-gill', entries: [], count: 1 },
        { sourceId: 'helloao-clarke', entries: [], count: 1 },
      ],
      crossRefs: [],
    });
    vi.mocked(study.fetchStudyCommentary).mockImplementation(async (_ref: string, sourceId: string) => {
      return sourceId === 'helloao-gill' ? null : [];
    });
    vi.mocked(api.fetchAICommentarySourced).mockResolvedValue({ text: 'ai text', model: null });

    const { CommentaryCard } = await import('./CommentaryCard');
    const { el, root } = mount(
      <CommentaryCard chapterRef="Romans 8" lang="en" mode="expanded" sourced={true} onSelectText={() => {}} onOpenSources={() => {}} />
    );
    await flush();
    await flush();
    await flush();

    // Romans 8 has a curated entry, so the curated tab loads first — select Gill explicitly.
    clickTab(el, 'John Gill');
    await flush();
    await flush();
    expect(el.textContent).toContain('Could not load this commentary right now.');

    clickTab(el, 'Adam Clarke');
    await flush();
    await flush();

    expect(el.textContent).toContain('No commentary for this chapter yet.');

    act(() => root.unmount());
  });

  it('renders two commentary entries with verse ranges as separate labelled blocks, not one joined paragraph', async () => {
    const study = await import('../../utils/study');
    const api = await import('../../utils/api');
    vi.mocked(study.fetchChapterStudy).mockResolvedValue({
      ref: 'Romans 8',
      commentary: [{ sourceId: 'helloao-gill', entries: [], count: 2 }],
      crossRefs: [],
    });
    vi.mocked(study.fetchStudyCommentary).mockResolvedValue([
      { verseFrom: 1, verseTo: 3, content: 'First block text.' },
      { verseFrom: 4, verseTo: 6, content: 'Second block text.' },
    ]);
    vi.mocked(api.fetchAICommentarySourced).mockResolvedValue({ text: 'ai text', model: null });

    const { CommentaryCard } = await import('./CommentaryCard');
    const { el, root } = mount(
      <CommentaryCard chapterRef="Romans 8" lang="en" mode="expanded" sourced={true} onSelectText={() => {}} onOpenSources={() => {}} />
    );
    await flush();
    await flush();
    clickTab(el, 'John Gill');
    await flush();
    await flush();

    expect(el.textContent).toContain('Verses 1-3');
    expect(el.textContent).toContain('Verses 4-6');

    const firstP = [...el.querySelectorAll('p')].find(p => p.textContent === 'First block text.');
    const secondP = [...el.querySelectorAll('p')].find(p => p.textContent === 'Second block text.');
    expect(firstP).toBeTruthy();
    expect(secondP).toBeTruthy();
    expect(firstP).not.toBe(secondP);

    act(() => root.unmount());
  });

  it('when the AI fetch fails with sourced tabs present, renders the ai-failed line and never an empty AI wrapper', async () => {
    const study = await import('../../utils/study');
    const api = await import('../../utils/api');
    vi.mocked(study.fetchChapterStudy).mockResolvedValue({
      ref: 'Romans 8',
      commentary: [{ sourceId: 'helloao-gill', entries: [], count: 1 }],
      crossRefs: [],
    });
    vi.mocked(study.fetchStudyCommentary).mockResolvedValue([{ verseFrom: 1, verseTo: 1, content: 'Gill text.' }]);
    vi.mocked(api.fetchAICommentarySourced).mockRejectedValue(new Error('boom'));

    const { CommentaryCard } = await import('./CommentaryCard');
    const { el, root } = mount(
      <CommentaryCard chapterRef="Romans 8" lang="en" mode="expanded" sourced={true} onSelectText={() => {}} onOpenSources={() => {}} />
    );
    await flush();
    await flush();

    const aiBlock = el.querySelector('[data-testid="commentary-ai-block"]');
    expect(aiBlock).not.toBeNull();
    expect(aiBlock!.textContent).toContain('The AI insight is not available right now.');
    expect(aiBlock!.textContent?.trim()).not.toBe('');

    act(() => root.unmount());
  });
});
