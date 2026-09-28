import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import type { Page, Route } from '@playwright/test';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = path.resolve(__dirname, '..', 'fixtures');

function loadFixture(name: string): string {
  return readFileSync(path.join(FIXTURES_DIR, name), 'utf8');
}

const CAMPUS_CONTENT = loadFixture('campus-content.json');
const PRAYER_WALL = loadFixture('prayer-wall.json');
const INTAKE_ME_PASTOR = loadFixture('intake-me-pastor.json');
const ESV = loadFixture('esv.json');
const NLT = loadFixture('nlt.json');
const BOLLS = loadFixture('bolls.json');

// Production builds bake API_BASE to the absolute https://futuresdailyword.com
// origin (see src/utils/api-base.ts — it only stays relative on localhost/
// *.netlify.app), so these fixtures are served cross-origin from the app's
// point of view. Without CORS headers the browser (and this app's Workbox
// service worker) treats the fulfilled response as a network failure and
// synthesizes its own 503 — add the header so the real fixture is used.
const CORS_HEADERS = { 'Access-Control-Allow-Origin': '*' };

function json(route: Route, body: string, status = 200) {
  return route.fulfill({
    status,
    contentType: 'application/json',
    headers: CORS_HEADERS,
    body,
  });
}

function notFound(route: Route) {
  return route.fulfill({ status: 404, contentType: 'application/json', headers: CORS_HEADERS, body: '{}' });
}

export interface StaffFixtureOptions {
  /** When true, POST /api/intake action:'me' returns the fixture pastor. Otherwise 401. */
  signedIn: boolean;
}

/**
 * Intercept every request the app can make in CI so the walk-through never
 * reaches the internet. Same-origin static files (the built dist, /bible,
 * /books, /essays, /data, /icons) pass through untouched; every /api/* and
 * /.netlify/functions/* call, plus every external host, gets a deterministic
 * fixture or a 404. Unmatched requests are logged via onUnmatched so new
 * fixtures can be added as the app grows.
 */
export async function installMocks(
  page: Page,
  opts: { staff: StaffFixtureOptions; onUnmatched?: (url: string, method: string) => void },
) {
  await page.route('**/*', async (route) => {
    const request = route.request();
    const url = new URL(request.url());

    // Same-origin static assets (JS/CSS/images/fonts/manifest/bible/books/etc.)
    // pass through to the local static server untouched.
    const isApi = url.pathname.startsWith('/api/') || url.pathname.startsWith('/.netlify/functions/');
    if (!isApi && (url.hostname === 'localhost' || url.hostname === '127.0.0.1')) {
      return route.continue();
    }

    const method = request.method();

    // ── Staff intake ──────────────────────────────────────────────────────
    if (url.pathname === '/api/intake' || url.pathname === '/.netlify/functions/intake') {
      let action = '';
      try {
        const body = request.postDataJSON() as { action?: string };
        action = body?.action || '';
      } catch { /* no body */ }
      if (action === 'me') {
        return opts.staff.signedIn ? json(route, INTAKE_ME_PASTOR) : json(route, '{}', 401);
      }
      // Any other staff action (login/auth_status/logout/...) not needed by the
      // walk-through views — return an inert 200 so callers don't throw.
      return json(route, '{}');
    }

    // ── Campus corner ─────────────────────────────────────────────────────
    if (url.pathname === '/api/campus-content') {
      return json(route, CAMPUS_CONTENT);
    }

    // ── Prayer wall ───────────────────────────────────────────────────────
    if (url.pathname === '/.netlify/functions/prayer-wall') {
      if (method === 'POST') return json(route, '{"ok":true}');
      return json(route, PRAYER_WALL);
    }

    // ── Scripture ─────────────────────────────────────────────────────────
    if (url.pathname === '/api/esv') return json(route, ESV);
    if (url.pathname === '/api/nlt') return json(route, NLT);
    if (url.pathname === '/api/bolls') return json(route, BOLLS);
    if (url.pathname === '/api/esv-audio') return notFound(route);
    if (url.pathname === '/api/polly-tts' || url.pathname === '/api/elevenlabs-tts') return notFound(route);

    // ── AI ────────────────────────────────────────────────────────────────
    if (url.pathname === '/.netlify/functions/claude') {
      return json(route, JSON.stringify({ content: [{ text: 'Fixture AI response for the visual-check walk-through.' }] }));
    }

    // ── Everything else under /api/* or /.netlify/functions/* — a 404 the
    // app is expected to handle gracefully. ──────────────────────────────
    if (isApi) {
      opts.onUnmatched?.(url.pathname + url.search, method);
      return notFound(route);
    }

    // ── Any external host (analytics beacons, preloaded hero image, ...) —
    // never reach the internet. ────────────────────────────────────────────
    opts.onUnmatched?.(request.url(), method);
    return notFound(route);
  });
}
