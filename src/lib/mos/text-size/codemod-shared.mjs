// Shared plumbing for codemod-text-px.mjs, codemod-rn-text.mjs and text-size-lint.mjs: which files to walk,
// which to skip, flags, the line diff, the report, and the per-file import path.
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, extname, join, relative, resolve, sep } from 'node:path';

/** Directories never walked. */
export const SKIP_DIRS = new Set([
  'node_modules', '.git', '.next', '.turbo', '.vercel', '.netlify', '.expo', '.cache', 'dist', 'build', 'out',
  'coverage', 'vendor', 'ios', 'android', 'Pods', 'storybook-static', 'playwright-report', 'test-results',
]);

/**
 * Paths that are not screens: emails, PDFs, exports, canvas drawing, SVG. A path segment that names one of these
 * is skipped (and listed in the report so a person can see it).
 */
export const SKIP_SEGMENT = /(e-?mails?|mail-?templates?|pdfs?|exports?|canvas|svgs?)/i;
/**
 * File contents that mark a non-screen file (PDF and email renderers, canvas drawing). `mso-…:` is Outlook-only CSS, so a
 * file carrying it builds an email by hand (Connect AU lib/mos-prompt/monday.ts): email clients drop var(), never rewrite it.
 */
export const SKIP_CONTENT = /@react-pdf\/renderer|\bjspdf\b|\bpdfkit\b|pdf-lib|@react-email\/|react-email|\bmjml\b|getContext\(\s*['"]2d['"]\s*\)|\bmso-[a-z-]+\s*:/;
export const IGNORE_FILE = /mos-text-ignore-file/;
export const IGNORE_LINE = /mos-text-ignore(?!-file)/;

export function parseArgs(argv, valueFlags = []) {
  const out = { _: [], mode: 'dry-run' };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dry-run') out.mode = 'dry-run';
    else if (a === '--write') out.mode = 'write';
    else if (a === '--check') out.mode = 'check';
    else if (a.startsWith('--')) {
      const [k, inline] = a.slice(2).split('=');
      if (valueFlags.includes(k)) out[k] = inline ?? argv[++i];
      else out[k] = inline ?? true;
    } else out._.push(a);
  }
  if (!out._.length) out._.push('.');
  return out;
}

/** Every file under the roots with one of the extensions, with the reason any was skipped. */
export function walk(roots, exts) {
  const files = [];
  const skipped = [];
  const visit = (p, root) => {
    let st;
    try { st = statSync(p); } catch { return; }
    const rel = relative(process.cwd(), p) || p;
    if (st.isDirectory()) {
      const base = p.split(sep).pop();
      if (SKIP_DIRS.has(base)) return;
      if (p !== root && SKIP_SEGMENT.test(base)) { skipped.push({ file: rel + sep, why: 'email/PDF/export/canvas/SVG folder' }); return; }
      for (const e of readdirSync(p).sort()) visit(join(p, e), root);
      return;
    }
    if (!exts.includes(extname(p))) return;
    if (SKIP_SEGMENT.test(p.split(sep).pop().replace(/\.[^.]+$/, ''))) { skipped.push({ file: rel, why: 'email/PDF/export/canvas/SVG file' }); return; }
    files.push({ abs: p, rel: relative(process.cwd(), p) || p });
  };
  for (const r of roots) visit(resolve(r), resolve(r));
  return { files, skipped };
}

/** Content-level skip reason, or null. */
export function contentSkip(src) {
  if (IGNORE_FILE.test(src)) return 'mos-text-ignore-file';
  const m = SKIP_CONTENT.exec(src);
  return m ? `not a screen (${m[0].trim()})` : null;
}

/**
 * The import specifier to write into `fileAbs`: an alias ("@/lib/...") as given; a path ("./lib/..", "/abs/..")
 * made relative to the file, without extension.
 */
export function importFor(fileAbs, spec) {
  if (!spec.startsWith('.') && !spec.startsWith('/')) return spec;
  let r = relative(dirname(fileAbs), resolve(spec)).split(sep).join('/').replace(/\.(tsx?|jsx?|mjs)$/, '');
  if (!r.startsWith('.')) r = './' + r;
  return r;
}

/** Add an import line after the last top-of-file import (or after a 'use client' / 'use server' directive). */
export function addImport(src, line) {
  const lines = src.split('\n');
  let at = 0;
  let i = 0;
  // Skip leading comments/blank lines and directives.
  while (i < lines.length) {
    const t = lines[i].trim();
    if (t === '' || t.startsWith('//') || t.startsWith('/*') || t.startsWith('*') || t.startsWith('*/')) { i++; continue; }
    if (/^['"]use (client|server|strict)['"];?$/.test(t)) { i++; at = i; continue; }
    break;
  }
  // After the last import statement in the leading import block (multi-line imports included).
  let j = i;
  while (j < lines.length) {
    const t = lines[j].trim();
    if (t.startsWith('import ') || t === 'import') {
      let k = j;
      while (k < lines.length && !/from\s+['"][^'"]+['"];?\s*$|^import\s+['"][^'"]+['"];?\s*$/.test(lines[k].trim())) k++;
      j = k + 1; at = j; continue;
    }
    if (t === '' || t.startsWith('//')) { j++; continue; }
    break;
  }
  lines.splice(at, 0, line);
  return { src: lines.join('\n'), line: at };
}

/** A line diff for transforms that only change lines in place plus optionally insert lines (recorded). */
export function lineDiff(rel, before, after) {
  if (before === after) return '';
  const a = before.split('\n');
  const b = after.split('\n');
  // Align by longest common subsequence on the changed middle (prefix/suffix trimmed); files are small enough.
  let p = 0;
  while (p < a.length && p < b.length && a[p] === b[p]) p++;
  let s = 0;
  while (s < a.length - p && s < b.length - p && a[a.length - 1 - s] === b[b.length - 1 - s]) s++;
  const A = a.slice(p, a.length - s), B = b.slice(p, b.length - s);
  const out = [`--- a/${rel}`, `+++ b/${rel}`];
  if (A.length * B.length > 4e6) {
    out.push(`@@ -${p + 1},${A.length} +${p + 1},${B.length} @@`, ...A.map(l => '-' + l), ...B.map(l => '+' + l));
    return out.join('\n') + '\n';
  }
  const n = A.length, m = B.length;
  const dp = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
  for (let x = n - 1; x >= 0; x--) for (let y = m - 1; y >= 0; y--) dp[x][y] = A[x] === B[y] ? dp[x + 1][y + 1] + 1 : Math.max(dp[x + 1][y], dp[x][y + 1]);
  let x = 0, y = 0;
  while (x < n || y < m) {
    if (x < n && y < m && A[x] === B[y]) { x++; y++; continue; }
    const start = `@@ line ${p + x + 1} @@`;
    const minus = [], plus = [];
    while ((x < n || y < m) && !(x < n && y < m && A[x] === B[y])) {
      if (y >= m || (x < n && dp[x + 1][y] >= dp[x][y + 1])) minus.push('-' + A[x++]);
      else plus.push('+' + B[y++]);
    }
    out.push(start, ...minus, ...plus);
  }
  return out.join('\n') + '\n';
}

/** Run a per-file transform over the walk, honouring --dry-run / --write / --check and --report. */
export function runCodemod({ name, args, exts, transform }) {
  const { files, skipped } = walk(args._, exts);
  const totals = {};
  const manual = [];
  const changed = [];
  let diff = '';
  for (const f of files) {
    const src = readFileSync(f.abs, 'utf8');
    const why = contentSkip(src);
    if (why) { skipped.push({ file: f.rel, why }); continue; }
    const res = transform(src, f.abs, args);
    for (const [k, v] of Object.entries(res.counts || {})) totals[k] = (totals[k] || 0) + v;
    for (const m of res.manual || []) manual.push({ file: f.rel, ...m });
    if (res.src !== src) {
      changed.push(f.rel);
      diff += lineDiff(f.rel, src, res.src);
      if (args.mode === 'write') writeFileSync(f.abs, res.src);
    }
  }
  const summary = { tool: name, mode: args.mode, roots: args._, scanned: files.length, changed: changed.length, totals, changedFiles: changed, manual, skipped };
  if (args.report) writeReport(args.report, summary);
  return { diff, summary };
}

export function writeReport(path, s) {
  if (path.endsWith('.json')) { writeFileSync(path, JSON.stringify(s, null, 2) + '\n'); return; }
  const lines = [
    `# ${s.tool} report`, '',
    `Mode: ${s.mode}. Roots: ${s.roots.join(', ')}. Files scanned: ${s.scanned}. Files ${s.mode === 'write' ? 'changed' : 'to change'}: ${s.changed}.`, '',
    '## Rewrites by kind', '',
    ...(Object.keys(s.totals).length ? Object.entries(s.totals).map(([k, v]) => `- ${k}: ${v}`) : ['- none']), '',
    '## Left for a person (not rewritten)', '',
    ...(s.manual.length ? s.manual.map(m => `- ${m.file}:${m.line} ${m.kind}: \`${m.text}\``) : ['- none']), '',
    '## Skipped files', '',
    ...(s.skipped.length ? s.skipped.map(k => `- ${k.file}: ${k.why}`) : ['- none']), '',
    '## Files', '',
    ...(s.changedFiles.length ? s.changedFiles.map(f => `- ${f}`) : ['- none']), '',
  ];
  writeFileSync(path, lines.join('\n'));
}

export function lineOf(src, index) {
  let n = 1;
  for (let i = 0; i < index && i < src.length; i++) if (src.charCodeAt(i) === 10) n++;
  return n;
}

export function lineText(src, index) {
  const s = src.lastIndexOf('\n', index - 1) + 1;
  const e = src.indexOf('\n', index);
  return src.slice(s, e < 0 ? src.length : e);
}
