/**
 * B09-11: the poster's own phone keeps her request ids (dw_my_prayers, never
 * synced) and shows "{n} people prayed for your request" when the count grows,
 * for the rest of that day, and never after 14 days.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  readMyPrayers, rememberMyPrayer, refreshMyPrayers, prayedCard, noteCardShown, applyCounts, prune,
  MY_PRAYERS_KEY, MY_PRAYERS_DAYS, MY_PRAYERS_FETCH_MS, requestPrayerWall, takePrayerWallRequest,
} from './myPrayers';

const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';
const DAY = 24 * 60 * 60_000;
const T0 = Date.UTC(2026, 9, 5, 12);

function okFetch(body: unknown) {
  return vi.fn(async () => ({ ok: true, json: async () => body })) as unknown as typeof fetch;
}

beforeEach(() => { localStorage.clear(); sessionStorage.clear(); });

describe('dw_my_prayers store', () => {
  it('remembers a posted id once, lower-cased, and refuses anything that is not a uuid', () => {
    rememberMyPrayer(A.toUpperCase(), T0);
    rememberMyPrayer(A, T0 + 1);
    rememberMyPrayer('not-an-id', T0);
    rememberMyPrayer(undefined, T0);
    const rec = readMyPrayers(T0);
    expect(rec.prayers.map((p) => p.id)).toEqual([A]);
  });

  it('drops a request after 14 days and keeps at most 10', () => {
    rememberMyPrayer(A, T0);
    expect(readMyPrayers(T0 + (MY_PRAYERS_DAYS * DAY) - 1).prayers).toHaveLength(1);
    expect(readMyPrayers(T0 + MY_PRAYERS_DAYS * DAY).prayers).toHaveLength(0);
    const many = { v: 1 as const, checkedAt: 0, prayers: Array.from({ length: 12 }, (_, i) => ({ id: `${String(i).padStart(8, '0')}-1111-4111-8111-111111111111`, postedAt: T0 - i, count: 0, seen: 0 })) };
    expect(prune(many, T0).prayers).toHaveLength(10);
  });

  it('a damaged or blocked store reads as nothing posted', () => {
    localStorage.setItem(MY_PRAYERS_KEY, '{oops');
    expect(readMyPrayers(T0).prayers).toEqual([]);
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    expect(readMyPrayers(T0).prayers).toEqual([]);
    spy.mockRestore();
  });
});

describe('refreshMyPrayers', () => {
  it('asks the server with her ids only, at most once an hour', async () => {
    rememberMyPrayer(A, T0);
    const f = okFetch([{ id: A, prayerCount: 3 }]);
    await refreshMyPrayers({ now: T0, fetchImpl: f });
    await refreshMyPrayers({ now: T0 + MY_PRAYERS_FETCH_MS - 1, fetchImpl: f });
    expect(f).toHaveBeenCalledTimes(1);
    expect(String((f as any).mock.calls[0][0])).toContain(`prayer-wall?mine=${A}`);
    await refreshMyPrayers({ now: T0 + MY_PRAYERS_FETCH_MS, fetchImpl: f });
    expect(f).toHaveBeenCalledTimes(2);
    expect(readMyPrayers(T0).prayers[0].count).toBe(3);
  });

  it('does not call the server when she has posted nothing', async () => {
    const f = okFetch([]);
    await refreshMyPrayers({ now: T0, fetchImpl: f });
    expect(f).not.toHaveBeenCalled();
  });

  it('a failure keeps what the phone knew, and is not retried before the hour', async () => {
    rememberMyPrayer(A, T0);
    await refreshMyPrayers({ now: T0, fetchImpl: okFetch([{ id: A, prayerCount: 2 }]) });
    const bad = vi.fn(async () => { throw new Error('offline'); }) as unknown as typeof fetch;
    await refreshMyPrayers({ now: T0 + MY_PRAYERS_FETCH_MS, fetchImpl: bad });
    expect(readMyPrayers(T0).prayers[0].count).toBe(2);
    await refreshMyPrayers({ now: T0 + MY_PRAYERS_FETCH_MS + 1, fetchImpl: bad });
    expect(bad).toHaveBeenCalledTimes(1);
  });

  it('a count never goes down on this phone', () => {
    const rec = { v: 1 as const, checkedAt: 0, prayers: [{ id: A, postedAt: T0, count: 5, seen: 5 }] };
    expect(applyCounts(rec, [{ id: A, prayerCount: 3 }], T0).prayers[0].count).toBe(5);
  });
});

describe('prayedCard: shows only on growth, for the rest of that day, never after 14 days', () => {
  const today = '2026-10-05';
  const tomorrow = '2026-10-06';

  it('nothing while nobody has prayed (or the kind is off and the server said [])', async () => {
    rememberMyPrayer(A, T0);
    await refreshMyPrayers({ now: T0, fetchImpl: okFetch([]) });
    expect(prayedCard(readMyPrayers(T0), today, T0)).toBeNull();
  });

  it('grows → shows; seen → stays today; next day hidden; grows again → shows', async () => {
    rememberMyPrayer(A, T0);
    await refreshMyPrayers({ now: T0, fetchImpl: okFetch([{ id: A, prayerCount: 4 }]) });
    const card = prayedCard(readMyPrayers(T0), today, T0);
    expect(card).toEqual({ id: A, count: 4 });
    noteCardShown(card!, today, T0);
    expect(prayedCard(readMyPrayers(T0), today, T0)).toEqual({ id: A, count: 4 });
    expect(prayedCard(readMyPrayers(T0 + DAY), tomorrow, T0 + DAY)).toBeNull();
    await refreshMyPrayers({ now: T0 + DAY, fetchImpl: okFetch([{ id: A, prayerCount: 5 }]) });
    expect(prayedCard(readMyPrayers(T0 + DAY), tomorrow, T0 + DAY)).toEqual({ id: A, count: 5 });
  });

  it('stops 14 days after the request was posted, whatever the count', async () => {
    rememberMyPrayer(A, T0);
    await refreshMyPrayers({ now: T0, fetchImpl: okFetch([{ id: A, prayerCount: 9 }]) });
    const late = T0 + MY_PRAYERS_DAYS * DAY;
    expect(prayedCard(readMyPrayers(late), '2026-10-19', late)).toBeNull();
  });

  it('the newest request with news wins', async () => {
    rememberMyPrayer(A, T0);
    rememberMyPrayer(B, T0 + 1000);
    await refreshMyPrayers({ now: T0 + 2000, fetchImpl: okFetch([{ id: A, prayerCount: 2 }, { id: B, prayerCount: 1 }]) });
    expect(prayedCard(readMyPrayers(T0 + 2000), today, T0 + 2000)).toEqual({ id: B, count: 1 });
  });
});

describe('See your request', () => {
  it('hands the Campus tab one request to open the Prayer Wall, once', () => {
    requestPrayerWall();
    expect(takePrayerWallRequest()).toBe('');
    expect(takePrayerWallRequest()).toBeNull();
  });
});
