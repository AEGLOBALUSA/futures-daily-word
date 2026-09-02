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
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  // fetchStudySources() memoises by query string in a module-level Map, so a
  // fresh import per test (after resetModules) keeps the two tests' stubbed
  // fetch responses from bleeding into each other.
  vi.resetModules();
});

describe('StudySourcesCard', () => {
  it('lists sources sorted by name, with attribution text and the share-alike line', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        sources: [
          {
            id: 'places-1', name: 'Zondervan Bible Places', licence: 'CC BY-SA 4.0',
            attribution: 'Place data courtesy of Zondervan Atlas, used under CC BY-SA 4.0.',
            url: 'https://example.com/places', share_alike: true, language: 'en',
            loaded_at: '2026-01-01', record_count: 1234,
          },
          {
            id: 'commentary-1', name: 'Matthew Henry Commentary', licence: 'Public Domain',
            attribution: "Matthew Henry's Complete Commentary, public domain.",
            url: null, share_alike: false, language: 'en',
            loaded_at: '2026-01-01', record_count: 42,
          },
        ],
      }),
    }));
    const { StudySourcesCard } = await import('./StudySourcesCard');
    const { el, root } = mount(<StudySourcesCard lang="en" />);
    await flush();

    expect(el.textContent).toContain('STUDY SOURCES');
    const names = [...el.querySelectorAll('strong')].map(n => n.textContent);
    expect(names).toEqual(['Matthew Henry Commentary', 'Zondervan Bible Places']); // sorted by name

    expect(el.textContent).toContain("Matthew Henry's Complete Commentary, public domain.");
    expect(el.textContent).toContain('Place data courtesy of Zondervan Atlas, used under CC BY-SA 4.0.');
    expect(el.textContent).toContain('https://example.com/places');
    expect(el.textContent).toContain('Share-alike: anything built from this source stays under the same licence.');

    // The share-alike line appears once, on the source that actually has it.
    const paragraphs = [...el.querySelectorAll('p')];
    const zondervanP = paragraphs.find(p => (p.textContent || '').includes('Zondervan Bible Places'));
    const henryP = paragraphs.find(p => (p.textContent || '').includes('Matthew Henry Commentary'));
    expect(zondervanP?.textContent).toContain('Share-alike');
    expect(henryP?.textContent).not.toContain('Share-alike');

    act(() => root.unmount());
  });

  it('shows the empty-state line when the fetch fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }));
    const { StudySourcesCard } = await import('./StudySourcesCard');
    const { el, root } = mount(<StudySourcesCard lang="en" />);
    await flush();

    expect(el.textContent).toContain('No study sources are loaded yet.');
    expect(el.querySelector('strong')).toBeNull();

    act(() => root.unmount());
  });
});
