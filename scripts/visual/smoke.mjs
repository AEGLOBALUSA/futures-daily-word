#!/usr/bin/env node
// `npm run smoke` — the walk-through, run locally against one built app
// (defaults to ./dist, i.e. whatever `npm run build` just produced). Reports
// the number of views, total time, and any failures. Used standalone for a
// quick local check; the CI `smoke` job in .github/workflows/checks.yml runs
// the same walk against both the PR app and the base app and adds the visual
// diff + PR comment on top (see scripts/visual/report.mjs).
import { spawn } from 'node:child_process';
import { readFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import { serveDist } from './server.mjs';

function run(cmd, args, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: 'inherit', env: { ...process.env, ...env } });
    child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} ${args.join(' ')} exited ${code}`))));
  });
}

async function main() {
  const distDir = process.env.WALK_DIST || 'dist';
  const outDir = process.env.WALK_OUT_DIR || '.visual/smoke';
  rmSync(outDir, { recursive: true, force: true });

  const server = await serveDist(distDir);
  const start = Date.now();
  try {
    await run('npx', ['playwright', 'test', 'e2e/walk.e2e.ts'], {
      WALK_BASE_URL: server.url,
      WALK_OUT_DIR: path.resolve(outDir),
    });
  } finally {
    await server.close();
  }
  const elapsedSec = ((Date.now() - start) / 1000).toFixed(1);

  const results = JSON.parse(readFileSync(path.join(outDir, '_results.json'), 'utf8'));
  const failing = results.views.filter(
    (v) => v.renderFailed || v.pageErrors.length || v.consoleErrors.length || v.rawKeyTokens.length || v.hasHorizontalOverflow,
  );

  console.log(`\nWalk-through: ${results.views.length} views in ${elapsedSec}s`);
  if (failing.length) {
    console.log(`${failing.length} view(s) have findings:`);
    for (const v of failing) {
      const notes = [];
      if (v.renderFailed) notes.push('render failed');
      if (v.pageErrors.length) notes.push(`${v.pageErrors.length} page error(s)`);
      if (v.consoleErrors.length) notes.push(`${v.consoleErrors.length} console error(s)`);
      if (v.rawKeyTokens.length) notes.push(`raw i18n keys: ${v.rawKeyTokens.join(', ')}`);
      if (v.hasHorizontalOverflow) notes.push('horizontal overflow');
      console.log(`  - ${v.name}: ${notes.join('; ')}`);
    }
  } else {
    console.log('No findings.');
  }
  if (results.unmatchedRequests.length) {
    console.log(`\nUnmatched requests (no fixture — served 404):`);
    for (const u of results.unmatchedRequests) console.log(`  - ${u}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
