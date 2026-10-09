// @vitest-environment node
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { expect, it, vi } from 'vitest';

it.each(['index-Ab12cd34.js', 'screen-Ab_cd-12.js', 'index-_-abCD12.css', 'chunk-ab12_CD-_.js'])(
  'serves %s from the worker cache after the network disappears', async name => {
    const handlers = {};
    const entries = new Map();
    const cache = {
      match: vi.fn(async request => entries.get(request.url)),
      put: vi.fn(async (request, response) => { entries.set(request.url, response); }),
    };
    const fetcher = vi.fn(async () => new Response('asset bytes'));
    runInNewContext(readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8'), {
      self: { addEventListener: (event, callback) => { handlers[event] = callback; } },
      caches: { open: vi.fn(async () => cache), match: vi.fn(async () => undefined) },
      fetch: fetcher, URL, Response,
    });
    const request = new Request(`https://futuresdailyword.com/assets/${name}`);
    let answer;
    const event = { request, respondWith: result => { answer = result; } };
    handlers.fetch(event);
    expect(await (await answer).text()).toBe('asset bytes');
    fetcher.mockRejectedValue(new Error('offline'));
    handlers.fetch(event);
    expect(await (await answer).text()).toBe('asset bytes');
    expect(fetcher).toHaveBeenCalledTimes(1);
  },
);
