/**
 * DW-P08: the reading week line. The comparison shows only when readers moved
 * by 15% or more from the week before; a clause with nothing to say is left
 * out; a 403 or 400 hides the line rather than erroring; nothing but the four
 * counts and the campus is kept from the answer.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { getReadingWeek, parseReadingWeek, readingWeekComparison, readingWeekLine, type ReadingWeek } from './readingWeekApi';

afterEach(() => { vi.unstubAllGlobals(); });

function answer(status: number, body: unknown) {
  const fetchMock = vi.fn(async () => ({ ok: status >= 200 && status < 300, status, json: async () => body }));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

const WEEK: ReadingWeek = { campusId: 'au-paradise', campusName: 'Paradise', readers: 212, firstTime: 31, startedJourney: 4, prevReaders: 168 };

describe('readingWeekComparison: one comparison, only at 15% or more', () => {
  it('shows at exactly 15% up or down, and not below', () => {
    expect(readingWeekComparison(115, 100)).toEqual({ direction: 'up', prevReaders: 100 });
    expect(readingWeekComparison(85, 100)).toEqual({ direction: 'down', prevReaders: 100 });
    expect(readingWeekComparison(114, 100)).toBeNull();
    expect(readingWeekComparison(86, 100)).toBeNull();
    expect(readingWeekComparison(100, 100)).toBeNull();
  });

  it('the spec example: 212 against 168 is up (26%)', () => {
    expect(readingWeekComparison(212, 168)).toEqual({ direction: 'up', prevReaders: 168 });
  });

  it('small campuses: 1 against 2 is down; 3 against 3 is nothing', () => {
    expect(readingWeekComparison(1, 2)).toEqual({ direction: 'down', prevReaders: 2 });
    expect(readingWeekComparison(3, 3)).toBeNull();
  });

  it('no week before (0) gives no comparison; a fall to 0 does', () => {
    expect(readingWeekComparison(12, 0)).toBeNull();
    expect(readingWeekComparison(0, 5)).toEqual({ direction: 'down', prevReaders: 5 });
  });

  it('bad numbers never make a comparison up', () => {
    expect(readingWeekComparison(Number.NaN, 10)).toEqual({ direction: 'down', prevReaders: 10 });
    expect(readingWeekComparison(10, -4)).toBeNull();
  });
});

describe('readingWeekLine: the clauses worked out from the counts', () => {
  it('the full sentence: readers, first time, started, and the comparison', () => {
    expect(readingWeekLine(WEEK)).toEqual({
      campusName: 'Paradise', readers: 212, firstTime: 31, startedJourney: 4,
      comparison: { direction: 'up', prevReaders: 168 },
    });
  });

  it('a clause with nothing to say is left out (null)', () => {
    expect(readingWeekLine({ ...WEEK, firstTime: 0, startedJourney: 0, prevReaders: 200 })).toEqual({
      campusName: 'Paradise', readers: 212, firstTime: null, startedJourney: null, comparison: null,
    });
  });
});

describe('parseReadingWeek and getReadingWeek', () => {
  it('keeps the campus and the four counts only', () => {
    expect(parseReadingWeek({ campusId: 'au-paradise', campusName: 'Paradise', readers: 3, first_time: 1, started_journey: 0, prev_readers: 2, email: 'leak@example.org' }))
      .toEqual({ campusId: 'au-paradise', campusName: 'Paradise', readers: 3, firstTime: 1, startedJourney: 0, prevReaders: 2 });
    expect(parseReadingWeek({ readers: 3 })).toBeNull();
    expect(parseReadingWeek(null)).toBeNull();
  });

  it('asks for the named campus, or for none (the server picks his own)', async () => {
    const f = answer(200, { campusId: 'us-kennesaw', campusName: 'Kennesaw', readers: 9, first_time: 0, started_journey: 0, prev_readers: 9 });
    expect((await getReadingWeek('us-kennesaw'))?.readers).toBe(9);
    expect(JSON.parse((f.mock.calls[0] as unknown as [string, { body: string }])[1].body)).toEqual({ action: 'reading_week', campusId: 'us-kennesaw' });
    await getReadingWeek();
    expect(JSON.parse((f.mock.calls[1] as unknown as [string, { body: string }])[1].body)).toEqual({ action: 'reading_week' });
  });

  it('403 and 400 hide the line (null); a 500 throws so the screen can say so', async () => {
    answer(403, { error: 'no', code: 'other_campus' });
    expect(await getReadingWeek('us-kennesaw')).toBeNull();
    answer(400, { error: 'Choose a campus.', code: 'campus' });
    expect(await getReadingWeek()).toBeNull();
    answer(500, { error: 'The reading week did not load.', code: 'server' });
    await expect(getReadingWeek()).rejects.toThrow('did not load');
  });
});
