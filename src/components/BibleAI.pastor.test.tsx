/**
 * Pastor quick-prompts in Bible AI ("For your message") — persona-gated, so
 * nothing changes for the congregation; the outline prompt carries the
 * sermon-prep bag to the model.
 */
import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import { ScriptureSelectionProvider } from '../contexts/ScriptureSelectionContext';
import { BibleAI } from './BibleAI';

beforeAll(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  // happy-dom has no scrollIntoView; BibleAI calls it after every message.
  (Element.prototype as unknown as { scrollIntoView: () => void }).scrollIntoView = () => {};
});

let mounted: { el: HTMLDivElement; root: Root } | null = null;

function mount(persona: string, currentPassage = 'Romans 8') {
  localStorage.setItem('dw_setup', JSON.stringify({ persona, source: 'settings' }));
  const el = document.createElement('div');
  document.body.appendChild(el);
  const root = createRoot(el);
  act(() => {
    root.render(
      <ScriptureSelectionProvider>
        <BibleAI isOpen onClose={() => {}} currentPassage={currentPassage} />
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
  });
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(async () => ({ json: async () => ({ content: [{ text: 'ok' }] }) })));
});

afterEach(() => {
  if (mounted) { act(() => mounted!.root.unmount()); mounted.el.remove(); mounted = null; }
  vi.unstubAllGlobals();
});

describe('BibleAI pastor quick-prompts', () => {
  it('shows the four "For your message" prompts for pastor_leader only', () => {
    const el = mount('pastor_leader');
    const block = el.querySelector('[data-testid="pastor-prompts"]') as HTMLElement;
    expect(block).toBeTruthy();
    expect(block.textContent).toContain('For your message');
    const labels = [...block.querySelectorAll('button')].map(b => b.textContent);
    expect(labels).toEqual([
      'Give me three teaching angles on this passage',
      'Find an illustration for this idea',
      'Break down the key Greek or Hebrew words in this passage', // nothing selected → chapter form
      'Turn my highlights into an outline',
    ]);
    // The generic quick prompts are still there underneath.
    expect(el.textContent).toContain('What does this passage mean?');
  });

  it('renders nothing extra for a church member', () => {
    const el = mount('congregation');
    expect(el.querySelector('[data-testid="pastor-prompts"]')).toBeNull();
    expect(el.textContent).not.toContain('For your message');
    expect(el.textContent).toContain('What does this passage mean?');
  });

  it('the outline prompt sends the sermon-prep bag, anchored on the pastor prompt', async () => {
    localStorage.setItem('dw_sermon_prep', JSON.stringify([
      { id: 'p1', ref: 'Romans 8:1', text: 'There is therefore now no condemnation', ts: 2 },
      { id: 'p2', ref: 'Romans 8:28', text: 'all things work together for good', ts: 1 },
    ]));
    localStorage.setItem('dw_sermon_prep_focus', 'Romans: Life in the Spirit');
    const el = mount('pastor_leader');
    const outline = [...el.querySelectorAll('button')].find(b => /Turn my highlights into an outline/.test(b.textContent || ''))!;
    await act(async () => { outline.click(); });
    await flush();
    const fetchMock = vi.mocked(fetch);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const body = JSON.parse(String((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body));
    expect(body.messages[0].role).toBe('user');
    expect(body.messages[0].content).toBe(
      'Turn my highlights into an outline (Romans: Life in the Spirit) Big idea, three points, one weekly action.\n\n'
      + '- Romans 8:1: "There is therefore now no condemnation"\n'
      + '- Romans 8:28: "all things work together for good"',
    );
    expect(body.system).toContain('pastor or church leader');
  });

  it('the teaching-angles prompt names the chapter in front of the pastor', async () => {
    const el = mount('pastor_leader', 'Ezekiel 34');
    const angles = [...el.querySelectorAll('button')].find(b => /three teaching angles/.test(b.textContent || ''))!;
    await act(async () => { angles.click(); });
    await flush();
    const body = JSON.parse(String((vi.mocked(fetch).mock.calls[0] as unknown as [string, RequestInit])[1].body));
    expect(body.messages[0].content).toBe('Give me three teaching angles on this passage (Ezekiel 34)');
  });
});
