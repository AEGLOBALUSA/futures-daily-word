/**
 * A 403 proof_required on the startup pull parks the cloud sync until the
 * reader types the emailed code: the returned token is kept, 'dw-proof-required'
 * fires, no retry timer is scheduled, and nothing is pushed. After
 * retrySyncAfterProof() with a 200 pull, the normal merge-and-push runs.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { syncOnStartup, retrySyncAfterProof, isProofRequired, resetSyncSession } from './cloudSync';

const EMAIL = 'reader@example.com';
const NEW_TOKEN = 'c'.repeat(64);

type Call = { action: string };
let calls: Call[];
let pullReply: () => Response;

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

beforeEach(() => {
  vi.useFakeTimers();
  resetSyncSession();
  calls = [];
  localStorage.setItem('dw_profile', JSON.stringify({ email: EMAIL }));
  localStorage.setItem('dw_journal', JSON.stringify([{ id: 'local1', date: '2026-10-01', text: 'on this phone', updatedAt: '2026-10-01T00:00:00Z' }]));
  pullReply = () => json(403, { error: 'proof_required', sessionToken: NEW_TOKEN });
  vi.stubGlobal('fetch', vi.fn(async (_url: string, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body || '{}')) as Call;
    calls.push(body);
    if (body.action === 'pull') return pullReply();
    return json(200, { success: true, syncVersion: 4 });
  }));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  resetSyncSession();
});

describe('sync parked for proof of email', () => {
  it('stores the token, announces the prompt, schedules no retry and pushes nothing', async () => {
    const heard = vi.fn();
    window.addEventListener('dw-proof-required', heard);

    await syncOnStartup(EMAIL);

    expect(heard).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('dw_session_token')).toBe(NEW_TOKEN);
    expect(isProofRequired()).toBe(true);
    expect(vi.getTimerCount()).toBe(0); // no backoff retry

    // a local edit while parked: the push is held, not sent
    const { pushToCloud } = await import('./cloudSync');
    await pushToCloud(EMAIL);
    await vi.advanceTimersByTimeAsync(10 * 60 * 1000);
    expect(calls.map(c => c.action)).toEqual(['pull']);

    // local data untouched
    expect(JSON.parse(localStorage.getItem('dw_journal') || '[]')).toHaveLength(1);
    window.removeEventListener('dw-proof-required', heard);
  });

  it('does not clear the token (a 401 would; this is a 403)', async () => {
    localStorage.setItem('dw_session_token', 'd'.repeat(64));
    pullReply = () => json(403, { error: 'proof_required' });
    await syncOnStartup(EMAIL);
    expect(localStorage.getItem('dw_session_token')).toBe('d'.repeat(64));
  });

  it('after the code is accepted, retrySyncAfterProof runs the normal merge and push', async () => {
    await syncOnStartup(EMAIL);
    expect(calls.map(c => c.action)).toEqual(['pull']);

    pullReply = () => json(200, {
      success: true,
      data: { journal: [{ id: 'cloud1', date: '2026-09-01', text: 'from the cloud', updatedAt: '2026-09-01T00:00:00Z' }], syncVersion: 3 },
    });
    await retrySyncAfterProof();

    expect(isProofRequired()).toBe(false);
    expect(calls.map(c => c.action)).toEqual(['pull', 'pull', 'push']);
    const merged = JSON.parse(localStorage.getItem('dw_journal') || '[]') as { id: string }[];
    expect(merged.map(e => e.id).sort()).toEqual(['cloud1', 'local1']);
  });

  it('any other 403 is an ordinary failure with the usual retry', async () => {
    pullReply = () => json(403, { error: 'Forbidden' });
    await syncOnStartup(EMAIL);
    expect(isProofRequired()).toBe(false);
    expect(vi.getTimerCount()).toBe(1);
  });
});
