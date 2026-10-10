/**
 * Generates the Kuliah Hub app icon (SVG + PNG).
 *
 * Design concept: "The Academic Cap"
 *   - Indigo rounded-square background (brand accent #4f46e5)
 *   - A clean, bold white graduation cap (mortarboard + cap base)
 *   - An amber tassel with ball (warmth, achievement, unique accent)
 *
 * The graduation cap is the universal symbol for college/academic life.
 * The indigo background matches the app's primary brand color.
 * The amber tassel adds a pop of warmth and distinguishes this icon
 * from generic education icons.
 *
 * Files follow Next.js App Router file conventions:
 *   src/app/icon.svg       → favicon (SVG, modern browsers)
 *   src/app/icon.png       → favicon (PNG, 512×512)
 *   src/app/apple-icon.png → apple touch icon (180×180)
 * Also copies to public/ for direct URL access.
 */
import sharp from 'sharp'
import { writeFileSync, copyFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = join(__dirname, '..')
const appDir = join(rootDir, 'src', 'app')
const publicDir = join(rootDir, 'public')

// ── Palette ──────────────────────────────────────────────────────────
const C = {
  indigo:   '#4f46e5',   // brand accent (globals.css --accent)
  white:    '#ffffff',
  amber:    '#f59e0b',   // tassel accent
}

// ── Canvas ───────────────────────────────────────────────────────────
const SIZE   = 512
const RADIUS = 112

// ── Graduation cap geometry ──────────────────────────────────────────
// Mortarboard (rhombus / flat square top, viewed at angle)
const mb = {
  top:    { x: 256, y: 155 },
  right:  { x: 406, y: 232 },
  bottom: { x: 256, y: 309 },
  left:   { x: 106, y: 232 },
  center: { x: 256, y: 232 },
}

// Cap base (the head part, hangs below mortarboard)
// Starts from points on the lower edges of the rhombus
const cap = {
  leftTop:  { x: 196, y: 278 },
  leftBot:  { x: 196, y: 345 },
  rightBot: { x: 316, y: 345 },
  rightTop: { x: 316, y: 278 },
  // Cubic bezier control points for the bottom curve
  cp1: { x: 226, y: 380 },
  cp2: { x: 286, y: 380 },
}

// Button (at center of mortarboard)
const button = { cx: 256, cy: 232, r: 11 }

// Tassel (cord + ball, hangs from button to lower-right)
const tassel = {
  // Cord: quadratic bezier from button, curving down-right
  start:  { x: 256, y: 232 },
  cp:     { x: 310, y: 248 },
  end:    { x: 368, y: 318 },
  cordWidth: 8,
  // Ball at the end
  ballCx: 368,
  ballCy: 318,
  ballR:  14,
}

// ── Build SVG ────────────────────────────────────────────────────────
function buildSVG() {
  const parts = []

  parts.push(
    `<svg width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}" xmlns="http://www.w3.org/2000/svg">`
  )

  // Background — indigo rounded square
  parts.push(`<rect width="${SIZE}" height="${SIZE}" rx="${RADIUS}" fill="${C.indigo}"/>`)

  // Cap base (drawn first so mortarboard overlaps on top)
  parts.push(
    `<path d="M ${cap.leftTop.x} ${cap.leftTop.y} ` +
    `L ${cap.leftBot.x} ${cap.leftBot.y} ` +
    `C ${cap.cp1.x} ${cap.cp1.y}, ${cap.cp2.x} ${cap.cp2.y}, ${cap.rightBot.x} ${cap.rightBot.y} ` +
    `L ${cap.rightTop.x} ${cap.rightTop.y} Z" ` +
    `fill="${C.white}"/>`
  )

  // Mortarboard (rhombus, filled white)
  parts.push(
    `<path d="M ${mb.left.x} ${mb.left.y} ` +
    `L ${mb.top.x} ${mb.top.y} ` +
    `L ${mb.right.x} ${mb.right.y} ` +
    `L ${mb.bottom.x} ${mb.bottom.y} Z" ` +
    `fill="${C.white}"/>`
  )

  // Button (indigo circle at center of mortarboard — looks like a cutout)
  parts.push(
    `<circle cx="${button.cx}" cy="${button.cy}" r="${button.r}" fill="${C.indigo}"/>`
  )

  // Tassel cord (amber, curved)
  parts.push(
    `<path d="M ${tassel.start.x} ${tassel.start.y} ` +
    `Q ${tassel.cp.x} ${tassel.cp.y}, ${tassel.end.x} ${tassel.end.y}" ` +
    `stroke="${C.amber}" stroke-width="${tassel.cordWidth}" ` +
    `stroke-linecap="round" fill="none"/>`
  )

  // Tassel ball (amber circle at end of cord)
  parts.push(
    `<circle cx="${tassel.ballCx}" cy="${tassel.ballCy}" r="${tassel.ballR}" fill="${C.amber}"/>`
  )

  parts.push(`</svg>`)
  return parts.join('\n')
}

// ── Generate files ───────────────────────────────────────────────────
const svg = buildSVG()
const svgPath = join(appDir, 'icon.svg')
writeFileSync(svgPath, svg, 'utf-8')
console.log(`✓ SVG saved: ${svgPath}`)

// PNG 512×512 — main favicon
const pngPath = join(appDir, 'icon.png')
await sharp(Buffer.from(svg))
  .png()
  .toFile(pngPath)
console.log(`✓ PNG saved: ${pngPath}`)

// Apple touch icon 180×180
const applePath = join(appDir, 'apple-icon.png')
await sharp(Buffer.from(svg))
  .resize(180, 180)
  .png()
  .toFile(applePath)
console.log(`✓ Apple touch icon saved: ${applePath}`)

// Copies in public/ for direct URL access
mkdirSync(publicDir, { recursive: true })
copyFileSync(svgPath, join(publicDir, 'icon.svg'))
copyFileSync(pngPath, join(publicDir, 'icon.png'))
copyFileSync(applePath, join(publicDir, 'apple-icon.png'))
console.log(`✓ Copies saved to public/`)

console.log('\nDone!')
