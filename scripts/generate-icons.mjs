/**
 * generate-icons.mjs
 * Generates all favicon and OG image assets for futuresdailyword.com.
 *
 * Brand palette (from src/index.css):
 *   --dw-text / cream:  #F2EDE5  → favicon background, OG foreground
 *   Hero card burgundy: #8B1A26  → favicon foreground, OG background, theme-color
 *
 * Run: node scripts/generate-icons.mjs
 */

import { Resvg } from '@resvg/resvg-js'
import pngToIco from 'png-to-ico'
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

// ─── Brand colors ────────────────────────────────────────────────────────────
const BURGUNDY = '#8B1A26'   // deep red — OG bg, favicon letters
const CREAM    = '#F2EDE5'   // ivory   — favicon bg, OG letters

// ─── Load DM Sans font ───────────────────────────────────────────────────────
const fontPath = resolve(ROOT, 'public/fonts/dm-sans-latin.woff2')
const fontBuffer = readFileSync(fontPath)

// ─── SVG renderer helper ─────────────────────────────────────────────────────
function renderSvg(svgString, width, height) {
  const resvg = new Resvg(svgString, {
    fitTo: { mode: 'width', value: width },
    font: {
      loadSystemFonts: false,
      fontBuffers: [fontBuffer],
    },
  })
  const rendered = resvg.render()
  return rendered.asPng()
}

// ─── Write helper ─────────────────────────────────────────────────────────────
function write(relPath, buffer) {
  const abs = resolve(ROOT, relPath)
  const dir = dirname(abs)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  writeFileSync(abs, buffer)
  const kb = (buffer.length / 1024).toFixed(1)
  console.log(`  ✓  ${relPath}  (${kb} KB)`)
}

// ─────────────────────────────────────────────────────────────────────────────
// SVG TEMPLATES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Square favicon mark: cream background, burgundy "DW"
 * viewBox 100×100, ~12% padding on each side.
 */
function faviconSvg(size) {
  // Font size chosen so "DW" fills ~76% of width with ~12% side padding.
  // At 100 units, "DW" in DM Sans Bold spans roughly 76 units wide.
  const fontSize = 56
  const y = 68  // baseline — visually centers the cap-height glyph
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100">
  <rect width="100" height="100" fill="${CREAM}"/>
  <text
    x="50" y="${y}"
    font-family="DM Sans, Arial, Helvetica, sans-serif"
    font-weight="800"
    font-size="${fontSize}"
    fill="${BURGUNDY}"
    text-anchor="middle"
    dominant-baseline="auto"
    letter-spacing="-1"
  >DW</text>
</svg>`
}

/**
 * OG/social image: burgundy background, large cream "DW", site name below.
 * 1200×630
 */
function ogSvg(width, height) {
  // "DW" height ≈ 65% of canvas height.  DM Sans cap-height ≈ 0.73em.
  // To get cap-height = 0.65*630 ≈ 410px → fontSize ≈ 410/0.73 ≈ 562
  // But at 1200 wide, "DW" at 562px might clip slightly — tune down a bit.
  const scaleFactor = height / 630
  const fontSize = Math.round(380 * scaleFactor)
  const dwY = Math.round(height * 0.62)            // baseline for "DW"
  const labelFontSize = Math.round(32 * scaleFactor)
  const labelY = Math.round(height * 0.84)         // baseline for sub-label
  const labelSpacing = Math.round(10 * scaleFactor)

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="${width}" height="${height}" fill="${BURGUNDY}"/>
  <!-- Large DW monogram -->
  <text
    x="${width / 2}" y="${dwY}"
    font-family="DM Sans, Arial, Helvetica, sans-serif"
    font-weight="800"
    font-size="${fontSize}"
    fill="${CREAM}"
    text-anchor="middle"
    dominant-baseline="auto"
    letter-spacing="${Math.round(-8 * scaleFactor)}"
  >DW</text>
  <!-- Site wordmark -->
  <text
    x="${width / 2}" y="${labelY}"
    font-family="DM Sans, Arial, Helvetica, sans-serif"
    font-weight="400"
    font-size="${labelFontSize}"
    fill="${CREAM}"
    text-anchor="middle"
    dominant-baseline="auto"
    letter-spacing="${labelSpacing}"
    opacity="0.85"
  >FUTURES DAILY WORD</text>
</svg>`
}

// ─────────────────────────────────────────────────────────────────────────────
// GENERATE FAVICON PNGS
// ─────────────────────────────────────────────────────────────────────────────
console.log('\nGenerating favicon assets…')

const faviconSizes = [16, 32, 48, 72, 96, 128, 144, 152, 180, 192, 384, 512]
const pngCache = {}

for (const size of faviconSizes) {
  const svg = faviconSvg(size)
  pngCache[size] = renderSvg(svg, size, size)
}

// public/ — browser favicon set
write('public/favicon-16x16.png',         pngCache[16])
write('public/favicon-32x32.png',         pngCache[32])
write('public/favicon-96x96.png',         pngCache[96])
write('public/apple-touch-icon.png',      pngCache[180])
write('public/android-chrome-192x192.png',pngCache[192])
write('public/android-chrome-512x512.png',pngCache[512])

// icons/ — PWA manifest icons
write('icons/icon-72.png',  pngCache[72])
write('icons/icon-96.png',  pngCache[96])
write('icons/icon-128.png', pngCache[128])
write('icons/icon-144.png', pngCache[144])
write('icons/icon-152.png', pngCache[152])
write('icons/icon-192.png', pngCache[192])
write('icons/icon-384.png', pngCache[384])
write('icons/icon-512.png', pngCache[512])

// favicon.svg — served directly for modern browsers (write the 512-unit viewBox version)
const faviconSvgSource = faviconSvg(512)
write('public/favicon.svg', Buffer.from(faviconSvgSource, 'utf8'))

// ─────────────────────────────────────────────────────────────────────────────
// GENERATE favicon.ico  (16 + 32 + 48)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\nBundling favicon.ico…')
const icoBuffer = await pngToIco([pngCache[16], pngCache[32], pngCache[48]])
write('public/favicon.ico', icoBuffer)

// ─────────────────────────────────────────────────────────────────────────────
// GENERATE OG / SOCIAL IMAGES
// ─────────────────────────────────────────────────────────────────────────────
console.log('\nGenerating OG images…')

// 1200×630 — Facebook, LinkedIn, iMessage, Slack
const og1200 = renderSvg(ogSvg(1200, 630), 1200, 630)
write('public/og-image.png', og1200)

// Also write twitter-card.png (1200×600 — very close to OG, use same canvas trimmed)
// We generate a proper 1200×600 variant
const og1200x600 = renderSvg(ogSvg(1200, 600), 1200, 600)
write('public/twitter-card.png', og1200x600)

// 1080×1080 — square (Instagram, some Slack/WhatsApp previews)
const og1080sq = renderSvg(ogSvg(1080, 1080), 1080, 1080)
write('public/og-image-square.png', og1080sq)

// ─────────────────────────────────────────────────────────────────────────────
console.log('\nDone. All assets generated successfully.\n')
