/**
 * B09-08 review MUST 1: on a Sunday morning a failed or non-OK notes feed stays
 * "unknown", so an I'm New reader keeps "Open today's sermon notes" (kind 2);
 * while the answer is unknown or "none yet" the hook asks again, at most every
 * five minutes, so notes approved mid-morning arrive with the app open.
 */
import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import type { PathwayData } from '../data/pathway-types';

const notes = vi.hoisted(() => ({ fetch: vi.fn<(c?: string) => Promise<boolean | null>>() }));
vi.mock('./currentSermon', () => ({ fetchSermonNotesPublished: notes.fetch }));
vi.mock('./sunday', () => ({
  isSundayWindow: () => true,
  readerTimeZone: () => 'Australia/Adelaide',
  readerSundayUntil: () => '16:00',
}));

import { useHomeNextStep, NOTES_RECHECK_MS, type HomeNextStep, type HomeNextStepInput } from './useHomeNextStep';

beforeAll(() => { (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true; });

const PATHWAY = { title: 'Grace', days: [{ day: 6, title: 'Day 6' }] } as unknown as PathwayData;
const INPUT: HomeNextStepInput = {
  persona: 'new_to_faith',
  isNewPath: true,
  passage: 'John 3',
  readDoneToday: false,
  passageOpen: false,
  journeyInHero: false,
  pathwayEnrolled: true,
  pathwayData: PATHWAY,
  pathwayDisplayDay: 6,
  journeyDayDone: false,
  planPassages: [],
  firstSlot: null,
  campusId: null,
  email: null,
  congregation: 'futures-au',
  dayIndex: 0,
};

let latest: HomeNextStep | null = null;
function Probe() {
  latest = useHomeNextStep(INPUT);
  return null;
}

let root: Root | null = null;
let el: HTMLElement | null = null;
const flush = () => act(async () => { await Promise.resolve(); await Promise.resolve(); });

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-04T00:30:00Z')); // Sunday 10:00 in Adelaide
  notes.fetch.mockReset();
  latest = null;
});

afterEach(() => {
  if (root) act(() => root!.unmount());
  el?.remove();
  root = null;
  el = null;
  vi.useRealTimers();
});

async function mount() {
  el = document.createElement('div');
  document.body.appendChild(el);
  root = createRoot(el);
  act(() => { root!.render(<Probe />); });
  await flush();
}

describe('useHomeNextStep: Sunday notes on a weak feed', () => {
  it('a failed fetch keeps Open today\'s sermon notes (kind 2)', async () => {
    notes.fetch.mockResolvedValue(null);
    await mount();
    expect(notes.fetch).toHaveBeenCalledWith('futures-au');
    expect(latest!.step).toMatchObject({ kind: 'sunday_new', step: 2, action: 'open_notes' });
  });

  it('asks again while unknown, but not more than once in five minutes', async () => {
    notes.fetch.mockResolvedValue(null);
    await mount();
    expect(notes.fetch).toHaveBeenCalledTimes(1);
    await act(async () => { vi.advanceTimersByTime(4 * 60_000); });
    await flush();
    expect(notes.fetch).toHaveBeenCalledTimes(1);
    await act(async () => { vi.advanceTimersByTime(NOTES_RECHECK_MS - 4 * 60_000 + 60_000); });
    await flush();
    expect(notes.fetch).toHaveBeenCalledTimes(2);
  });

  it('a definite "none yet" gives way to the day, then the notes arrive on a later check', async () => {
    notes.fetch.mockResolvedValueOnce(false).mockResolvedValue(true);
    await mount();
    expect(latest!.step.kind).toBe('journey_day');
    await act(async () => { vi.advanceTimersByTime(NOTES_RECHECK_MS + 60_000); });
    await flush();
    expect(notes.fetch).toHaveBeenCalledTimes(2);
    expect(latest!.step.kind).toBe('sunday_new');
    // A yes is kept for the day: no more asking.
    await act(async () => { vi.advanceTimersByTime(3 * NOTES_RECHECK_MS); });
    await flush();
    expect(notes.fetch).toHaveBeenCalledTimes(2);
  });

  it('focus asks again once the five minutes have passed', async () => {
    notes.fetch.mockResolvedValue(false);
    await mount();
    vi.setSystemTime(new Date(Date.now() + NOTES_RECHECK_MS + 1));
    await act(async () => { window.dispatchEvent(new Event('focus')); });
    await flush();
    expect(notes.fetch).toHaveBeenCalledTimes(2);
  });
});
