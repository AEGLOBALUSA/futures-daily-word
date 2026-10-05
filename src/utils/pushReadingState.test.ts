/**
 * B09-17: what this device tells its own reminder (pushReadingState.ts).
 * Her plan and day, the passage due next and when, the last day she read:
 * never a name, an email or an account id, and not again within ten minutes
 * for the same state.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readingStateOf, shouldSendState, syncReadingState, STATE_DEBOUNCE_MS, STATE_SENT_KEY, type ReadingStateInput } from './pushReadingState';
import { PLAN_CATALOGUE } from '../data/plans';

const TODAY = '2026-10-06';
const plan = PLAN_CATALOGUE.find((p) => !p.bookId && p.totalDays >= 13)!;

function input(over: Partial<ReadingStateInput> = {}): ReadingStateInput {
  return {
    persona: 'congregation',
    isNewPath: false,
    passage: 'John 3',
    tomorrow: 'John 4',
    doneToday: false,
    pathwayEnrolled: false,
    pathwayDisplayDay: 1,
    plan: { planId: plan.id, dayNum: 12 },
    today: TODAY,
    lastReadDate: '2026-10-05',
    lang: 'en',
    ...over,
  };
}

describe('readingStateOf', () => {
  it('before she reads: today\'s plan day and passage, due today', () => {
    const s = readingStateOf(input());
    expect(s).toMatchObject({ persona: 'congregation', journey_day: 12, next_passage: 'John 3', next_for_date: TODAY, last_read_date: '2026-10-05' });
    expect(s.next_label).toMatch(/^Day 12 of /);
  });

  it('after she reads: tomorrow\'s day and passage, due tomorrow', () => {
    const s = readingStateOf(input({ doneToday: true, lastReadDate: TODAY }));
    expect(s).toMatchObject({ journey_day: 13, next_passage: 'John 4', next_for_date: '2026-10-07', last_read_date: TODAY });
    expect(s.next_label).toMatch(/^Day 13 of /);
  });

  it('in her language', () => {
    const s = readingStateOf(input({ lang: 'es' }));
    expect(s.next_passage).toBe('Juan 3');
    expect(s.next_label).toMatch(/^Día 12 de /);
  });

  it('the I\'m New journey names its day of 40', () => {
    const s = readingStateOf(input({ persona: 'new_to_faith', isNewPath: true, pathwayEnrolled: true, pathwayDisplayDay: 6, plan: null }));
    expect(s).toMatchObject({ journey_day: 6, next_label: 'Day 6 of the 40-day journey', next_for_date: TODAY });
    const last = readingStateOf(input({ persona: 'new_to_faith', isNewPath: true, pathwayEnrolled: true, pathwayDisplayDay: 40, plan: null, doneToday: true, tomorrow: null }));
    expect(last).toMatchObject({ journey_day: null, next_label: null, next_passage: null, next_for_date: null });
  });

  it('a reader with no plan: the passage, no label', () => {
    expect(readingStateOf(input({ plan: null }))).toMatchObject({ journey_day: null, next_label: null, next_passage: 'John 3', next_for_date: TODAY });
  });

  it('a plan that ends today: no label for tomorrow', () => {
    const s = readingStateOf(input({ plan: { planId: plan.id, dayNum: plan.totalDays }, doneToday: true, tomorrow: null }));
    expect(s).toMatchObject({ journey_day: null, next_label: null, next_passage: null, next_for_date: null });
  });

  it('Comfort: only her path, so the reminder knows never to come', () => {
    expect(readingStateOf(input({ persona: 'comfort' }))).toEqual({
      persona: 'comfort', journey_day: null, next_passage: null, next_label: null, next_for_date: null, last_read_date: null,
    });
  });

  it('stays inside the server\'s caps', () => {
    const s = readingStateOf(input({ passage: 'Song of Solomon 8:1-14 and more and more and more' }));
    expect(s.next_passage).toBeNull();
    expect((s.next_label || '').length).toBeLessThanOrEqual(80);
  });

  it('carries only the six fields', () => {
    expect(Object.keys(readingStateOf(input())).sort()).toEqual(
      ['journey_day', 'last_read_date', 'next_for_date', 'next_label', 'next_passage', 'persona'],
    );
  });
});

describe('shouldSendState: once per ten minutes for the same state', () => {
  const T = 1_000_000_000;
  it('a first or changed state goes at once', () => {
    expect(shouldSendState(null, 'a', false, T)).toEqual({ send: true, reportOpen: false });
    expect(shouldSendState({ at: T, sig: 'a', openedAt: T }, 'b', false, T + 1000)).toEqual({ send: true, reportOpen: false });
  });
  it('the same state does not go again, except to report an open after ten minutes', () => {
    const prev = { at: T, sig: 'a', openedAt: T };
    expect(shouldSendState(prev, 'a', false, T + STATE_DEBOUNCE_MS * 5).send).toBe(false);
    expect(shouldSendState(prev, 'a', true, T + STATE_DEBOUNCE_MS - 1).send).toBe(false);
    expect(shouldSendState(prev, 'a', true, T + STATE_DEBOUNCE_MS)).toEqual({ send: true, reportOpen: true });
  });
});

describe('syncReadingState: what leaves the device', () => {
  let calls: Array<{ url: string; body: Record<string, unknown> }>;
  const realFetch = globalThis.fetch;

  beforeEach(() => {
    localStorage.clear();
    calls = [];
    globalThis.fetch = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ url: String(url), body: JSON.parse(String(init?.body)) });
      return new Response('{}', { status: 200 });
    }) as typeof fetch;
    const sub = { toJSON: () => ({ endpoint: 'https://push.example.test/abc', keys: { p256dh: 'k', auth: 'a' } }) };
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: { ready: Promise.resolve({ pushManager: { getSubscription: async () => sub } }) },
    });
    (window as unknown as { PushManager: unknown }).PushManager = function PushManager() {};
    (globalThis as unknown as { Notification: unknown }).Notification = function Notification() {};
  });

  afterEach(() => {
    globalThis.fetch = realFetch;
    vi.restoreAllMocks();
  });

  const state = readingStateOf(input());

  it('runs where push runs (the test page is localhost)', () => {
    expect(['localhost', '127.0.0.1']).toContain(window.location.hostname);
  });

  it('sends nothing without reminders on this device', async () => {
    expect(await syncReadingState(state, true)).toBe(false);
    expect(calls).toEqual([]);
  });

  it('sends the subscription and the state, nothing else: no name, email or account id', async () => {
    localStorage.setItem('dw_push', 'subscribed');
    localStorage.setItem('dw_profile', JSON.stringify({ email: 'reader@example.com', firstName: 'Reader' }));
    expect(await syncReadingState(state, true, 5_000_000)).toBe(true);
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toMatch(/\/api\/push-subscribe$/);
    expect(Object.keys(calls[0].body).sort()).toEqual(['action', 'state', 'subscription']);
    expect(calls[0].body.action).toBe('update');
    expect(Object.keys(calls[0].body.state as object).sort()).toEqual(
      ['journey_day', 'last_read_date', 'next_for_date', 'next_label', 'next_passage', 'opened', 'persona'],
    );
    const text = JSON.stringify(calls[0].body);
    expect(text).not.toMatch(/reader@example\.com|Reader"|email|firstName|user_?id/i);
  });

  it('the same state within ten minutes is not sent again; a read goes at once', async () => {
    localStorage.setItem('dw_push', 'subscribed');
    await syncReadingState(state, true, 5_000_000);
    await syncReadingState(state, true, 5_000_000 + 60_000);
    expect(calls).toHaveLength(1);
    await syncReadingState({ ...state, last_read_date: TODAY }, false, 5_000_000 + 120_000);
    expect(calls).toHaveLength(2);
    expect((calls[1].body.state as Record<string, unknown>).opened).toBeUndefined();
    expect(JSON.parse(localStorage.getItem(STATE_SENT_KEY) || '{}').openedAt).toBe(5_000_000);
  });
});
