// DW-P08: the reading week line. Plain react-dom + act, in the style of
// CornerDraftCard.test.tsx (this repo has no @testing-library/dom).
import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

vi.mock('./readingWeekApi', async (importOriginal) => {
  const real = await importOriginal<typeof import('./readingWeekApi')>();
  return { ...real, getReadingWeek: vi.fn() };
});

import { ReadingWeekLine } from './ReadingWeekLine';
import { getReadingWeek, type ReadingWeek } from './readingWeekApi';

const mocked = vi.mocked(getReadingWeek);
let el: HTMLDivElement;
let root: Root;

beforeAll(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});

beforeEach(() => {
  try { localStorage.setItem('dw_lang', 'en'); } catch { /* jsdom */ }
  el = document.createElement('div');
  document.body.appendChild(el);
  root = createRoot(el);
  mocked.mockReset();
});

afterEach(() => {
  act(() => root.unmount());
  el.remove();
});

const WEEK: ReadingWeek = { campusId: 'au-test', campusName: 'Test Campus', readers: 212, firstTime: 31, startedJourney: 4, prevReaders: 168 };

async function render(node: React.ReactNode) {
  await act(async () => { root.render(node); });
  await act(async () => { await Promise.resolve(); });
}

describe('ReadingWeekLine', () => {
  it('one plain sentence, then the one comparison when readers moved 15% or more', async () => {
    mocked.mockResolvedValue(WEEK);
    await render(<ReadingWeekLine />);
    const ps = [...el.querySelectorAll('p')].map(p => p.textContent);
    expect(ps).toEqual([
      "Test Campus, the last 7 days: 212 people read the Daily Word, 31 for the first time, and 4 started Bible Basics or I'm new.",
      'Up from 168 the 7 days before.',
    ]);
    expect(el.querySelector('[aria-live="polite"]')).not.toBeNull();
    expect(el.querySelector('button')).toBeNull();
    expect(mocked).toHaveBeenCalledWith(undefined);
  });

  it('leaves out an empty clause and a small move; says one person in the singular', async () => {
    mocked.mockResolvedValue({ ...WEEK, readers: 1, firstTime: 0, startedJourney: 0, prevReaders: 1 });
    await render(<ReadingWeekLine campusId="au-test" />);
    expect([...el.querySelectorAll('p')].map(p => p.textContent)).toEqual([
      'Test Campus, the last 7 days: 1 person read the Daily Word.',
    ]);
    expect(mocked).toHaveBeenCalledWith('au-test');
  });

  it('shows nothing when there is nothing for this person to see (403/400 → null), and says so upward', async () => {
    mocked.mockResolvedValue(null);
    const onShown = vi.fn();
    await render(<ReadingWeekLine onShown={onShown} />);
    expect(el.textContent).toBe('');
    expect(onShown).toHaveBeenLastCalledWith(false);
  });

  it('a failure says so beside one way to load it again, and the retry works', async () => {
    mocked.mockRejectedValueOnce(Object.assign(new Error('Request failed'), { status: 500 }));
    await render(<ReadingWeekLine />);
    expect(el.textContent).toContain('did not load');
    const retry = el.querySelector('button')!;
    expect(retry.textContent).toBe('Load it again');
    mocked.mockResolvedValueOnce(WEEK);
    await act(async () => { retry.click(); });
    await act(async () => { await Promise.resolve(); });
    expect(el.textContent).toContain('212 people read the Daily Word');
    expect(el.querySelector('button')).toBeNull();
  });

  it('never shows a name or an address: only the campus and the counts reach the screen', async () => {
    mocked.mockResolvedValue(WEEK);
    await render(<ReadingWeekLine />);
    expect(el.textContent).not.toMatch(/@/);
  });
});
