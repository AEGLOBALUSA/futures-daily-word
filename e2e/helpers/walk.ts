import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { Browser } from '@playwright/test';
import { installMocks } from './mockRoutes';
import { buildViews, type ViewDef } from './personas';

const FIXED_NOW = '2026-09-23T14:00:00.000Z'; // a fixed Wednesday

const TAB_LABEL: Record<string, string> = {
  home: 'Home',
  journal: 'Notes',
  messages: 'Campus',
  plans: 'Plans',
  more: 'Settings',
};

export interface ViewIssues {
  name: string;
  alpharetta: boolean;
  pageErrors: string[];
  consoleErrors: string[];
  rawKeyTokens: string[];
  hasHorizontalOverflow: boolean;
  renderFailed: boolean;
  screenshot: string; // relative path, within outDir
}

export interface WalkResult {
  baseURL: string;
  views: ViewIssues[];
  unmatchedRequests: string[];
}

function personaLocalStorage(view: ViewDef) {
  const dw_setup = { persona: view.persona, source: 'settings' };
  const dw_profile = {
    email: 'reader@example.com',
    firstName: 'Sam',
    lastName: '',
    phone: '',
    church: '',
    city: '',
    campus: view.campus,
  };
  const dw_reading_slots = [{ id: 'slot-1', book: 'John', currentChapter: 3 }];
  const entries: [string, string][] = [
    ['dw_setup', JSON.stringify(dw_setup)],
    ['dw_profile', JSON.stringify(dw_profile)],
    ['dw_cookie_consent', 'accepted'],
    ['dw_v7_pathway_done', 'true'],
    ['dw_reading_slots', JSON.stringify(dw_reading_slots)],
    ['dw_chapters_per_day', '1'],
    ['dw_translation', 'KJV'],
    ['dw_dark', view.theme === 'dark' ? 'true' : 'false'],
  ];
  if (view.persona === 'new_to_faith') {
    entries.push(['dw_pathway_progress', JSON.stringify({ enrolled: true, currentDay: 1, completedDays: [] })]);
  }
  if (view.staffSignedIn) {
    entries.push(['dw_staff_token', 'test-token-0000000000000000000000000000000000000000']);
    entries.push(['dw_staff_app_signin', '1']);
  }
  return entries;
}

/**
 * Runs the full deterministic walk-through against one built app (served at
 * baseURL) and writes a screenshot + a small metadata record per view into
 * outDir. Returns the collected issues so a caller can either assert on them
 * directly (single-app smoke) or diff two runs (PR vs base).
 */
export async function walkApp(browser: Browser, baseURL: string, outDir: string): Promise<WalkResult> {
  mkdirSync(outDir, { recursive: true });
  const views = buildViews();
  const results: ViewIssues[] = [];
  const unmatchedSet = new Set<string>();

  for (const view of views) {
    const issue = await withTimeout(
      runView(browser, baseURL, outDir, view, unmatchedSet),
      40_000,
      view.name,
    );
    writeFileSync(path.join(outDir, `${view.name}.json`), JSON.stringify(issue, null, 2));
    results.push(issue);
  }

  const result: WalkResult = { baseURL, views: results, unmatchedRequests: Array.from(unmatchedSet) };
  writeFileSync(path.join(outDir, '_results.json'), JSON.stringify(result, null, 2));
  return result;
}

/**
 * A single view must never be allowed to hang the whole walk (an app bug that
 * spins the main thread, e.g. a fetch/re-render loop, can make Playwright's
 * actionability waits block far longer than any of their own per-call
 * timeouts would suggest). If runView doesn't settle within `capMs`, record it
 * as a render failure and move on — the browser/context it leaked behind get
 * cleaned up when the whole browser closes at the end of the run.
 */
async function withTimeout(promise: Promise<ViewIssues>, capMs: number, name: string): Promise<ViewIssues> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<ViewIssues>((resolve) => {
    timer = setTimeout(() => resolve({
      name,
      alpharetta: false,
      pageErrors: [`view timed out after ${capMs}ms — likely an app-side hang (infinite fetch/render loop)`],
      consoleErrors: [],
      rawKeyTokens: [],
      hasHorizontalOverflow: false,
      renderFailed: true,
      screenshot: `${name}.png`,
    }), capMs);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

async function runView(
  browser: Browser,
  baseURL: string,
  outDir: string,
  view: ViewDef,
  unmatchedSet: Set<string>,
): Promise<ViewIssues> {
    const context = await browser.newContext({
      baseURL,
      viewport: { width: 390, height: 844 },
      colorScheme: view.theme,
      reducedMotion: 'reduce',
      // The app registers a Workbox service worker; block it so every request
      // stays visible to page.route() (a live SW would otherwise serve its own
      // offline fallbacks instead of our fixtures).
      serviceWorkers: 'block',
    });

    const pageErrors: string[] = [];
    const consoleErrors: string[] = [];

    const page = await context.newPage();
    page.on('pageerror', (err) => pageErrors.push(String(err?.message || err)));
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await page.clock.install({ time: new Date(FIXED_NOW) });

    await installMocks(page, {
      staff: { signedIn: !!view.staffSignedIn },
      onUnmatched: (url) => unmatchedSet.add(url),
    });

    const entries = personaLocalStorage(view);
    await context.addInitScript((pairs) => {
      for (const [k, v] of pairs) {
        try { window.localStorage.setItem(k, v); } catch { /* ignore */ }
      }
    }, entries);

    const target = view.staffRoute ? '/staff' : '/';
    let renderFailed = false;
    try {
      await page.goto(target, { waitUntil: 'load', timeout: 12000 });
      // Let boot-time effects (staff session restore, persona re-stamp) settle
      // before driving the UI — clicking immediately on load can race them.
      await page.waitForTimeout(600);

      if (!view.staffRoute) {
        const label = TAB_LABEL[view.tab];
        const tabButton = page.locator(`[aria-label="${label}"]`).first();
        if (await tabButton.count()) {
          // A signed-in pastor's boot restore (restoreStaffSession →
          // applyStaffIdentity) lands shortly after first paint and can race a
          // tab click made right away — click, then confirm (and retry once)
          // rather than trust a single click.
          await tabButton.click({ timeout: 2000 }).catch(() => {});
          const landed = await page
            .waitForFunction((tab) => document.body.dataset.activeTab === tab, view.tab, { timeout: 2000 })
            .then(() => true)
            .catch(() => false);
          if (!landed) {
            await tabButton.click({ timeout: 2000 }).catch(() => {});
            await page
              .waitForFunction((tab) => document.body.dataset.activeTab === tab, view.tab, { timeout: 2000 })
              .catch(() => {});
          }
        }

        if (view.tab === 'messages' && view.campusSubTab) {
          const subLabel = view.campusSubTab === 'pastor' ? "Pastor's Corner" : 'Prayer Wall';
          const subButton = page.getByRole('button', { name: subLabel }).first();
          try {
            await subButton.waitFor({ state: 'visible', timeout: 2000 });
            await subButton.click({ timeout: 2000 });
          } catch { /* campus tab didn't land — surfaces as a render/content issue below */ }
        }

        if (view.clickAlpharettaSubTab) {
          // Scope to the active Campus tab panel so this never matches a
          // same-named control elsewhere (e.g. Home's own location switcher)
          // if the tab switch above didn't land.
          const onCampusTab = await page.evaluate(() => document.body.dataset.activeTab === 'messages');
          if (onCampusTab) {
            const alpharettaButton = page.getByRole('button', { name: 'Alpharetta', exact: true }).first();
            try {
              await alpharettaButton.waitFor({ state: 'visible', timeout: 1000 });
              await alpharettaButton.click({ timeout: 1000 });
            } catch { /* not present on this branch — expected on main */ }
          }
        }
      }

      await page.waitForTimeout(300);
      await page.evaluate(() => document.fonts && document.fonts.ready).catch(() => {});
    } catch (err) {
      pageErrors.push(`navigation failed: ${String((err as Error)?.message || err)}`);
      renderFailed = true;
    }

    let rawKeyTokens: string[] = [];
    let hasHorizontalOverflow = false;
    let mainTextLength = 0;
    let hasErrorBoundaryCard = false;

    try {
      const evalResult = await page.evaluate(() => {
        function visibleText(node: Node, out: string[]) {
          if (node.nodeType === Node.TEXT_NODE) {
            const t = node.textContent || '';
            if (t.trim()) out.push(t);
            return;
          }
          if (node.nodeType !== Node.ELEMENT_NODE) return;
          const el = node as Element;
          const style = window.getComputedStyle(el);
          if (style.display === 'none' || style.visibility === 'hidden') return;
          for (const child of Array.from(node.childNodes)) visibleText(child, out);
        }
        const texts: string[] = [];
        visibleText(document.body, texts);
        const joined = texts.join(' ');
        return {
          texts,
          joined,
          scrollWidth: document.documentElement.scrollWidth,
          innerWidth: window.innerWidth,
        };
      });

      const tokenPattern = /\b[a-z]+(?:_[a-z0-9]+){1,}\b/g;
      const found = new Set<string>();
      for (const chunk of evalResult.texts) {
        if (/^https?:\/\//.test(chunk) || chunk.includes('@')) continue;
        const matches = chunk.match(tokenPattern);
        if (matches) matches.forEach((m) => found.add(m));
      }
      rawKeyTokens = Array.from(found);
      hasHorizontalOverflow = evalResult.scrollWidth > evalResult.innerWidth + 1;
      mainTextLength = evalResult.joined.replace(/\s+/g, ' ').trim().length;
      hasErrorBoundaryCard = evalResult.joined.includes('Something went wrong');
    } catch { /* page may have failed to load at all */ }

    if (!renderFailed && (mainTextLength < 20 || hasErrorBoundaryCard)) {
      renderFailed = true;
    }

    const screenshotRel = `${view.name}.png`;
    try {
      await page.screenshot({ path: path.join(outDir, screenshotRel), fullPage: true });
    } catch { /* best effort */ }

    const issue: ViewIssues = {
      name: view.name,
      alpharetta: !!view.alpharetta,
      pageErrors,
      consoleErrors,
      rawKeyTokens,
      hasHorizontalOverflow,
      renderFailed,
      screenshot: screenshotRel,
    };

    await context.close().catch(() => {});
    return issue;
}
