#!/usr/bin/env node
// Text size audit (Playwright): every page at every step, on a phone (375x812) and a desktop (1280x800).
//
//   node text-size-audit.mjs --base http://localhost:3000 --paths /account,/people [--out text-size-proof]
//        [--storage-state signed-in.json] [--compare <earlier out dir>] [--playwright <path to playwright pkg>]
//
// Screenshots: <out>/<phone|desktop>/<page>/<step>.png (full page).
// At 50% and 150% it fails on: sideways scroll, clipped text (overflow hidden/clip cutting text off),
// the step not applied (no pre-paint script), and on the phone any tap target under 44px (inline links inside
// running text are exempt). Ellipsis / line-clamp truncation is a warning.
// --compare: Default must be pixel-identical to an earlier run (take that run before the codemod).
// The cookie is set for the base URL's host, the way the pre-paint script reads it. Exit 1 on any error.
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';
import { inflateSync } from 'node:zlib';
import { pathToFileURL } from 'node:url';

export const STEPS = ['xs50', 's65', 's80', 's90', 'default', 'l115', 'l130', 'l150'];
export const VIEWPORTS = {
  phone: { viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  desktop: { viewport: { width: 1280, height: 800 }, isMobile: false, hasTouch: false, deviceScaleFactor: 1 },
};
// The two ends: 50% (Ashley: "i want text size to go down to 50%") and 150%.
const CHECKED = new Set(['xs50', 'l150']);

function parse(argv) {
  const o = { paths: '/', out: 'text-size-proof' };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const [k, v] = a.slice(2).split('=');
    o[k] = v ?? argv[++i];
  }
  if (!o.base) throw new Error('text-size-audit: --base <url> is required');
  return o;
}

async function loadPlaywright(hint) {
  const tries = [];
  if (hint) tries.push(hint);
  if (process.env.MOS_PLAYWRIGHT) tries.push(process.env.MOS_PLAYWRIGHT);
  tries.push('playwright', '@playwright/test');
  const req = createRequire(join(process.cwd(), 'noop.js'));
  for (const t of tries) {
    try { const m = req(t.startsWith('/') || t.startsWith('.') ? resolve(t) : t); if (m.chromium) return m; } catch { /* next */ }
  }
  throw new Error('text-size-audit: Playwright not found. Run it in an app that has playwright installed, or pass --playwright <path>.');
}

// In-page checks (runs in the browser).
function pageChecks({ phone }) {
  const out = { sideways: false, scrollWidth: 0, innerWidth: 0, clipped: [], truncated: [], smallTargets: [], attr: null };
  const de = document.documentElement;
  out.attr = de.getAttribute('data-mos-text');
  out.scrollWidth = Math.max(de.scrollWidth, document.body ? document.body.scrollWidth : 0);
  // The layout viewport (clientWidth), not innerWidth: a phone browser zooms out to fit a too-wide page,
  // which makes innerWidth grow with the page and hides the sideways scroll.
  out.innerWidth = de.clientWidth;
  out.sideways = out.scrollWidth > de.clientWidth + 1;
  const visible = el => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && Number(cs.opacity) > 0; };
  const label = el => { const t = (el.innerText || el.value || el.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' '); return `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}${el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : ''} "${t.slice(0, 40)}"`; };
  for (const el of document.querySelectorAll('body *')) {
    if (!visible(el)) continue;
    const hasText = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
    if (!hasText) continue;
    const cs = getComputedStyle(el);
    const clipsX = /hidden|clip/.test(cs.overflowX) && el.scrollWidth > el.clientWidth + 1;
    const clipsY = /hidden|clip/.test(cs.overflowY) && el.scrollHeight > el.clientHeight + 1;
    if (!clipsX && !clipsY) continue;
    const intended = cs.textOverflow === 'ellipsis' || (cs.webkitLineClamp && cs.webkitLineClamp !== 'none');
    (intended ? out.truncated : out.clipped).push(label(el));
  }
  if (phone) {
    const sel = 'a[href], button, input:not([type=hidden]), select, textarea, summary, [role=button], [role=link], [role=radio], [role=tab], [role=checkbox], [role=switch], [role=menuitem]';
    for (const el of document.querySelectorAll(sel)) {
      if (!visible(el)) continue;
      const cs = getComputedStyle(el);
      if (el.tagName === 'A' && cs.display === 'inline' && el.parentElement && /^(P|LI|SPAN|TD|DD|LABEL|SMALL|EM|STRONG)$/.test(el.parentElement.tagName)) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 44 - 0.5 || r.height < 44 - 0.5) out.smallTargets.push(`${label(el)} ${Math.round(r.width)}x${Math.round(r.height)}`);
    }
  }
  return out;
}

// ---------- tiny PNG decoder (8-bit RGB/RGBA, non-interlaced: what Chromium writes) ----------
export function decodePng(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error('not a PNG');
  let off = 8, w = 0, h = 0, ct = 0, bd = 0;
  const idat = [];
  while (off < buf.length) {
    const len = buf.readUInt32BE(off); const type = buf.toString('ascii', off + 4, off + 8);
    const data = buf.subarray(off + 8, off + 8 + len);
    if (type === 'IHDR') { w = data.readUInt32BE(0); h = data.readUInt32BE(4); bd = data[8]; ct = data[9]; if (data[12]) throw new Error('interlaced PNG'); }
    else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    off += 12 + len;
  }
  if (bd !== 8 || (ct !== 6 && ct !== 2)) throw new Error(`unsupported PNG (bit depth ${bd}, colour type ${ct})`);
  const bpp = ct === 6 ? 4 : 3, stride = w * bpp;
  const raw = inflateSync(Buffer.concat(idat));
  const px = Buffer.alloc(h * stride);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)], src = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1)), row = y * stride;
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? px[row + x - bpp] : 0, b = y ? px[row - stride + x] : 0, c = x >= bpp && y ? px[row - stride + x - bpp] : 0;
      let v = src[x];
      if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      px[row + x] = v & 255;
    }
  }
  return { width: w, height: h, bpp, data: px };
}

export function pixelDiff(aBuf, bBuf) {
  if (aBuf.equals(bBuf)) return { same: true, differing: 0 };
  const a = decodePng(aBuf), b = decodePng(bBuf);
  if (a.width !== b.width || a.height !== b.height) return { same: false, differing: -1, why: `size ${a.width}x${a.height} vs ${b.width}x${b.height}` };
  let differing = 0;
  for (let i = 0, j = 0; i < a.data.length; i += a.bpp, j += b.bpp) {
    if (a.data[i] !== b.data[j] || a.data[i + 1] !== b.data[j + 1] || a.data[i + 2] !== b.data[j + 2]) differing++;
  }
  return { same: differing === 0, differing };
}

const slug = p => (p.replace(/^\/+|\/+$/g, '').replace(/[^\w.-]+/g, '_') || 'home');

export async function audit(o) {
  const pw = await loadPlaywright(o.playwright);
  const base = new URL(o.base);
  const paths = String(o.paths).split(',').map(s => s.trim()).filter(Boolean);
  const steps = o.steps ? String(o.steps).split(',') : STEPS;
  const vps = o.viewports ? String(o.viewports).split(',') : Object.keys(VIEWPORTS);
  const outDir = resolve(o.out);
  const problems = [];
  const shots = [];
  const browser = await pw.chromium.launch();
  try {
    for (const vp of vps) {
      for (const step of steps) {
        const ctx = await browser.newContext({ ...VIEWPORTS[vp], ...(o['storage-state'] ? { storageState: o['storage-state'] } : {}) });
        // A whole minute, as the kit writes it (a millisecond time would be rewritten by the pre-paint script).
        await ctx.addCookies([{ name: 'mos_text', value: `${step}.${Math.floor(Date.now() / 60000) * 60000}`, url: base.origin }]);
        const page = await ctx.newPage();
        for (const p of paths) {
          const url = new URL(p, base).href;
          await page.goto(url, { waitUntil: 'networkidle' });
          await page.evaluate(() => document.fonts && document.fonts.ready);
          const dir = join(outDir, vp, slug(p));
          mkdirSync(dir, { recursive: true });
          const file = join(dir, `${step}.png`);
          await page.screenshot({ path: file, fullPage: true, animations: 'disabled', caret: 'hide' });
          shots.push(file);
          const r = await page.evaluate(pageChecks, { phone: vp === 'phone' });
          const at = `${vp} ${p} ${step}`;
          if (step !== 'default' && r.attr !== step) problems.push({ level: 'error', at, rule: 'not-applied', detail: `html[data-mos-text] is ${JSON.stringify(r.attr)} (pre-paint script missing?)` });
          if (CHECKED.has(step)) {
            if (r.sideways) problems.push({ level: 'error', at, rule: 'sideways-scroll', detail: `${r.scrollWidth}px wide in a ${r.innerWidth}px window` });
            for (const c of r.clipped) problems.push({ level: 'error', at, rule: 'clipped-text', detail: c });
            for (const c of r.truncated) problems.push({ level: 'warning', at, rule: 'truncated-text', detail: c });
            for (const c of r.smallTargets) problems.push({ level: 'error', at, rule: 'target-under-44', detail: c });
          }
          if (step === 'default' && o.compare) {
            const before = join(resolve(o.compare), vp, slug(p), 'default.png');
            if (!existsSync(before)) problems.push({ level: 'warning', at, rule: 'no-baseline', detail: before });
            else {
              const d = pixelDiff(readFileSync(before), readFileSync(file));
              if (!d.same) problems.push({ level: 'error', at, rule: 'default-changed', detail: d.why || `${d.differing} pixels differ from ${before}` });
            }
          }
        }
        await ctx.close();
      }
    }
  } finally { await browser.close(); }
  const errors = problems.filter(x => x.level === 'error').length;
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'report.json'), JSON.stringify({ base: o.base, paths, steps, viewports: vps, errors, problems, shots: shots.length }, null, 2) + '\n');
  writeFileSync(join(outDir, 'report.md'), [
    `# Text size audit`, '', `${o.base} · ${paths.join(', ')} · ${vps.join(' + ')} · ${steps.length} steps · ${shots.length} screenshots · ${errors} errors`, '',
    ...(problems.length ? problems.map(x => `- ${x.level} ${x.rule} (${x.at}): ${x.detail}`) : ['- no problems']), '',
  ].join('\n'));
  return { errors, problems, shots };
}

export async function main(argv = process.argv.slice(2)) {
  const o = parse(argv);
  const r = await audit(o);
  for (const x of r.problems) process.stdout.write(`${x.level} ${x.rule} (${x.at}): ${x.detail}\n`);
  process.stdout.write(`text-size-audit: ${r.shots.length} screenshots, ${r.errors} errors. Report: ${join(resolve(o.out), 'report.md')}\n`);
  if (r.errors) process.exitCode = 1;
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) main().catch(e => { console.error(e.message || e); process.exitCode = 2; });
