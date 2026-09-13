/**
 * ComfortSection is now the after-reading frame only (Wave B, item 5): no
 * chapter render, no translation picker, no Listen control, no reading
 * count, no ask and no 1/2/3-chapter quota buttons. It shows the day's
 * devotion (when one exists for the chapter) and, once the reading is
 * marked done, a quiet closing line — never a number, never a streak.
 */
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import { ComfortSection, localDayIndex } from './ComfortSection';
import { COMFORT_CHAPTERS, COMFORT_DEVOTIONS } from '../data/comfort';

beforeAll(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});

let mounted: { el: HTMLDivElement; root: Root } | null = null;

function mount(readCompletedToday: boolean, lang = 'en', heroChapter?: string) {
  const el = document.createElement('div');
  document.body.appendChild(el);
  const root = createRoot(el);
  act(() => {
    root.render(<ComfortSection lang={lang} readCompletedToday={readCompletedToday} heroChapter={heroChapter} />);
  });
  mounted = { el, root };
  return el;
}

afterEach(() => {
  if (mounted) {
    act(() => mounted!.root.unmount());
    mounted.el.remove();
    mounted = null;
  }
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('ComfortSection', () => {
  it('renders no chapter text, no translation buttons and no Listen control', () => {
    const el = mount(false);
    expect(el.textContent).not.toMatch(/ESV|NIV|KJV/);
    expect(el.querySelector('button')).toBeNull();
    expect(el.textContent?.toLowerCase()).not.toContain('listen');
  });

  it('renders no count line', () => {
    const el = mount(false);
    expect(el.textContent).not.toMatch(/Reading \d+ of \d+/);
  });

  it('renders no question and no 1/2/3-chapter buttons', () => {
    const el = mount(false);
    expect(el.textContent).not.toMatch(/daily reading amount/i);
    expect(el.textContent).not.toContain('1 chapter a day');
    expect(el.textContent).not.toContain('2 chapters a day');
    expect(el.textContent).not.toContain('3 chapters a day');
  });

  it('renders the done line only when readCompletedToday is true', () => {
    const chapter = COMFORT_CHAPTERS[localDayIndex() % COMFORT_CHAPTERS.length];
    const hasDevotion = !!COMFORT_DEVOTIONS[chapter];

    const notDone = mount(false);
    expect(notDone.textContent).not.toContain('God is with you');

    act(() => mounted?.root.unmount());
    mounted?.el.remove();
    mounted = null;

    const done = mount(true);
    if (!hasDevotion) {
      expect(done.textContent).toContain('God is with you');
    }
  });

  it('renders nothing at all when the day\'s chapter has no devotion and the reading is not done', () => {
    const chapter = COMFORT_CHAPTERS[localDayIndex() % COMFORT_CHAPTERS.length];
    if (COMFORT_DEVOTIONS[chapter]) return; // only meaningful on a devotion-less day
    const el = mount(false);
    expect(el.textContent?.trim()).toBe('');
  });

  it('renders the devotion for heroChapter when one exists, even if it differs from the day index', () => {
    const heroChapter = 'Psalm 23';
    const devotion = COMFORT_DEVOTIONS[heroChapter];
    const el = mount(false, 'en', heroChapter);
    expect(el.textContent).toContain(devotion.title);
  });

  it('renders no devotion card when heroChapter has none, even though the day index would have one', () => {
    const heroChapter = 'Genesis 1';
    expect(COMFORT_DEVOTIONS[heroChapter]).toBeUndefined();
    const el = mount(false, 'en', heroChapter);
    expect(el.textContent?.trim()).toBe('');
  });

  it('keeps the day-index devotion when heroChapter is not provided', () => {
    const chapter = COMFORT_CHAPTERS[localDayIndex() % COMFORT_CHAPTERS.length];
    const devotion = COMFORT_DEVOTIONS[chapter];
    const el = mount(false);
    if (devotion) {
      expect(el.textContent).toContain(devotion.title);
    } else {
      expect(el.textContent?.trim()).toBe('');
    }
  });
});
