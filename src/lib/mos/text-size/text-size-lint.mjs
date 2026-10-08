#!/usr/bin/env node
// Text size lint for every MultiplyOS repo's CI (TEXT-SIZE-PLAN step 15). Fails when text could escape the
// person's choice. It reuses both codemods' own rules, so "lint passes" means "the codemods have nothing left".
//
//   node text-size-lint.mjs [dirs...] [--fs-import ...] [--import-path ...] [--json]
//
// Errors (exit 1):
//   px-text      a px font-size / line-height, text-[Npx] / leading-[Npx], or inline fontSize the web codemod would rewrite
//   rn-text      Text / TextInput imported straight from react-native (the native codemod would move it)
//   zoom-blocked a viewport that stops pinch-zoom (user-scalable=no, maximum-scale=1, userScalable: false, maximumScale: 1)
//   attr-clash   data-mos-text-size outside Daily Word's tokens.css (the kit's attribute is data-mos-text)
// Warnings (printed, exit 0): what the codemods leave for a person (font shorthand, rem/em, chart fontSize, ...),
//   and field-under-16 (a typing field sized text-xs / text-sm / text-fs-N under 16: iPhone zooms on focus).
// Silence one line with a `mos-text-ignore` comment; a whole file with `mos-text-ignore-file`.
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { IGNORE_LINE, contentSkip, lineOf, lineText, parseArgs, walk } from './codemod-shared.mjs';
import { WEB_EXTS, transformWeb } from './codemod-text-px.mjs';
import { transformRn } from './codemod-rn-text.mjs';

const ZOOM = [
  /user-scalable\s*=\s*(?:no|0)\b/gi,
  /maximum-scale\s*=\s*1(?:\.0+)?(?![\d.])/gi,
  /\buserScalable\s*:\s*false\b/g,
  /\bmaximumScale\s*:\s*1(?:\.0+)?(?![\d.])/g,
];

export function lintSource(src, fileAbs, rel, opts = {}) {
  const problems = [];
  const add = (level, rule, line, text) => problems.push({ level, rule, file: rel, line, text: text.trim().slice(0, 160) });
  const web = transformWeb(src, fileAbs, opts);
  if (web.src !== src) {
    const a = src.split('\n'), b = web.src.split('\n');
    // Inline rewrites may add one import line at the top: report the changed lines of the original.
    const offset = b.length - a.length;
    for (let i = 0, j = 0; i < a.length; i++, j++) {
      if (a[i] === b[j]) continue;
      if (offset > 0 && a[i] === b[j + 1]) { j++; continue; }
      if (!IGNORE_LINE.test(a[i])) add('error', 'px-text', i + 1, a[i]);
    }
  }
  for (const m of web.manual) add('warning', 'manual', m.line, `${m.kind}: ${m.text}`);
  const rn = transformRn(src, fileAbs, opts);
  if (rn.src !== src) {
    for (const m of src.matchAll(/import\s+\{[^}]*\b(Text|TextInput)\b[^}]*\}\s*from\s*['"]react-native['"]/g)) {
      if (!IGNORE_LINE.test(lineText(src, m.index))) add('error', 'rn-text', lineOf(src, m.index), lineText(src, m.index));
    }
  }
  for (const m of src.matchAll(/<(input|textarea|select)\b[^>]*>/g)) {
    const small = /\btext-(xs|sm)\b/.exec(m[0]) || (/\btext-fs-(\d+)\b/.exec(m[0]) && Number(/\btext-fs-(\d+)\b/.exec(m[0])[1]) < 16 ? ['text-fs'] : null);
    if (small && !IGNORE_LINE.test(lineText(src, m.index))) add('warning', 'field-under-16', lineOf(src, m.index), `typing field sized ${small[0]}: give it max(16px, ...) or iPhone zooms on focus: ${lineText(src, m.index)}`);
  }
  for (const re of ZOOM) for (const m of src.matchAll(re)) {
    if (!IGNORE_LINE.test(lineText(src, m.index))) add('error', 'zoom-blocked', lineOf(src, m.index), lineText(src, m.index));
  }
  if (!/tokens\.css$/.test(rel)) for (const m of src.matchAll(/data-mos-text-size\b/g)) {
    if (!IGNORE_LINE.test(lineText(src, m.index))) add('error', 'attr-clash', lineOf(src, m.index), lineText(src, m.index));
  }
  return problems;
}

export function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv, ['fs-import', 'import-path']);
  const { files } = walk(args._, WEB_EXTS);
  const problems = [];
  for (const f of files) {
    if (/[\\/]text-size[\\/]/.test(f.abs)) continue; // the kit itself
    const src = readFileSync(f.abs, 'utf8');
    if (contentSkip(src)) continue;
    problems.push(...lintSource(src, f.abs, f.rel, args));
  }
  const errors = problems.filter(p => p.level === 'error');
  if (args.json) process.stdout.write(JSON.stringify({ files: files.length, errors: errors.length, problems }, null, 2) + '\n');
  else {
    for (const p of problems) process.stdout.write(`${p.file}:${p.line} ${p.level} ${p.rule} ${p.text}\n`);
    process.stdout.write(`text-size-lint: ${files.length} files, ${errors.length} errors, ${problems.length - errors.length} warnings.` +
      (errors.length ? ' Fix: node codemod-text-px.mjs --write && node codemod-rn-text.mjs --write, or mark the line mos-text-ignore.' : '') + '\n');
  }
  if (errors.length) process.exitCode = 1;
  return problems;
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) main();
