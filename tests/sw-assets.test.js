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

function loadWorker(fetcher, cache) {
  const handlers = {};
  runInNewContext(readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8'), {
    self: { addEventListener: (event, callback) => { handlers[event] = callback; } },
    caches: { open: vi.fn(async () => cache) },
    fetch: fetcher, URL, Response,
  });
  return handlers;
}
const install = async handlers => {
  let done;
  await handlers.install({ waitUntil: promise => { done = promise; } });
  await done;
};

it('precaches the built asset list on install, skipping any that fail', async () => {
  const put = vi.fn(async () => {});
  const cache = { addAll: vi.fn(async () => {}), put };
  const fetcher = vi.fn(async url => {
    if (url === '/sw-kill.json') return new Response('{}', { headers: { 'content-type': 'application/json' } });
    if (url === '/sw-assets.json') return new Response(JSON.stringify(['/assets/a-Ab12.js', '/assets/b-Cd34.css', '/assets/c-Ef56.js', '/other.js']));
    if (url === '/assets/c-Ef56.js') throw new Error('offline');
    return new Response('bytes');
  });
  await install(loadWorker(fetcher, cache));
  expect(put.mock.calls.map(call => call[0]).sort()).toEqual(['/assets/a-Ab12.js', '/assets/b-Cd34.css']);
});

it('still installs when sw-assets.json is missing', async () => {
  const cache = { addAll: vi.fn(async () => {}), put: vi.fn() };
  const fetcher = vi.fn(async url => (url === '/sw-assets.json' ? new Response('nope', { status: 404 }) : new Response('{}', { headers: { 'content-type': 'application/json' } })));
  await install(loadWorker(fetcher, cache));
  expect(cache.addAll).toHaveBeenCalledWith(['/', '/manifest.json']);
  expect(cache.put).not.toHaveBeenCalled();
});
