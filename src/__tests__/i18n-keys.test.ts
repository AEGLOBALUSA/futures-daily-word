/**
 * i18n regression guard (audit 2026-08-25, I18N-1/2):
 *  1. every key in src/utils/i18n.ts defines ALL FOUR languages (en/es/pt/id);
 *  2. every static t()/tI18n()/trans() key used in src/ actually exists, so a
 *     missing key can never render raw on screen (t() falls back to the key);
 *  3. components that receive HomeScreen's local `t` as a prop only use keys
 *     defined in HomeScreen's inline UI_STRINGS map (the 'day_label 3 of_label
 *     30' class of bug).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const SRC = join(dirname(fileURLToPath(import.meta.url)), '..');

function readSrcFiles(dir = SRC, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) readSrcFiles(p, out);
    else if (/\.(ts|tsx)$/.test(name) && !/\.test\.(ts|tsx)$/.test(name)) out.push(p);
  }
  return out;
}

// Keys + per-key languages from the shared UI map in i18n.ts.
function sharedKeys(): Map<string, string[]> {
  const src = readFileSync(join(SRC, 'utils', 'i18n.ts'), 'utf-8');
  const body = src.slice(src.indexOf('const UI: Translations = {'), src.indexOf('\n};'));
  const map = new Map<string, string[]>();
  for (const m of body.matchAll(/^ {2}([a-z0-9_]+):\s*\{(.*)\},?\s*$/gm)) {
    const langs = [...m[2].matchAll(/(?:^|[,{])\s*(en|es|pt|id):/g)].map(x => x[1]);
    map.set(m[1], langs);
  }
  return map;
}

describe('i18n key integrity', () => {
  const shared = sharedKeys();

  it('parses a plausible number of shared keys', () => {
    expect(shared.size).toBeGreaterThan(250);
  });

  it('every shared key has all four languages (en/es/pt/id)', () => {
    const incomplete: string[] = [];
    for (const [key, langs] of shared) {
      for (const l of ['en', 'es', 'pt', 'id']) {
        if (!langs.includes(l)) incomplete.push(`${key} missing ${l}`);
      }
    }
    expect(incomplete).toEqual([]);
  });

  it('every static shared-i18n lookup uses a defined key', () => {
    const bad: string[] = [];
    for (const file of readSrcFiles()) {
      const src = readFileSync(file, 'utf-8');
      // trans('key') and tI18n('key') are always the shared map.
      for (const m of src.matchAll(/\b(?:trans|tI18n)\(\s*'([a-z0-9_]+)'/g)) {
        if (!shared.has(m[1])) bad.push(`${file}: ${m[1]}`);
      }
      // t('key') is the shared map only where t is imported un-aliased from i18n.
      if (/import\s*\{[^}]*\bt\b(?!\s+as)[^}]*\}\s*from\s*'[^']*utils\/i18n'/.test(src)) {
        for (const m of src.matchAll(/(?<![A-Za-z0-9_.])t\(\s*'([a-z0-9_]+)'/g)) {
          if (!shared.has(m[1])) bad.push(`${file}: ${m[1]}`);
        }
      }
    }
    expect(bad).toEqual([]);
  });

  it('prop-t components only use keys the shared i18n map defines', () => {
    // WeeklyReviewCard takes its `t` as a prop. MeScreen supplies the shared
    // map (HomeScreen's local UI_STRINGS map went away with HomeScreen on
    // 1 Sep 2026), so a key missing from the shared map renders literally.
    const propTComponents = [
      join(SRC, 'components', 'WeeklyReviewCard.tsx'),
    ];
    const bad: string[] = [];
    for (const file of propTComponents) {
      const src = readFileSync(file, 'utf-8');
      for (const m of src.matchAll(/(?<![A-Za-z0-9_.])t\(\s*'([a-z0-9_]+)'/g)) {
        if (!shared.has(m[1])) bad.push(`${file}: ${m[1]}`);
      }
    }
    expect(bad).toEqual([]);
  });
});
