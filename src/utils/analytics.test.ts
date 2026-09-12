import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { buildActivityEvent, track } from './analytics';

describe('buildActivityEvent', () => {
  it('attaches path from dw_setup.persona', () => {
    const event = buildActivityEvent('app_open', 'hello', { path: 'comfort', journeyDay: null });
    expect(event.path).toBe('comfort');
    expect(event.journey_day).toBeUndefined();
  });

  it('attaches journey_day only for new_to_faith', () => {
    const event = buildActivityEvent('journey_day_open', '', { path: 'new_to_faith', journeyDay: 3 });
    expect(event.path).toBe('new_to_faith');
    expect(event.journey_day).toBe(3);
  });

  it('omits both fields when neither is known', () => {
    const event = buildActivityEvent('app_open', '', {});
    expect(event.path).toBeUndefined();
    expect(event.journey_day).toBeUndefined();
  });
});

describe('track()', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    localStorage.clear();
    fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({}) }));
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('sends no fetch when dw_setup is absent (path stays null)', async () => {
    localStorage.setItem('dw_profile', JSON.stringify({ email: 'a@b.com' }));
    track('app_open', '');
    await vi.waitFor(() => { if (fetchMock.mock.calls.length === 0) throw new Error("waiting"); });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const call = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(call[1].body as string);
    expect(body.events[0].path).toBeUndefined();
  });

  it('attaches path and journey_day to the fetch body for new_to_faith', async () => {
    localStorage.setItem('dw_profile', JSON.stringify({ email: 'a@b.com' }));
    localStorage.setItem('dw_setup', JSON.stringify({ persona: 'new_to_faith' }));
    localStorage.setItem('dw_pathway_progress', JSON.stringify({ currentDay: 3, enrolled: true, completedDays: [] }));

    track('journey_day_open', '3');
    await vi.waitFor(() => { if (fetchMock.mock.calls.length === 0) throw new Error("waiting"); });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const call = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(call[1].body as string);
    expect(body.events[0].path).toBe('new_to_faith');
    expect(body.events[0].journey_day).toBe(3);
  });

  it('produces no fetch for a non-allowlisted event name', async () => {
    localStorage.setItem('dw_profile', JSON.stringify({ email: 'a@b.com' }));
    track('not_a_real_event', '');
    await new Promise((r) => setTimeout(r, 50));
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
