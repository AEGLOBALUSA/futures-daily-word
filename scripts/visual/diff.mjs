#!/usr/bin/env node
// Pixel-diff two screenshots for one view. A view "changed" when more than
// 0.2% of pixels differ (pixelmatch threshold 0.1) or the two images are
// different sizes.
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const CHANGED_FRACTION = 0.002; // 0.2%
const PIXELMATCH_THRESHOLD = 0.1;

/**
 * Compare two PNG screenshots. Returns { changed, fraction, sizesDiffer,
 * diffPng } where diffPng is a Buffer (only produced when sizes match).
 */
export function diffPngFiles(basePath, prPath) {
  if (!existsSync(basePath) || !existsSync(prPath)) {
    return { changed: true, fraction: 1, sizesDiffer: true, missing: true, diffPng: null };
  }
  const baseImg = PNG.sync.read(readFileSync(basePath));
  const prImg = PNG.sync.read(readFileSync(prPath));

  if (baseImg.width !== prImg.width || baseImg.height !== prImg.height) {
    return { changed: true, fraction: 1, sizesDiffer: true, missing: false, diffPng: null };
  }

  const { width, height } = baseImg;
  const diff = new PNG({ width, height });
  const diffPixels = pixelmatch(baseImg.data, prImg.data, diff.data, width, height, {
    threshold: PIXELMATCH_THRESHOLD,
  });
  const fraction = diffPixels / (width * height);
  return {
    changed: fraction > CHANGED_FRACTION,
    fraction,
    sizesDiffer: false,
    missing: false,
    diffPng: PNG.sync.write(diff),
  };
}

/**
 * CLI: node scripts/visual/diff.mjs <baseDir> <prDir> <outDiffDir>
 * Diffs every `${name}.png` that both dirs share (by reading each dir's
 * `_results.json`), writes a diff PNG per changed view into outDiffDir, and
 * prints a JSON array of { name, alpharetta, changed, fraction, sizesDiffer }
 * to stdout.
 */
async function main() {
  const [baseDir, prDir, outDiffDir] = process.argv.slice(2);
  if (!baseDir || !prDir) {
    console.error('usage: node scripts/visual/diff.mjs <baseDir> <prDir> [outDiffDir]');
    process.exit(2);
  }
  const { mkdirSync } = await import('node:fs');
  const path = await import('node:path');

  const prResults = JSON.parse(readFileSync(path.join(prDir, '_results.json'), 'utf8'));
  const baseResults = existsSync(path.join(baseDir, '_results.json'))
    ? JSON.parse(readFileSync(path.join(baseDir, '_results.json'), 'utf8'))
    : null;

  if (outDiffDir) mkdirSync(outDiffDir, { recursive: true });

  const rows = [];
  for (const view of prResults.views) {
    if (!baseResults) {
      rows.push({ name: view.name, alpharetta: view.alpharetta, changed: true, fraction: 1, sizesDiffer: true, noBase: true });
      continue;
    }
    const basePath = path.join(baseDir, view.screenshot);
    const prPath = path.join(prDir, view.screenshot);
    const result = diffPngFiles(basePath, prPath);
    if (outDiffDir && result.diffPng) {
      writeFileSync(path.join(outDiffDir, `${view.name}.diff.png`), result.diffPng);
    }
    rows.push({
      name: view.name,
      alpharetta: view.alpharetta,
      changed: result.changed,
      fraction: result.fraction,
      sizesDiffer: result.sizesDiffer,
      noBase: false,
    });
  }
  console.log(JSON.stringify(rows, null, 2));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
