/**
 * netlify/functions/lib/rate-limit.js — the count-then-record pair (3 Sep 2026),
 * exercised in memory-only mode (no SUPABASE_URL in tests).
 */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const rl = require('../../netlify/functions/lib/rate-limit.js');

describe('rate limiter — count now, record later', () => {
  it('counting never spends the allowance; recording does; the window forgets', async () => {
    const id = 'addr-' + Math.random().toString(36).slice(2);
    expect(await rl.countSharedHits('t-bucket', id, 1000)).toBe(0);
    expect(await rl.countSharedHits('t-bucket', id, 1000)).toBe(0); // still 0 — a check is not a hit
    await rl.recordSharedHit('t-bucket', id);
    await rl.recordSharedHit('t-bucket', id);
    expect(await rl.countSharedHits('t-bucket', id, 1000)).toBe(2);
    expect(await rl.countSharedHits('t-bucket', id, 0)).toBe(0); // outside a zero-length window
  });

  it('isSharedRateLimited still counts the attempt itself', async () => {
    const id = 'ip-' + Math.random().toString(36).slice(2);
    expect(await rl.isSharedRateLimited('t-ip', id, 2, 1000)).toBe(false);
    expect(await rl.isSharedRateLimited('t-ip', id, 2, 1000)).toBe(false);
    expect(await rl.isSharedRateLimited('t-ip', id, 2, 1000)).toBe(true);
  });
});
