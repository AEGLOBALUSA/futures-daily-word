/**
 * PrepSheet — study layer wired to the two-translation reader, cross-refs,
 * commentary + AI summary, key words, places/people and illustrations.
 * Assertions are on data-testid/structure, not translated text: the
 * `preach_prep_*` i18n keys aren't registered yet (the orchestrator adds
 * them), so t() returns the raw key at test time.
 */
import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import { ScriptureSelectionProvider } from '../../contexts/ScriptureSelectionContext';
import { PrepSheet } from './PrepSheet';
import type { StudyPassage } from '../../utils/study';

beforeAll(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});

const ESV_MARKER = 'ESV FIXTURE TEXT the mind governed by the flesh is death';
const BOLLS_MARKER = '[1] BOLLS FIXTURE TEXT for the law of the Spirit of life';
const AI_SUMMARY = 'The commentators agree Paul is contrasting condemnation under law with life in the Spirit.';

const FIXTURE: StudyPassage = {
  ref: 'Romans 8:1-4', book: 'Romans', chapter: 8, verse: 1, verseEnd: 4, testament: 'NT',
  crossRefs: [
    {
      verse: 1,
      refs: [
        { ref: 'John 3:18', votes: 10 },
        { ref: 'Romans 5:1', votes: 8 },
        { ref: 'Galatians 5:1', votes: 6 },
        { ref: '1 John 1:9', votes: 5 },
        { ref: 'Hebrews 10:22', votes: 4 },
        { ref: 'Psalm 32:1', votes: 3 },
        { ref: 'Colossians 1:22', votes: 2 },
      ],
    },
  ],
  commentary: [
    {
      sourceId: 'helloao-matthew-henry',
      entries: [{ verseFrom: 1, verseTo: 4, content: 'Matthew Henry commentary text on Romans 8, condemnation and the Spirit.' }],
    },
    {
      sourceId: 'helloao-gill',
      entries: [{ verseFrom: 1, verseTo: 2, content: 'Gill commentary text on the law of sin and death.' }],
    },
  ],
  words: [
    { verse: 1, position: 1, word: 'condemnation', lemma: 'katakrima', strongs: 'G2631', morph: null, gloss: 'condemnation', translit: 'katakrima' },
    { verse: 1, position: 2, word: 'condemnation', lemma: 'katakrima', strongs: 'G2631', morph: null, gloss: 'condemnation', translit: 'katakrima' },
    { verse: 2, position: 1, word: 'law', lemma: 'nomos', strongs: 'G3551', morph: null, gloss: 'law', translit: 'nomos' },
  ],
  lexicon: {},
  places: [{ id: 'p1', name: 'Rome', lat: null, lon: null, description: null, refs: [], source_id: 'x' }],
  people: [{ id: 'pe1', name: 'Paul', description: null, refs: [], source_id: 'x' }],
  topics: [],
  illustrations: [
    {
      id: 'i1', topic: 'Freedom from guilt', source_id: 'x', refs: [],
      title: null,
      body: 'A long illustration body text that goes on describing freedom from condemnation in vivid, concrete detail so a preacher has something to reach for on a Sunday morning, well past two hundred characters so the excerpt logic actually has to trim it down.',
    },
  ],
};

type FetchCall = { url: string; init?: RequestInit };

function makeFetch(opts: { studyOk: boolean; study?: StudyPassage | null }) {
  const calls: FetchCall[] = [];
  const fn = vi.fn(async (url: string, init?: RequestInit) => {
    calls.push({ url: String(url), init });
    const u = String(url);
    if (u.includes('/api/study')) {
      if (!opts.studyOk) return { ok: false, status: 404, json: async () => ({}) } as Response;
      return { ok: true, json: async () => opts.study } as Response;
    }
    if (u.includes('.netlify/functions/claude')) {
      return { ok: true, json: async () => ({ content: [{ text: AI_SUMMARY }] }) } as Response;
    }
    if (u.includes('/api/esv')) {
      return { ok: true, json: async () => ({ passages: [ESV_MARKER] }) } as Response;
    }
    if (u.includes('/api/bolls')) {
      return { ok: true, json: async () => ({ passages: [BOLLS_MARKER] }) } as Response;
    }
    // Bundled offline KJV file lookup — not stubbed; let it fail through.
    return { ok: false, status: 404, json: async () => ({}) } as Response;
  });
  return { fn, calls };
}

let mounted: { el: HTMLDivElement; root: Root } | null = null;

function mount(props: Parameters<typeof PrepSheet>[0]) {
  const el = document.createElement('div');
  document.body.appendChild(el);
  const root = createRoot(el);
  act(() => {
    root.render(
      <ScriptureSelectionProvider>
        <PrepSheet {...props} />
      </ScriptureSelectionProvider>,
    );
  });
  mounted = { el, root };
  return el;
}

async function flush() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
}

afterEach(() => {
  if (mounted) { act(() => mounted!.root.unmount()); mounted.el.remove(); mounted = null; }
  vi.unstubAllGlobals();
});

describe('PrepSheet', () => {
  it('renders the study blocks and reflects the current passage as the heading', async () => {
    const { fn } = makeFetch({ studyOk: true, study: FIXTURE });
    vi.stubGlobal('fetch', fn);
    const el = mount({ passage: 'Romans 8:1-4', onPassageChange: vi.fn(), onAddToOutline: vi.fn(), lang: 'en' });
    await flush();

    expect(el.querySelector('[data-testid="prep-heading"]')?.textContent).toBe('Romans 8:1-4');
    expect(el.querySelector('[data-testid="prep-text"]')).toBeTruthy();
    expect(el.querySelector('[data-testid="prep-crossrefs"]')).toBeTruthy();
    expect(el.querySelector('[data-testid="prep-commentary"]')).toBeTruthy();
    expect(el.querySelector('[data-testid="prep-words"]')).toBeTruthy();
    expect(el.querySelector('[data-testid="prep-places"]')).toBeTruthy();
    expect(el.querySelector('[data-testid="prep-illustrations"]')).toBeTruthy();

    // Two-translation text: ESV (default dw_translation) + KJV, both rendered.
    expect(el.querySelector('[data-testid="prep-text-ESV"]')?.textContent).toContain('ESV FIXTURE TEXT');

    // Cross-references: top 6 of 7 chips shown, plus a "more" control.
    const chips = [...el.querySelectorAll('[data-testid="prep-crossref-chip"]')];
    expect(chips.length).toBe(6);
    expect(el.querySelector('[data-testid="prep-crossref-more"]')).toBeTruthy();

    // Commentary sources in the fixed teaching order.
    const commentaryToggles = [...el.querySelectorAll('[data-testid="prep-commentary-toggle"]')].map(b => b.textContent);
    expect(commentaryToggles[0]).toContain('Matthew Henry');
    expect(commentaryToggles[1]).toContain('John Gill');

    // Key words, grouped by Strong's, most frequent first.
    const wordChips = [...el.querySelectorAll('[data-testid="prep-word-chip"]')];
    expect(wordChips.length).toBe(2);
    expect(wordChips[0].textContent).toContain('condemnation');

    // Places / people / illustrations chips and cards.
    expect(el.querySelector('[data-testid="prep-places-chips"]')?.textContent).toContain('Rome');
    expect(el.querySelector('[data-testid="prep-people-chips"]')?.textContent).toContain('Paul');
    expect(el.querySelector('[data-testid="prep-illustrations"]')?.textContent).toContain('Freedom from guilt');
  });

  it('tapping a cross-reference chip calls onPassageChange with that ref', async () => {
    const { fn } = makeFetch({ studyOk: true, study: FIXTURE });
    vi.stubGlobal('fetch', fn);
    const onPassageChange = vi.fn();
    const el = mount({ passage: 'Romans 8:1-4', onPassageChange, onAddToOutline: vi.fn(), lang: 'en' });
    await flush();

    const chip = [...el.querySelectorAll('[data-testid="prep-crossref-chip"]')].find(b => b.textContent === 'John 3:18');
    expect(chip).toBeTruthy();
    act(() => { (chip as HTMLElement).click(); });
    expect(onPassageChange).toHaveBeenCalledWith('John 3:18');
  });

  it('the Go button submits the typed passage', async () => {
    const { fn } = makeFetch({ studyOk: true, study: FIXTURE });
    vi.stubGlobal('fetch', fn);
    const onPassageChange = vi.fn();
    const el = mount({ passage: 'Romans 8:1-4', onPassageChange, onAddToOutline: vi.fn(), lang: 'en' });
    await flush();

    const input = el.querySelector('[data-testid="prep-passage-input"]') as HTMLInputElement;
    act(() => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
      setter.call(input, 'Romans 8:5');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    const go = el.querySelector('[data-testid="prep-go-btn"]') as HTMLElement;
    act(() => { go.click(); });
    expect(onPassageChange).toHaveBeenCalledWith('Romans 8:5');
  });

  it('Summarise sends only public-domain commentary text to the AI endpoint, never the reader\'s translation', async () => {
    const { fn, calls } = makeFetch({ studyOk: true, study: FIXTURE });
    vi.stubGlobal('fetch', fn);
    const el = mount({ passage: 'Romans 8:1-4', onPassageChange: vi.fn(), onAddToOutline: vi.fn(), lang: 'en' });
    await flush();
    // Confirm the ESV fixture actually loaded before proving it's excluded.
    expect(el.querySelector('[data-testid="prep-text-ESV"]')?.textContent).toContain('ESV FIXTURE TEXT');

    const summariseBtn = el.querySelector('[data-testid="prep-summarise-btn"]') as HTMLElement;
    expect(summariseBtn).toBeTruthy();
    await act(async () => { summariseBtn.click(); await Promise.resolve(); await Promise.resolve(); });
    await flush();

    const claudeCall = calls.find(c => c.url.includes('.netlify/functions/claude'));
    expect(claudeCall).toBeTruthy();
    const body = String(claudeCall!.init?.body || '');
    expect(body).not.toContain(ESV_MARKER);
    expect(body).not.toContain(BOLLS_MARKER);
    expect(body).toContain('Matthew Henry commentary text');
    expect(body).toContain('Gill commentary text');

    expect(el.querySelector('[data-testid="prep-summary-text"]')?.textContent).toBe(AI_SUMMARY);
  });

  it('adding a commentary entry to the outline calls onAddToOutline', async () => {
    const { fn } = makeFetch({ studyOk: true, study: FIXTURE });
    vi.stubGlobal('fetch', fn);
    const onAddToOutline = vi.fn();
    const el = mount({ passage: 'Romans 8:1-4', onPassageChange: vi.fn(), onAddToOutline, lang: 'en' });
    await flush();

    const toggle = el.querySelector('[data-testid="prep-commentary-toggle"]') as HTMLElement;
    act(() => { toggle.click(); });
    const addBtn = el.querySelector('[data-testid="prep-commentary-add"]') as HTMLElement;
    expect(addBtn).toBeTruthy();
    act(() => { addBtn.click(); });
    expect(onAddToOutline).toHaveBeenCalledWith(expect.objectContaining({
      ref: 'Romans 8:1-4',
      text: expect.stringContaining('Matthew Henry commentary text'),
    }));
  });

  it('a null study response renders the muted empty lines without throwing', async () => {
    const { fn } = makeFetch({ studyOk: false });
    vi.stubGlobal('fetch', fn);
    const el = mount({ passage: 'John 3:16', onPassageChange: vi.fn(), onAddToOutline: vi.fn(), lang: 'en' });
    await flush();

    expect(el.querySelector('[data-testid="prep-crossrefs-empty"]')).toBeTruthy();
    expect(el.querySelector('[data-testid="prep-commentary-empty"]')).toBeTruthy();
    expect(el.querySelector('[data-testid="prep-words-empty"]')).toBeTruthy();
    expect(el.querySelector('[data-testid="prep-places-empty"]')).toBeTruthy();
    expect(el.querySelector('[data-testid="prep-people-empty"]')).toBeTruthy();
    expect(el.querySelector('[data-testid="prep-illustrations-empty"]')).toBeTruthy();
    // Summarise has nothing to work with — disabled, not hidden.
    const summariseBtn = el.querySelector('[data-testid="prep-summarise-btn"]') as HTMLButtonElement;
    expect(summariseBtn.disabled).toBe(true);
  });
});
