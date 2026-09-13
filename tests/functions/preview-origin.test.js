/**
 * Read-only content functions (esv.js, bolls.js, …) must accept this site's own
 * Netlify deploy-preview / branch-deploy origins — `lib/cors.js` already allows
 * them via `isAllowedOrigin` / `getAllowedOrigin`, but these functions used to
 * run their own raw `ALLOWED_ORIGINS.includes(origin)` check, which 403'd a
 * deploy preview and broke the owner-preview scripture/audio gate.
 *
 * NOTE: this file lives in tests/, never in netlify/functions/. Netlify treats
 * every file in the functions directory as a function and rejects the name.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

const PREVIEW_ORIGIN = 'https://deploy-preview-109--futures-daily-word.netlify.app';
const EVIL_ORIGIN = 'https://evil.example';
const LOOKALIKE_ORIGIN = 'https://deploy-preview-109--futures-daily-word.netlify.app.evil.example';

function event({ origin, query = {} }) {
  return {
    httpMethod: 'GET',
    headers: origin ? { origin } : {},
    queryStringParameters: query,
  };
}

describe('esv.js — deploy-preview origins are not refused', () => {
  let handler;
  const esvFetch = vi.fn();

  beforeEach(() => {
    process.env.ESV_API_KEY = 'test-esv-key';
    ({ handler } = require('../../netlify/functions/esv.js'));
    esvFetch.mockReset();
    esvFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ canonical: 'John 3:16', passages: ['[16] For God so loved the world...'] }),
    });
    vi.stubGlobal('fetch', esvFetch);
  });

  afterEach(() => { vi.unstubAllGlobals(); });

  it('does not refuse a deploy-preview origin', async () => {
    const res = await handler(event({ origin: PREVIEW_ORIGIN, query: { q: 'John 3:16' } }));
    expect(res.statusCode).not.toBe(403);
    expect(res.statusCode).toBe(200);
  });

  it('still refuses an unrelated origin', async () => {
    const res = await handler(event({ origin: EVIL_ORIGIN, query: { q: 'John 3:16' } }));
    expect(res.statusCode).toBe(403);
    expect(esvFetch).not.toHaveBeenCalled();
  });

  it('still refuses a look-alike origin that merely starts with the preview host', async () => {
    const res = await handler(event({ origin: LOOKALIKE_ORIGIN, query: { q: 'John 3:16' } }));
    expect(res.statusCode).toBe(403);
    expect(esvFetch).not.toHaveBeenCalled();
  });
});

describe('bolls.js — deploy-preview origins are not refused', () => {
  let handler;
  const bollsFetch = vi.fn();

  beforeEach(() => {
    ({ handler } = require('../../netlify/functions/bolls.js'));
    bollsFetch.mockReset();
    bollsFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [{ verse: 16, text: 'For God so loved the world...' }],
    });
    vi.stubGlobal('fetch', bollsFetch);
  });

  afterEach(() => { vi.unstubAllGlobals(); });

  it('does not refuse a deploy-preview origin', async () => {
    const res = await handler(event({ origin: PREVIEW_ORIGIN, query: { q: 'John 3' } }));
    expect(res.statusCode).not.toBe(403);
    expect(res.statusCode).toBe(200);
  });

  it('still refuses an unrelated origin', async () => {
    const res = await handler(event({ origin: EVIL_ORIGIN, query: { q: 'John 3' } }));
    expect(res.statusCode).toBe(403);
    expect(bollsFetch).not.toHaveBeenCalled();
  });

  it('still refuses a look-alike origin that merely starts with the preview host', async () => {
    const res = await handler(event({ origin: LOOKALIKE_ORIGIN, query: { q: 'John 3' } }));
    expect(res.statusCode).toBe(403);
    expect(bollsFetch).not.toHaveBeenCalled();
  });
});
