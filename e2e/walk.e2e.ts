import { test, expect } from '@playwright/test';
import { walkApp } from './helpers/walk';

// Runs the whole deterministic persona/tab/theme walk-through against ONE
// built app and writes screenshots + per-view metadata to WALK_OUT_DIR. This
// file never judges "did the app get worse" — that comparison (PR app vs
// base app) is scripts/visual/report.mjs, run after this has produced results
// for both apps. This test only fails on a hard runner problem.
test('walk-through captures every view', async ({ browser }) => {
  const baseURL = process.env.WALK_BASE_URL;
  const outDir = process.env.WALK_OUT_DIR;
  if (!baseURL || !outDir) {
    throw new Error('WALK_BASE_URL and WALK_OUT_DIR must be set (see scripts/visual/smoke.mjs)');
  }

  const result = await walkApp(browser, baseURL, outDir);
  expect(result.views.length).toBeGreaterThan(0);
});
