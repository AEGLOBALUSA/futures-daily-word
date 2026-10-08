#!/usr/bin/env node
// Web text size codemod (TEXT-SIZE-PLAN step 1). Idempotent: a second run finds nothing to do.
//
//   node codemod-text-px.mjs [dirs...] [--dry-run | --write | --check] [--report file.md|file.json]
//        [--fs-import @/lib/mos/text-size/text-scale-core]
//
//   CSS   font-size: Npx    -> calc(Npx * var(--mos-ts, 1))           (24px+: var(--mos-ts-display))
//         line-height: Npx  -> calc(Npx * var(--mos-ts, 1))           (follows its block's font-size kind)
//   TW    text-[Npx]        -> text-fs-N  (whole N 8-96; the preset / @theme defines them)  else text-[length:...]
//         text-[Npx]/[Mpx]  -> line-height modifier scaled too;  leading-[Npx] -> leading-[calc(...)]
//   JSX   fontSize: 13 | '13px' inside style={{ }} or a CSSProperties object -> fontSize: fs(13)
//   CSS   --*-font-size / --*-text-size / --*-(title|section|caption|heading|body|label|display|lead)-size: Npx
//         custom properties -> calc(Npx * var(--mos-ts, 1))  (a design system's type tokens, e.g. MultiplyOS UI v1)
//   Typing fields (a CSS rule whose selector ends on input/textarea/select/[contenteditable], or text-[Npx] /
//         style={{ fontSize }} on an <input>/<textarea>/<select> tag) get max(var(--mos-field-floor, 0px), ...):
//         --mos-field-floor is 16px once a step is chosen (html[data-mos-text]) and unset at Default, so Default is
//         exactly today's size and a chosen step never puts a field under 16px (iPhone zooms on focus below it).
//         A field rule sized 1em (it follows its parent) gets the same floor: max(var(--mos-field-floor, 0px), 1em).
//         lineHeight: '20px' there -> lineHeight: lh(20)   (number lineHeight is a multiplier: left alone)
// Never touched: html/:root font-size (also html[...], html:has(...), :root[...]: the rem base), rem/em, spacing, hit areas, React Native files, emails, PDFs, exports,
// canvas, SVG, and any line with `mos-text-ignore` (a file with `mos-text-ignore-file`).
// Default renders exactly as before: every value is exactly N px when --mos-ts is 1.
import { pathToFileURL } from 'node:url';
import { IGNORE_LINE, addImport, importFor, lineOf, lineText, parseArgs, runCodemod } from './codemod-shared.mjs';

export const WEB_EXTS = ['.css', '.scss', '.less', '.pcss', '.tsx', '.jsx', '.ts', '.js', '.mjs', '.html', '.vue', '.svelte', '.astro'];
export const DEFAULT_FS_IMPORT = '@/lib/mos/text-size/text-scale-core';

const HEADING = 24, FS_MIN = 8, FS_MAX = 96;
const fmt = n => String(Math.round(Number(n) * 10000) / 10000);

/** The CSS value for design size N px (kept equal to text-scale-core.ts fs(); a test proves it). */
export function fsCss(n, compact = false) {
  const px = `${fmt(n)}px`;
  const sp = compact ? '' : ' ';
  const v = (name) => `var(${name},${sp}1)`;
  return `calc(${px}${sp}*${sp}${v(n >= HEADING ? '--mos-ts-display' : '--mos-ts')})`;
}

/**
 * Typing fields (input, textarea, select, contenteditable) never go under 16px at a chosen step: iPhone zooms on
 * focus below it. The floor is a variable that mos-text.css sets only on html[data-mos-text] (a chosen step), so at
 * Default the field is exactly its design size (Connect AU step 5: Default must be a 0-pixel diff).
 */
export const FIELD_FLOOR = 16;
export const FIELD_FLOOR_VAR = 'var(--mos-field-floor, 0px)';
export function fieldCss(n, compact = false) {
  const sp = compact ? '' : ' ';
  return `max(${compact ? FIELD_FLOOR_VAR.replace(/\s+/g, '') : FIELD_FLOOR_VAR},${sp}${fsCss(n, compact)})`;
}

/** A design system's type-size custom property (MultiplyOS UI v1: --mos-font-size, --mos-title-size, ...). */
export const TYPE_SIZE_PROP = /^--[\w-]*?(?:font-size|text-size|(?:title|section|caption|heading|body|label|display|lead)-size)$/i;

/** Drop the insides of every (...) so a selector can be split on its own commas and combinators. */
function flattenParens(sel) {
  let s = sel, prev;
  do { prev = s; s = s.replace(/\([^()]*\)/g, '()'); } while (s !== prev);
  return s;
}

/**
 * The rule's subject is the document root (html, html[...], html:has(...), :root, :root[...]): its font-size is the
 * rem base, which spacing and hit areas hang off. Any comma group that is the root counts.
 */
export function selectorIsRoot(selector) {
  return flattenParens(selector).split(',').some(g => {
    const last = g.trim().split(/\s*[\s>+~]\s*/).filter(Boolean).pop() || '';
    return /^(html|:root)(?![\w-])/i.test(last);
  });
}

/**
 * The rule's subject names a typing field somewhere in its last compound, including inside :is() / :where()
 * (MultiplyOS UI v1: `.mos-shell__main :is(.mo-field, input:not([type=checkbox]), select, textarea)`). Fields only
 * mentioned inside :not() do not count.
 */
export function subjectMentionsField(selector) {
  const groups = splitTop(selector, ',');
  return groups.some(g => {
    const parts = splitTop(g.trim(), ' >+~').filter(Boolean);
    let last = parts.pop() || '';
    let prev;
    do { prev = last; last = last.replace(/:not\((?:[^()]|\([^()]*\))*\)/gi, ''); } while (last !== prev);
    return /(^|[\s,(])(input|textarea|select)(?![\w-])|\[contenteditable|\.mo-field(?![\w-])/i.test(last)
      && !/\[type=["']?(checkbox|radio|range|color|hidden|button|submit|reset|image|file)["']?\]\s*$/i.test(last);
  });
}

/** Split on any of `seps` at paren/bracket depth 0. */
function splitTop(s, seps) {
  const out = [];
  let depth = 0, cur = '';
  for (const c of s) {
    if (c === '(' || c === '[') depth++;
    else if (c === ')' || c === ']') depth--;
    if (depth === 0 && seps.includes(c)) { out.push(cur); cur = ''; continue; }
    cur += c;
  }
  out.push(cur);
  return out;
}

const FIELD_SEL = /(^|[\s>+~,(])(input|textarea|select)\b|\[contenteditable/i;
/** Every comma group of the selector ends on a typing field. */
export function selectorIsField(selector) {
  const groups = selector.split(',').map(g => g.trim()).filter(Boolean);
  if (!groups.length) return false;
  return groups.every(g => {
    const last = g.split(/\s*[\s>+~]\s*/).filter(Boolean).pop() || '';
    return FIELD_SEL.test(' ' + last) && !/\[type=["']?(checkbox|radio|range|color|hidden|button|submit|reset|image|file)/i.test(last);
  });
}

/** True when the match at idx sits inside the opening tag of <input>, <textarea> or <select>. */
export function inFieldTag(src, idx) {
  const lt = src.lastIndexOf('<', idx);
  if (lt < 0) return false;
  const seg = src.slice(lt, idx);
  if (!/^<(input|textarea|select)\b/i.test(seg)) return false;
  return !/>/.test(seg.replace(/=>/g, ''));
}

export function lhCss(n, heading = false, compact = false) {
  const sp = compact ? '' : ' ';
  return `calc(${fmt(n)}px${sp}*${sp}var(${heading ? '--mos-ts-display' : '--mos-ts'},${sp}1))`;
}

function blockAround(src, idx) {
  const open = src.lastIndexOf('{', idx);
  const closeBefore = src.lastIndexOf('}', idx);
  if (open < 0 || closeBefore > open) return null;
  const close = src.indexOf('}', idx);
  let selStart = Math.max(src.lastIndexOf('}', open - 1), src.lastIndexOf('{', open - 1), src.lastIndexOf(';', open - 1)) + 1;
  return { selector: src.slice(selStart, open).replace(/\/\*[\s\S]*?\*\//g, '').trim(), body: src.slice(open + 1, close < 0 ? src.length : close) };
}

function isHeadingBlock(body) {
  if (/font-size\s*:\s*calc\(\s*[\d.]+px\s*\*\s*var\(--mos-ts-display/.test(body)) return true;
  const m = /font-size\s*:\s*(\d*\.?\d+)px/.exec(body);
  return !!m && Number(m[1]) >= HEADING;
}

const CSS_DECL = /(^|[\s;{"'`(])(font-size|line-height)(\s*:\s*)(\d*\.?\d+)px(\s*!important)?(?=\s*(?:;|}|$|"|'|`|\)))/gim;
const CSS_PROP = /(^|[\s;{"'`(])(--[\w-]+)(\s*:\s*)(\d*\.?\d+)px(\s*!important)?(?=\s*(?:;|}|$|"|'|`|\)))/gim;
const CSS_FIELD_EM = /(^|[\s;{"'`(])(font-size)(\s*:\s*)1em(\s*!important)?(?=\s*(?:;|}|$|"|'|`|\)))/gim;
const TW = /(^|[\s"'`{(,])((?:[\w-]+:|\[[^\]\s]+\]:)*!?)(text|leading)-\[(\d*\.?\d+)px\](?:\/\[(\d*\.?\d+)px\])?(?=$|[\s"'`},)\]])/gm;

export function transformWeb(src, fileAbs = '', opts = {}) {
  const counts = {};
  const manual = [];
  const bump = k => { counts[k] = (counts[k] || 0) + 1; };
  const isNative = /from\s+['"]react-native['"]/.test(src);
  if (isNative) return { src, counts, manual };
  let out = src;

  // 1. CSS declarations (stylesheets, <style> blocks, CSS-in-JS templates).
  out = out.replace(CSS_DECL, (all, pre, prop, colon, num, imp = '', offset) => {
    const n = Number(num);
    if (!(n > 0)) return all;
    if (IGNORE_LINE.test(lineText(out, offset))) return all;
    const blk = blockAround(out, offset);
    if (prop.toLowerCase() === 'font-size') {
      if (blk && selectorIsRoot(blk.selector)) return all; // never the root size (the rem base)
      if (blk && selectorIsField(blk.selector)) { bump('cssFieldFontSize'); return `${pre}${prop}${colon}${fieldCss(n)}${imp}`; }
      bump('cssFontSize');
      return `${pre}${prop}${colon}${fsCss(n)}${imp}`;
    }
    bump('cssLineHeight');
    return `${pre}${prop}${colon}${lhCss(n, blk ? isHeadingBlock(blk.body) : false)}${imp}`;
  });

  // 1b. Type-size custom properties (a design system's tokens): --mos-font-size: 13px -> calc(13px * var(--mos-ts, 1)).
  out = out.replace(CSS_PROP, (all, pre, prop, colon, num, imp = '', offset) => {
    const n = Number(num);
    if (!(n > 0) || !TYPE_SIZE_PROP.test(prop)) return all;
    if (IGNORE_LINE.test(lineText(out, offset))) return all;
    bump('cssTypeToken');
    return `${pre}${prop}${colon}${fsCss(n)}${imp}`;
  });

  // 1c. A typing field sized 1em follows its parent; at a chosen step it floors at 16px like every other field.
  out = out.replace(CSS_FIELD_EM, (all, pre, prop, colon, imp = '', offset) => {
    if (IGNORE_LINE.test(lineText(out, offset))) return all;
    const blk = blockAround(out, offset);
    if (!blk || !subjectMentionsField(blk.selector)) return all;
    bump('cssFieldEm');
    return `${pre}${prop}${colon}max(${FIELD_FLOOR_VAR}, 1em)${imp}`;
  });

  // 2. Tailwind arbitrary sizes.
  out = out.replace(TW, (all, pre, variants, util, num, lhNum, offset) => {
    const n = Number(num);
    if (!(n > 0)) return all;
    if (IGNORE_LINE.test(lineText(out, offset))) return all;
    if (util === 'leading') { bump('twLeading'); return `${pre}${variants}leading-[${lhCss(n, false, true)}]`; }
    const field = inFieldTag(out, offset);
    bump(field ? 'twFieldText' : 'twText');
    const cls = field ? `text-[length:${fieldCss(n, true)}]`
      : Number.isInteger(n) && n >= FS_MIN && n <= FS_MAX ? `text-fs-${n}` : `text-[length:${fsCss(n, true)}]`;
    const mod = lhNum ? `/[${lhCss(Number(lhNum), n >= HEADING, true)}]` : '';
    return `${pre}${variants}${cls}${mod}`;
  });

  // 3. JSX / CSSProperties inline sizes.
  if (/\.(tsx|jsx|ts|js|mjs)$/.test(fileAbs) || opts.forceJs) {
    const res = transformInline(out, fileAbs, opts, bump, manual);
    out = res;
  }

  // Report what is left for a person.
  const scan = (re, kind) => { for (const m of out.matchAll(re)) { if (!IGNORE_LINE.test(lineText(out, m.index))) manual.push({ line: lineOf(out, m.index), kind, text: lineText(out, m.index).trim().slice(0, 140) }); } };
  scan(/(^|[\s;{])font\s*:\s*[^;{}\n]*\d+px/gm, 'font shorthand with px');
  scan(/font-size\s*:\s*\d*\.?\d+r?em\b/g, 'font-size in rem/em');
  return { src: out, counts, manual };
}

function matchBrace(src, open) {
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    const c = src[i];
    if (c === '"' || c === "'" || c === '`') {
      const q = c;
      for (i++; i < src.length && src[i] !== q; i++) if (src[i] === '\\') i++;
      continue;
    }
    if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) return i; }
  }
  return -1;
}

function styleRanges(src) {
  const ranges = [];
  const starts = [
    /\bstyle\s*=\s*\{\s*\{/g,
    /:\s*(?:React\.)?CSSProperties\s*=\s*\{/g,
    /:\s*Record<\s*string\s*,\s*(?:React\.)?CSSProperties\s*>\s*=\s*\{/g,
    /:\s*\{\s*\[\s*\w+\s*:\s*string\s*\]\s*:\s*(?:React\.)?CSSProperties\s*\}\s*=\s*\{/g,
  ];
  for (const re of starts) for (const m of src.matchAll(re)) {
    const open = m.index + m[0].length - 1;
    const close = matchBrace(src, open);
    if (close > open) ranges.push([open, close]);
  }
  for (const m of src.matchAll(/\}\s*(?:as\s+const\s+)?satisfies\s+(?:React\.)?CSSProperties\b/g)) {
    // walk back to the matching '{'
    let depth = 0;
    for (let i = m.index; i >= 0; i--) {
      if (src[i] === '}') depth++;
      else if (src[i] === '{') { depth--; if (depth === 0) { ranges.push([i, m.index]); break; } }
    }
  }
  return ranges;
}

const JSX_FS = /\bfontSize(\s*:\s*)(?:(\d*\.?\d+)|(['"])(\d*\.?\d+)px\3)(?=\s*[,}\n])/g;
const JSX_LH = /\blineHeight(\s*:\s*)(['"])(\d*\.?\d+)px\2(?=\s*[,}\n])/g;

function transformInline(src, fileAbs, opts, bump, manual) {
  const ranges = styleRanges(src);
  const inRange = i => ranges.some(([a, b]) => i > a && i < b);
  const edits = [];
  for (const m of src.matchAll(JSX_FS)) {
    if (IGNORE_LINE.test(lineText(src, m.index))) continue;
    const n = Number(m[2] ?? m[4]);
    if (!inRange(m.index)) { manual.push({ line: lineOf(src, m.index), kind: 'fontSize outside a style object (chart, SVG or theme?)', text: lineText(src, m.index).trim().slice(0, 140) }); continue; }
    if (!(n > 0)) continue;
    const field = inFieldTag(src, m.index);
    edits.push({ at: m.index, len: m[0].length, text: `fontSize${m[1]}${field ? '@@FIELD@@' : '@@FS@@'}(${fmt(n)})`, fn: field ? 'fieldFs' : 'fs' });
  }
  for (const m of src.matchAll(JSX_LH)) {
    if (!inRange(m.index) || IGNORE_LINE.test(lineText(src, m.index))) continue;
    const n = Number(m[3]);
    if (!(n > 0)) continue;
    edits.push({ at: m.index, len: m[0].length, text: `lineHeight${m[1]}@@LH@@(${fmt(n)})`, fn: 'lh' });
  }
  if (!edits.length) return src;
  const spec = importFor(fileAbs, opts['fs-import'] || DEFAULT_FS_IMPORT);
  const specRe = spec.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
  const need = new Set(edits.map(e => e.fn));
  const names = {};
  // A clash with another `fs` / `lh` (node:fs, a local) gets the kit's under another name.
  for (const fn of need) {
    const own = new RegExp(`import\\s*\\{[^}]*\\b${fn}(\\s+as\\s+(\\w+))?\\b[^}]*\\}\\s*from\\s*['"]${specRe}['"]`).exec(src);
    if (own) { names[fn] = own[2] || fn; continue; }
    const clash = new RegExp(`\\bimport\\s+(\\*\\s+as\\s+)?${fn}\\b|\\b(const|let|var|function)\\s+${fn}\\b|import\\s*\\{[^}]*\\b${fn}\\b[^}]*\\}\\s*from`).test(src);
    names[fn] = clash ? `mos${fn[0].toUpperCase()}${fn.slice(1)}` : fn;
  }
  let out = src;
  for (const e of edits.sort((a, b) => b.at - a.at)) {
    out = out.slice(0, e.at) + e.text.replace('@@FS@@', names.fs).replace('@@LH@@', names.lh).replace('@@FIELD@@', names.fieldFs) + out.slice(e.at + e.len);
    bump(e.fn === 'fs' ? 'jsxFontSize' : e.fn === 'fieldFs' ? 'jsxFieldFontSize' : 'jsxLineHeight');
  }
  const missing = [...need].filter(fn => !new RegExp(`import\\s*\\{[^}]*\\b${fn}\\b[^}]*\\}\\s*from\\s*['"]${specRe}['"]`).test(out));
  if (missing.length) {
    const existing = new RegExp(`import\\s*\\{([^}]*)\\}\\s*from\\s*(['"])${specRe}\\2;?`).exec(out);
    const specs = missing.map(fn => (names[fn] === fn ? fn : `${fn} as ${names[fn]}`));
    if (existing) {
      const merged = existing[1].split(',').map(s => s.trim()).filter(Boolean).concat(specs).join(', ');
      out = out.slice(0, existing.index) + `import { ${merged} } from ${existing[2]}${spec}${existing[2]};` + out.slice(existing.index + existing[0].length);
    } else {
      const quote = /from\s+"/.test(out) && !/from\s+'/.test(out) ? '"' : "'";
      const semi = !/^import\s/m.test(out) || /^import\s[^\n]*;\s*$/m.test(out) ? ';' : '';
      out = addImport(out, `import { ${specs.join(', ')} } from ${quote}${spec}${quote}${semi}`).src;
    }
  }
  return out;
}

export function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv, ['report', 'fs-import']);
  const { diff, summary } = runCodemod({ name: 'codemod-text-px', args, exts: WEB_EXTS, transform: transformWeb });
  if (args.mode !== 'write') process.stdout.write(diff);
  const t = Object.entries(summary.totals).map(([k, v]) => `${k} ${v}`).join(', ') || 'nothing';
  process.stderr.write(`codemod-text-px: ${summary.scanned} files scanned, ${summary.changed} ${args.mode === 'write' ? 'changed' : 'to change'} (${t}); ${summary.manual.length} left for a person; ${summary.skipped.length} skipped.\n`);
  if (args.mode === 'check' && summary.changed) process.exitCode = 1;
  return summary;
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) main();
