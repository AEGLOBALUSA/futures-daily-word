// "Needs you" on Staff home (B09-13): the lines render from a stubbed
// prayer_lines; an anonymous row has no write button; I wrote closes the row
// and both lists agree; the error sits beside the pill; one main button.
// Plain react-dom + act, in the style of CornerDraftCard.test.tsx.
import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

vi.mock('./prayerCareApi', () => ({
  canSeePrayerCare: () => true,
  loadPrayerCare: vi.fn(),
  loadPrayerLines: vi.fn(),
  prayerWriteLink: vi.fn(),
  closePrayerLine: vi.fn(),
  setWaitingMuted: vi.fn(),
  decidePrayer: vi.fn(),
}));

import { PrayerCare } from './PrayerCare';
import { closePrayerLine, loadPrayerCare, loadPrayerLines, prayerWriteLink, setWaitingMuted, type PrayerLine, type WeekPrayer } from './prayerCareApi';

const SAM = 'a1111111-1111-4111-8111-111111111111';
const ANON = 'a2222222-2222-4222-8222-222222222222';
const hoursAgo = (h: number) => new Date(Date.now() - h * 3600_000).toISOString();
const line = (o: Partial<PrayerLine>): PrayerLine => ({
  id: SAM, firstName: 'Sam', campusId: 'au-paradise', campusName: 'Futures Paradise',
  text: 'Please pray for my job interview on Thursday.', createdAt: hoursAgo(3), waitingDays: 0, canWrite: true, ...o,
});
const week = (o: Partial<WeekPrayer>): WeekPrayer => ({
  id: SAM, campusId: 'au-paradise', campusName: 'Futures Paradise', text: 'Please pray for my job interview on Thursday.',
  prayed: 0, createdAt: hoursAgo(3), daysAgo: 0, status: 'shown', anonymous: false, firstName: 'Sam', canWrite: true, done: null, ...o,
});

let el: HTMLDivElement;
let root: Root;
const realLocation = window.location;

beforeAll(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});
beforeEach(() => {
  vi.mocked(loadPrayerCare).mockResolvedValue({ scope: { all: false, campusId: 'au-paradise', campusName: 'Futures Paradise' }, held: [], week: [week({})] });
  vi.mocked(loadPrayerLines).mockResolvedValue({
    lines: [
      line({ id: ANON, firstName: null, canWrite: false, text: 'For my mum’s surgery.', createdAt: hoursAgo(30), waitingDays: 1 }),
      line({}),
    ],
    waitingMuted: false,
  });
  // The mail app is a navigation; keep jsdom from trying to follow mailto:.
  Object.defineProperty(window, 'location', { configurable: true, value: { ...realLocation, href: realLocation.href } });
});
afterEach(() => {
  act(() => root?.unmount());
  el?.remove();
  Object.defineProperty(window, 'location', { configurable: true, value: realLocation });
  vi.clearAllMocks();
});

async function flush() {
  await act(async () => { for (let i = 0; i < 8; i += 1) await Promise.resolve(); });
}
async function mount() {
  el = document.createElement('div');
  document.body.appendChild(el);
  root = createRoot(el);
  act(() => { root.render(<PrayerCare staff={{ role: 'campus' }}><p>job tiles</p></PrayerCare>); });
  await flush();
}
const buttons = () => Array.from(el.querySelectorAll('button'));
const button = (label: string) => buttons().find(b => b.textContent?.trim() === label);
const needsYou = () => el.querySelector('section[aria-labelledby="prayer-care-needs-title"]') as HTMLElement | null;
async function click(b: HTMLElement | undefined) {
  expect(b, 'button').toBeTruthy();
  await act(async () => { b!.click(); });
  await flush();
}

describe('Needs you (B09-13)', () => {
  it('renders the lines oldest first; the anonymous row has no write button; one main button', async () => {
    await mount();
    const card = needsYou()!;
    expect(card.querySelector('h2')?.textContent).toBe('Needs you · 2');
    const rows = Array.from(card.querySelectorAll('li'));
    expect(rows[0].querySelector('h3')?.textContent).toMatch(/^Someone at Futures Paradise asked for prayer · yesterday$/);
    expect(rows[0].textContent).not.toMatch(/Write to/);
    expect(Array.from(rows[0].querySelectorAll('button')).map(b => b.textContent)).toEqual(['I prayed for this']);
    expect(rows[1].querySelector('h3')?.getAttribute('aria-label')).toBe('Sam asked for prayer, 3 hours ago');
    expect(Array.from(rows[1].querySelectorAll('button')).map(b => b.textContent)).toEqual(['Write to Sam', 'I prayed for this']);
    expect(el.querySelectorAll('.dw-next')).toHaveLength(1);
    expect(rows[0].querySelector('.dw-next')?.textContent).toBe('I prayed for this');
    expect(card.textContent).not.toMatch(/@/);
  });

  it('Write to Sam opens the address-only email, asks on return, and I wrote closes it in both lists', async () => {
    vi.mocked(prayerWriteLink).mockResolvedValue('mailto:sam%40example.org');
    vi.mocked(closePrayerLine).mockResolvedValue({ kind: 'wrote', already: false });
    await mount();
    const row = Array.from(needsYou()!.querySelectorAll('li'))[1];
    await click(Array.from(row.querySelectorAll('button')).find(b => b.textContent === 'Write to Sam'));
    expect(prayerWriteLink).toHaveBeenCalledWith(SAM);
    expect(window.location.href).toBe('mailto:sam%40example.org');
    expect(needsYou()!.textContent).toContain('Did you write to Sam?');
    expect(button('Not yet')).toBeTruthy();
    const wrote = Array.from(needsYou()!.querySelectorAll('button')).find(b => b.textContent === 'I wrote to Sam');
    await click(wrote);
    expect(closePrayerLine).toHaveBeenCalledWith(SAM, 'wrote');
    expect(needsYou()!.querySelectorAll('li')).toHaveLength(1);
    expect(el.textContent).toContain('Done. 1 more needs you.');
    // The weekly list agrees: Sam's row is now "Written to", with no write button.
    const weekCard = el.querySelector('section[aria-labelledby="prayer-care-week-title"]')!;
    expect(weekCard.textContent).toContain('Written to');
    expect(Array.from(weekCard.querySelectorAll('button')).map(b => b.textContent)).not.toContain('Write to Sam');
  });

  it('a failed write link says so beside the pill, which stays usable', async () => {
    vi.mocked(prayerWriteLink).mockRejectedValue(Object.assign(new Error('no'), { status: 500 }));
    await mount();
    const row = Array.from(needsYou()!.querySelectorAll('li'))[1];
    const write = Array.from(row.querySelectorAll('button')).find(b => b.textContent === 'Write to Sam')!;
    await click(write);
    const alert = row.querySelector('[role="alert"]');
    expect(alert?.textContent).toBe("Couldn't open the email. Try again.");
    expect(write.getAttribute('aria-disabled')).not.toBe('true');
    expect(write.hasAttribute('disabled')).toBe(false);
  });

  it('closing from the weekly list removes the line from Needs you too', async () => {
    vi.mocked(prayerWriteLink).mockResolvedValue('mailto:sam%40example.org');
    vi.mocked(closePrayerLine).mockResolvedValue({ kind: 'wrote', already: false });
    await mount();
    const weekCard = () => el.querySelector('section[aria-labelledby="prayer-care-week-title"]')!;
    await click(Array.from(weekCard().querySelectorAll('button')).find(b => b.textContent === 'Write to Sam'));
    await click(Array.from(weekCard().querySelectorAll('button')).find(b => b.textContent === 'I wrote to Sam'));
    expect(closePrayerLine).toHaveBeenCalledWith(SAM, 'wrote');
    expect(Array.from(needsYou()!.querySelectorAll('li')).map(li => li.querySelector('h3')?.textContent)).not.toContain(expect.stringMatching(/^Sam/));
    expect(needsYou()!.querySelectorAll('li')).toHaveLength(1);
  });

  it('closing the last line says Nothing else needs you', async () => {
    vi.mocked(loadPrayerLines).mockResolvedValue({ lines: [line({ id: ANON, firstName: null, canWrite: false })], waitingMuted: false });
    vi.mocked(closePrayerLine).mockResolvedValue({ kind: 'prayed', already: false });
    await mount();
    await click(button('I prayed for this'));
    expect(closePrayerLine).toHaveBeenCalledWith(ANON, 'prayed');
    expect(el.textContent).toContain('Done. Nothing else needs you.');
    expect(el.querySelectorAll('.dw-next')).toHaveLength(0);
  });

  it('while a held post waits, its Show it on the wall is the one main button', async () => {
    vi.mocked(loadPrayerCare).mockResolvedValue({
      scope: { all: false, campusId: 'au-paradise', campusName: 'Futures Paradise' },
      held: [{ id: 'h1', campusId: 'au-paradise', campusName: 'Futures Paradise', text: 'Call me', createdAt: hoursAgo(1), daysAgo: 0, heldReason: 'contact' }],
      week: [],
    });
    await mount();
    const mains = el.querySelectorAll('.dw-next');
    expect(mains).toHaveLength(1);
    expect(mains[0].textContent).toBe('Show it on the wall');
  });

  it('no lines: no card at all; the waiting email switch saves from the card', async () => {
    vi.mocked(loadPrayerLines).mockResolvedValueOnce({ lines: [], waitingMuted: false });
    await mount();
    expect(needsYou()).toBeNull();
    act(() => root.unmount());
    el.remove();
    vi.mocked(setWaitingMuted).mockResolvedValue(true);
    await mount();
    await click(button('Stop the waiting email'));
    expect(setWaitingMuted).toHaveBeenCalledWith(true);
    expect(button('Send me the waiting email again')).toBeTruthy();
  });
});
