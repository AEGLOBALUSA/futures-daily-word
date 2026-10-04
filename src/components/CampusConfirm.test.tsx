import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import { __resetCampusesForTests } from '../data/campuses';
import { __resetPlaceForTests } from '../utils/geo';
import { CAMPUS_GUESS_KEY, __resetCampusGuessForTests } from '../utils/campusGuess';

const saveProfile = vi.fn();
const requireEmail = vi.fn();
vi.mock('../contexts/UserContext', () => ({
  useUser: () => ({ saveProfile, requireEmail }),
}));

import { CampusConfirm } from './CampusConfirm';

beforeAll(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});

let mounted: { el: HTMLDivElement; root: Root } | null = null;

beforeEach(() => {
  localStorage.clear();
  __resetCampusesForTests();
  __resetPlaceForTests();
  __resetCampusGuessForTests();
  saveProfile.mockReset();
  requireEmail.mockReset();
});
afterEach(() => {
  if (mounted) { act(() => mounted!.root.unmount()); mounted.el.remove(); mounted = null; }
  vi.unstubAllGlobals();
});

/** /api/geo answers with this place; the campus list fetch fails (bundled list). */
function stubGeo(place: Record<string, string>) {
  vi.stubGlobal('fetch', vi.fn(async (url: string) => (
    String(url).includes('/api/geo')
      ? { ok: true, json: async () => place }
      : { ok: false, json: async () => ({}) }
  )));
}

async function mount(userProfile: object | null) {
  const el = document.createElement('div');
  document.body.appendChild(el);
  const root = createRoot(el);
  await act(async () => { root.render(<CampusConfirm userProfile={userProfile} />); });
  await act(async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); });
  mounted = { el, root };
  return el;
}

const buttons = (el: HTMLElement) => [...el.querySelectorAll('button')];
const byText = (el: HTMLElement, text: string) => buttons(el).find((b) => b.textContent?.trim() === text);

describe('CampusConfirm (B09-07)', () => {
  it('a ?campus= guess asks one question; Yes saves through the dropdown path', async () => {
    localStorage.setItem(CAMPUS_GUESS_KEY, 'us-alpharetta');
    stubGeo({});
    const profile = { email: 'reader@example.com', campus: '' };
    const el = await mount(profile);
    expect(el.querySelector('h2')?.textContent).toBe('Are you part of Futures Alpharetta?');
    expect(el.querySelectorAll('.dw-next')).toHaveLength(1);
    const yes = byText(el, 'Yes')!;
    expect(yes.classList.contains('dw-next')).toBe(true);
    expect(yes.getAttribute('aria-label')).toBe('Yes, Futures Alpharetta is my campus');
    expect(byText(el, 'Another campus')).toBeTruthy();
    // Nothing is saved before the tap.
    expect(saveProfile).not.toHaveBeenCalled();
    await act(async () => { yes.click(); });
    expect(saveProfile).toHaveBeenCalledWith({ ...profile, campus: 'us-alpharetta' });
  });

  it('Another campus leads with her region, then Somewhere else; it never saves by itself', async () => {
    localStorage.setItem(CAMPUS_GUESS_KEY, 'us-kennesaw');
    stubGeo({});
    const el = await mount({ email: 'reader@example.com', campus: '' });
    await act(async () => { byText(el, 'Another campus')!.click(); });
    expect(saveProfile).not.toHaveBeenCalled();
    expect(el.querySelector('h2')?.textContent).toBe('Which Futures campus are you part of?');
    expect(el.querySelectorAll('.dw-next')).toHaveLength(0);
    const labels = buttons(el).map((b) => b.getAttribute('aria-label')).filter(Boolean);
    expect(labels).toContain('Choose Futures Alpharetta');
    expect(labels).not.toContain('Choose Futures Kennesaw');
    expect(labels).not.toContain('Choose Futures Franklin');
    expect(byText(el, 'Somewhere else')).toBeTruthy();
  });

  it('Adelaide: no single guess, the metro campuses first', async () => {
    stubGeo({ country: 'AU', city: 'Adelaide', subdivision: 'SA' });
    const el = await mount(null);
    expect(el.querySelector('h2')?.textContent).toBe('Which Futures campus are you part of?');
    const first = buttons(el).slice(0, 4).map((b) => b.getAttribute('aria-label'));
    expect(first.sort()).toEqual(['Choose Futures Adelaide City', 'Choose Futures Paradise', 'Choose Futures Salisbury', 'Choose Futures South']);
    // Before sign-up a tap keeps the choice on the device and opens the email gate.
    await act(async () => { buttons(el)[0].click(); });
    expect(requireEmail).toHaveBeenCalledTimes(1);
    expect(saveProfile).not.toHaveBeenCalled();
  });

  it('asks in Spanish for a Spanish reader', async () => {
    localStorage.setItem('dw_lang', 'es');
    localStorage.setItem(CAMPUS_GUESS_KEY, 'us-futuros-duluth');
    stubGeo({});
    const el = await mount({ email: 'r@example.com', campus: '' });
    expect(el.querySelector('h2')?.textContent).toBe('¿Eres parte de Futuros Duluth?');
    expect(byText(el, 'Sí')).toBeTruthy();
    expect(byText(el, 'Otro campus')).toBeTruthy();
  });
});
