import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import { CampusSelect } from './CampusSelect';
import { __resetCampusesForTests } from '../data/campuses';
import { FALLBACK_CAMPUSES } from '../data/campuses.fallback';

beforeAll(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});

let mounted: { el: HTMLDivElement; root: Root } | null = null;

beforeEach(() => { localStorage.clear(); __resetCampusesForTests(); });
afterEach(() => {
  if (mounted) { act(() => mounted!.root.unmount()); mounted.el.remove(); mounted = null; }
  vi.unstubAllGlobals();
});

async function mount() {
  const el = document.createElement('div');
  document.body.appendChild(el);
  const root = createRoot(el);
  await act(async () => { root.render(<CampusSelect value="" onChange={() => {}} />); });
  await act(async () => { for (let i = 0; i < 5; i++) await Promise.resolve(); });
  mounted = { el, root };
  return el;
}

const options = (el: HTMLElement) => [...el.querySelectorAll('option')].map((o) => o.value).filter(Boolean);

describe('CampusSelect reads the one campus list (B09-02)', () => {
  it('a campus the owner added appears, under its own new region', async () => {
    const merida = {
      id: 've-futuros-merida', name: 'Futuros Mérida', city: 'Mérida, Venezuela', region: 'Venezuela',
      congregation: 'futuros-us', timeZone: 'America/Caracas', sundayUntil: '16:00', videoUrl: null, sortOrder: 215,
    };
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ campuses: [...FALLBACK_CAMPUSES, merida] }) })));
    const el = await mount();
    expect(options(el)).toContain('ve-futuros-merida');
    expect([...el.querySelectorAll('optgroup')].map((g) => g.label)).toContain('Venezuela');
  });

  it('shows the bundled 22 when the fetch fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline'); }));
    const el = await mount();
    expect(options(el)).toHaveLength(22);
  });

  it('a hidden campus is not offered for a new choice', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ campuses: FALLBACK_CAMPUSES.filter((c) => c.id !== 'br-rio') }) })));
    const el = await mount();
    expect(options(el)).not.toContain('br-rio');
    expect(options(el)).toHaveLength(21);
  });
});
