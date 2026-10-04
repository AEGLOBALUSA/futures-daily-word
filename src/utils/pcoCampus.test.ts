import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { lookupPcoCampus, __resetPcoCampusForTests, PCO_LOOKUP_URL } from './pcoCampus';

function answer(body: unknown, ok = true) {
  return vi.fn(async () => ({ ok, json: async () => body }) as Response);
}

beforeEach(() => {
  localStorage.clear();
  __resetPcoCampusForTests();
});
afterEach(() => { vi.useRealTimers(); });

describe('lookupPcoCampus (B09-07F)', () => {
  it('asks pco-sync to look her up (never sync, which would save) and gives the campus id', async () => {
    const f = answer({ found: true, profile: { firstName: 'Test', campus: 'us-gwinnett', campusName: 'Gwinnett' } });
    expect(await lookupPcoCampus(' Reader@Example.com ', f)).toBe('us-gwinnett');
    expect(f).toHaveBeenCalledTimes(1);
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(PCO_LOOKUP_URL);
    expect(init.method).toBe('POST');
    expect(JSON.parse(String(init.body))).toEqual({ action: 'lookup', email: 'reader@example.com' });
  });

  it('carries her session token when she has one', async () => {
    localStorage.setItem('dw_session_token', 'tok-123');
    const f = answer({ found: false });
    await lookupPcoCampus('reader@example.com', f);
    const init = (f.mock.calls[0] as unknown as [string, RequestInit])[1];
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tok-123');
  });

  it('no match, no campus on her record, or a campus that is not an id: no campus', async () => {
    expect(await lookupPcoCampus('a@example.com', answer({ found: false }))).toBeNull();
    expect(await lookupPcoCampus('b@example.com', answer({ found: true, profile: { campus: '' } }))).toBeNull();
    expect(await lookupPcoCampus('c@example.com', answer({ found: true, profile: { campus: '<script>' } }))).toBeNull();
  });

  it('asks once per email per page load', async () => {
    const f = answer({ found: true, profile: { campus: 'us-kennesaw' } });
    await lookupPcoCampus('reader@example.com', f);
    expect(await lookupPcoCampus('READER@example.com', f)).toBe('us-kennesaw');
    expect(f).toHaveBeenCalledTimes(1);
  });

  it('a refusal or a dropped connection is no campus, and the next open tries again', async () => {
    const limited = answer({ error: 'Too many requests' }, false);
    expect(await lookupPcoCampus('reader@example.com', limited)).toBeNull();
    const offline = vi.fn(async () => { throw new TypeError('Failed to fetch'); });
    expect(await lookupPcoCampus('reader@example.com', offline)).toBeNull();
    const ok = answer({ found: true, profile: { campus: 'au-paradise' } });
    expect(await lookupPcoCampus('reader@example.com', ok)).toBe('au-paradise');
  });

  it('stops waiting after the time limit', async () => {
    vi.useFakeTimers();
    const never = vi.fn(() => new Promise<Response>(() => {}));
    const p = lookupPcoCampus('reader@example.com', never, 4000);
    await vi.advanceTimersByTimeAsync(4000);
    expect(await p).toBeNull();
  });

  it('no email, or not an email: nothing is asked', async () => {
    const f = answer({ found: true, profile: { campus: 'us-kennesaw' } });
    expect(await lookupPcoCampus('', f)).toBeNull();
    expect(await lookupPcoCampus('not-an-email', f)).toBeNull();
    expect(f).not.toHaveBeenCalled();
  });
});
