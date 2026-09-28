#!/usr/bin/env node
// Combines the PR walk-through, the base walk-through (if it built), and the
// pixel diff into (a) a pass/fail verdict for the `smoke` CI job and (b) a
// plain-English PR comment body. Writes:
//   <outDir>/comment.md   — the PR comment body (only meaningful text; caller
//                           decides whether/how to post it)
//   <outDir>/verdict.json — { pass: boolean, reasons: string[] }
// Exit code is 1 when the verdict fails, 0 otherwise, so the CI step can gate
// the job on `node scripts/visual/report.mjs ...`.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { diffPngFiles } from './diff.mjs';

function readResults(dir) {
  const p = path.join(dir, '_results.json');
  return existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : null;
}

function findingsFor(view) {
  const reasons = [];
  if (view.renderFailed) reasons.push('failed to render');
  for (const e of view.pageErrors) reasons.push(`page error: ${e}`);
  for (const e of view.consoleErrors) reasons.push(`console error: ${e}`);
  for (const t of view.rawKeyTokens) reasons.push(`raw i18n key: ${t}`);
  if (view.hasHorizontalOverflow) reasons.push('sideways scroll');
  return reasons;
}

/** Verdict: PR fails only for findings the base app did not already have. */
function buildVerdict(prResults, baseResults) {
  const reasons = [];
  const baseByName = new Map((baseResults?.views || []).map((v) => [v.name, v]));

  for (const prView of prResults.views) {
    const baseView = baseByName.get(prView.name);
    const baseFindings = new Set(baseView ? findingsFor(baseView) : []);
    const prFindings = findingsFor(prView);
    const newFindings = prFindings.filter((f) => !baseFindings.has(f));
    for (const f of newFindings) reasons.push(`${prView.name}: ${f}`);
  }

  return { pass: reasons.length === 0, reasons };
}

function buildComment({ diffRows, baseBuilt, artifactsUrl }) {
  const lines = [];
  lines.push('<!-- visual-check -->');
  lines.push('### Visual check');
  lines.push('');

  if (!baseBuilt) {
    lines.push("The base branch app couldn't be built, so only this PR's own checks ran.");
    lines.push('');
    lines.push(`[See the screenshots](${artifactsUrl})`);
    return lines.join('\n');
  }

  const changed = diffRows.filter((r) => r.changed);
  const nonAlpharetta = changed.filter((r) => !r.alpharetta);
  const alpharetta = changed.filter((r) => r.alpharetta);

  if (nonAlpharetta.length === 0) {
    lines.push('No screen outside the Alpharetta space changed.');
  } else {
    lines.push('Screens outside the Alpharetta space that look different. Every campus sees these:');
    for (const r of nonAlpharetta) lines.push(`- ${r.name} (${(r.fraction * 100).toFixed(1)}% of the screen changed)`);
  }
  if (alpharetta.length) {
    lines.push('');
    lines.push('Changed in the Alpharetta space:');
    for (const r of alpharetta) lines.push(`- ${r.name} (${(r.fraction * 100).toFixed(1)}% of the screen changed)`);
  }
  lines.push('');
  lines.push(`[See the pictures in the run's artifacts](${artifactsUrl})`);
  return lines.join('\n');
}

async function main() {
  const args = Object.fromEntries(
    process.argv.slice(2).map((a) => {
      const [k, ...rest] = a.replace(/^--/, '').split('=');
      return [k, rest.join('=')];
    }),
  );
  const prDir = args['pr-dir'];
  const baseDir = args['base-dir'];
  const diffDir = args['diff-dir'] || '.visual/diff';
  const outDir = args['out-dir'] || '.visual';
  const artifactsUrl = args['artifacts-url'] || '(artifacts tab of this run)';

  if (!prDir) {
    console.error('usage: node scripts/visual/report.mjs --pr-dir=<dir> [--base-dir=<dir>] [--diff-dir=<dir>] [--out-dir=<dir>] [--artifacts-url=<url>]');
    process.exit(2);
  }

  const prResults = readResults(prDir);
  if (!prResults) {
    console.error(`No PR results found at ${prDir}/_results.json`);
    process.exit(2);
  }
  const baseResults = baseDir ? readResults(baseDir) : null;
  const baseBuilt = !!baseResults;

  mkdirSync(diffDir, { recursive: true });
  mkdirSync(outDir, { recursive: true });

  let diffRows = [];
  if (baseBuilt) {
    for (const view of prResults.views) {
      const basePath = path.join(baseDir, view.screenshot);
      const prPath = path.join(prDir, view.screenshot);
      const result = diffPngFiles(basePath, prPath);
      if (result.diffPng) writeFileSync(path.join(diffDir, `${view.name}.diff.png`), result.diffPng);
      diffRows.push({ name: view.name, alpharetta: view.alpharetta, changed: result.changed, fraction: result.fraction, sizesDiffer: result.sizesDiffer });
    }
  }

  const verdict = buildVerdict(prResults, baseResults);
  const comment = buildComment({ diffRows, baseBuilt, artifactsUrl });

  writeFileSync(path.join(outDir, 'verdict.json'), JSON.stringify(verdict, null, 2));
  writeFileSync(path.join(outDir, 'comment.md'), comment);

  console.log(comment);
  console.log('');
  if (!verdict.pass) {
    console.log('FAIL:');
    for (const r of verdict.reasons) console.log(`  - ${r}`);
  } else {
    console.log('PASS — nothing new the base app did not already have.');
  }

  process.exit(verdict.pass ? 0 : 1);
}

main();
