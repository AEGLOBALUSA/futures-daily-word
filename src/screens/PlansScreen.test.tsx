import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import { PlansScreen } from './PlansScreen';
import { PLAN_CATALOGUE } from '../data/plans';

vi.mock('../contexts/UserContext', () => ({ useUser: () => ({ userProfile: null, setup: { persona: 'congregation' }, saveSetup: vi.fn() }) }));
vi.mock('../utils/audioPlayer', () => ({ onStateChange: () => () => {}, stop: vi.fn() }));
vi.mock('../utils/cloudSync', () => ({ schedulePush: vi.fn(), flushNow: vi.fn() }));
vi.mock('../utils/analytics', () => ({ track: vi.fn() }));
vi.mock('../utils/behavior', () => ({ trackBehavior: vi.fn() }));

let root: Root;
let host: HTMLDivElement;
const flush = () => act(async () => { await Promise.resolve(); await Promise.resolve(); });
const buttons = () => [...host.querySelectorAll('button')];
const button = (name: string | RegExp) => buttons().find(b => typeof name === 'string' ? b.textContent?.trim() === name : name.test(b.textContent || ''))!;
async function click(target: HTMLElement) { await act(async () => { target.click(); }); await flush(); }
function mount(onNavigate = vi.fn()) { act(() => root.render(<PlansScreen onNavigate={onNavigate} />)); }

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  localStorage.setItem('dw_setup', JSON.stringify({ persona: 'congregation' }));
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host);
});
afterEach(() => { act(() => root.unmount()); host.remove(); vi.unstubAllGlobals(); });

describe('Plans next reading', () => {
  it('opens on the active reading, with one Continue and the chooser one tap away', async () => {
    const plan = PLAN_CATALOGUE.find(p => !p.bookId)!;
    localStorage.setItem('dw_activeplans', JSON.stringify({ [plan.id]: { startedAt: new Date().toISOString(), completedDays: [], lastDay: 0 } }));
    const onNavigate = vi.fn();
    mount(onNavigate);
    expect(host.textContent).toContain(plan.passages[0]);
    expect(host.querySelector('.dw-path-embedded')).toBeNull();
    expect(host.querySelectorAll('.dw-next-main')).toHaveLength(1);
    await click(button('Continue'));
    expect(onNavigate).toHaveBeenCalledWith('home');
    await click(button('Change path'));
    expect(host.querySelector('.dw-path-embedded')).not.toBeNull();
  });

  it('selects an inactive plan without starting it, then confirms through one bottom action', async () => {
    mount();
    await click(button('Change path'));
    const choice = button('Select plan');
    await click(choice);
    expect(choice.getAttribute('aria-pressed')).toBe('true');
    expect(localStorage.getItem('dw_activeplans')).toBeNull();
    expect(host.querySelectorAll('.dw-next-main')).toHaveLength(1);
    await click(button(/^Start this plan/i));
    expect(Object.keys(JSON.parse(localStorage.getItem('dw_activeplans') || '{}'))).toHaveLength(1);
  });

  it('shows a failed book load and retries successfully without reopening the reader', async () => {
    const fetcher = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue({
      ok: true, json: async () => ({ title: 'Book preview', chapters: [{ title: 'First chapter', paragraphs: ['Reading text'] }] }),
    });
    vi.stubGlobal('fetch', fetcher);
    mount();
    await click(button('Change path'));
    const bookTitle = [...host.querySelectorAll('p')].find(p => p.textContent === 'From Scarcity to Abundance')!;
    await click(bookTitle);
    await flush();
    expect(host.querySelector('[role="alert"]')?.textContent).toContain('Could not load this book');
    await click(button('Retry'));
    await flush();
    expect(host.textContent).toContain('First chapter');
    expect(host.querySelector('[role="alert"]')).toBeNull();
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
