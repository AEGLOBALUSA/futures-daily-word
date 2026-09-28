import { test, expect, type Page } from '@playwright/test';

// Short live check run by .github/workflows/post-deploy.yml against the real
// site (no route interception — real network, real data). Fails on a
// pageerror or a blank view. Not part of the PR walk-through (checks.yml only
// runs e2e/walk.e2e.ts) and never touches localhost fixtures.

const BASE_URL = process.env.LIVE_BASE_URL || 'https://futuresdailyword.com';

const TAB_LABELS = ['Home', 'Notes', 'Campus', 'Plans', 'Settings'];

async function checkTabs(page: Page, pageErrors: string[]) {
  await page.goto(BASE_URL, { waitUntil: 'load', timeout: 30000 });
  for (const label of TAB_LABELS) {
    const tabButton = page.locator(`[aria-label="${label}"]`).first();
    if (await tabButton.count()) {
      await tabButton.click();
      await page.waitForTimeout(500);
    }
    const text = (await page.evaluate(() => document.body.innerText || '')).trim();
    expect(text.length, `${label} tab rendered visible content`).toBeGreaterThan(20);
  }
  expect(pageErrors, `no page errors while walking ${BASE_URL}`).toEqual([]);
}

test('default reader — home, then every tab', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  const pageErrors: string[] = [];
  page.on('pageerror', (err) => pageErrors.push(String(err?.message || err)));
  await checkTabs(page, pageErrors);
  await context.close();
});

test('Alpharetta reader — home, then every tab including Campus', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  const pageErrors: string[] = [];
  page.on('pageerror', (err) => pageErrors.push(String(err?.message || err)));
  await context.addInitScript(() => {
    window.localStorage.setItem('dw_setup', JSON.stringify({ persona: 'congregation', source: 'settings' }));
    window.localStorage.setItem('dw_profile', JSON.stringify({
      email: 'reader@example.com', firstName: 'Sam', lastName: '', phone: '', church: '', city: '', campus: 'us-alpharetta',
    }));
    window.localStorage.setItem('dw_cookie_consent', 'accepted');
  });
  await checkTabs(page, pageErrors);
  await context.close();
});
