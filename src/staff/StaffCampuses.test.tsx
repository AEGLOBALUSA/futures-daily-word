/**
 * /staff -> Settings -> Campuses (B09-02): the owner keeps the one campus list.
 */
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

vi.mock('./api', () => ({
  getStaffToken: () => 'test-token',
  setStaffToken: vi.fn(),
  intake: vi.fn(),
  STAFF_SIGNED_OUT_EVENT: 'dw-staff-signed-out',
}));

import { StaffApp } from './StaffApp';
import { intake } from './api';
import FALLBACK from '../../netlify/functions/lib/campuses.fallback.json';

beforeAll(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});

const ADMIN = { email: 'owner@example.org', role: 'admin', campusId: null, name: 'Owner', isAdmin: true };
let saved: Record<string, unknown>[] = [];

beforeEach(() => {
  saved = [];
  vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('no network in tests'); }));
  vi.mocked(intake).mockImplementation(async (action: string, payload?: Record<string, unknown>) => {
    if (action === 'me') return { staff: ADMIN };
    if (action === 'campuses_list') {
      return { campuses: FALLBACK.map((c, i) => ({ ...c, active: i !== 20 })) };
    }
    if (action === 'campus_save') {
      saved.push(payload!.campus as Record<string, unknown>);
      return { campus: payload!.campus, isNew: true };
    }
    return {};
  });
});

async function mount() {
  const el = document.createElement('div');
  document.body.appendChild(el);
  const root: Root = createRoot(el);
  await act(async () => { root.render(<StaffApp />); });
  await act(async () => { for (let i = 0; i < 6; i++) await Promise.resolve(); });
  await act(async () => { button(el, 'Campuses')!.click(); });
  await act(async () => { for (let i = 0; i < 6; i++) await Promise.resolve(); });
  return { el, root };
}

const button = (el: HTMLElement, text: string) =>
  [...el.querySelectorAll('button')].find((b) => (b.textContent || '').trim() === text) as HTMLButtonElement | undefined;

describe('Campuses', () => {
  it('opens on the count sentence, a row per campus, hidden in words, and one pulsing Add a campus', async () => {
    const { el, root } = await mount();
    expect(el.textContent).toContain('22 campuses. Readers see them in this order.');
    expect(el.textContent).toContain('How this connects');
    const rows = [...el.querySelectorAll('button[aria-expanded]')];
    expect(rows).toHaveLength(22);
    expect(rows[0].getAttribute('aria-label')).toBe('Futures Paradise, Paradise, SA, Australia/Adelaide');
    expect(rows[20].getAttribute('aria-label')).toBe('Futures Rio, Rio de Janeiro, Brazil, America/Sao_Paulo, hidden from readers');
    expect(el.textContent).toContain('Hidden from readers');
    const next = el.querySelectorAll('.dw-next');
    expect(next).toHaveLength(1);
    expect(next[0].textContent).toBe('Add a campus');
    act(() => root.unmount());
  });

  it('an open row moves the one next step to Save campus and shows the id as plain text', async () => {
    const { el, root } = await mount();
    await act(async () => { (el.querySelector('button[aria-expanded]') as HTMLButtonElement).click(); });
    const next = el.querySelectorAll('.dw-next');
    expect(next).toHaveLength(1);
    expect(next[0].textContent).toBe('Save campus');
    expect(el.textContent).toContain('The id never changes once saved');
    expect(button(el, 'Move up')).toBeTruthy();
    expect(button(el, 'Hide from readers')).toBeTruthy();
    act(() => root.unmount());
  });

  it('Save campus with no name says so beside the button, and sends nothing', async () => {
    const { el, root } = await mount();
    await act(async () => { button(el, 'Add a campus')!.click(); });
    await act(async () => { button(el, 'Save campus')!.click(); });
    const alert = el.querySelector('[role="alert"]');
    expect(alert?.textContent).toBe('Add the campus name first.');
    expect(alert?.previousElementSibling?.textContent).toBe('Save campus');
    expect(saved).toHaveLength(0);
    act(() => root.unmount());
  });

  it('Other towns near this campus opens filled from the row, stays editable, and its lines go out on Save campus (B09-07F)', async () => {
    const { el, root } = await mount();
    const row = [...el.querySelectorAll('button[aria-expanded]')]
      .find((b) => (b.getAttribute('aria-label') || '').startsWith('Futures Copper Coast,')) as HTMLButtonElement;
    await act(async () => { row.click(); });
    const towns = el.querySelector('#campus-towns') as HTMLTextAreaElement;
    expect(towns).toBeTruthy();
    expect(el.querySelector('label[for="campus-towns"]')?.textContent).toContain('Other towns near this campus');
    expect(towns.value).toBe('Kadina\nWallaroo\nMoonta');
    expect(towns.disabled).toBe(false);
    expect(towns.readOnly).toBe(false);
    expect(towns.getAttribute('aria-describedby')).toBe('campus-towns-help');
    // It sits straight after Town.
    const fieldIds = [...el.querySelectorAll('input[id^="campus-"], textarea[id^="campus-"], select[id^="campus-"]')].map((n) => n.id);
    expect(fieldIds.indexOf('campus-towns')).toBe(fieldIds.indexOf('campus-town') + 1);

    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!;
    await act(async () => {
      setter.call(towns, 'Kadina\nWallaroo\nMoonta\nMoonta Bay');
      towns.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(el.querySelectorAll('.dw-next')).toHaveLength(1);
    await act(async () => { button(el, 'Save campus')!.click(); });
    await act(async () => { for (let i = 0; i < 6; i++) await Promise.resolve(); });
    expect(saved).toHaveLength(1);
    expect(saved[0].id).toBe('au-copper-coast');
    expect(saved[0].towns).toBe('Kadina\nWallaroo\nMoonta\nMoonta Bay');
    act(() => root.unmount());
  });

  it('a new campus opens with Other towns near this campus empty', async () => {
    const { el, root } = await mount();
    await act(async () => { button(el, 'Add a campus')!.click(); });
    const towns = el.querySelector('#campus-towns') as HTMLTextAreaElement;
    expect(towns.value).toBe('');
    act(() => root.unmount());
  });
});
