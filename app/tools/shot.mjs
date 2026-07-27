/**
 * Headless capture.
 *
 * SwiftShader gives real WebGL 2.0 with no GPU, so the scene can actually be
 * looked at on this machine instead of guessed at. It is slow — which is a
 * feature: frame-rate-dependent bugs that a fast GPU hides show up immediately.
 *
 *   node tools/shot.mjs [url] [out.png] [--w 1600] [--h 1000] [--wait 6000]
 */
import { chromium } from 'playwright'
import { mkdir } from 'node:fs/promises'
import { dirname } from 'node:path'

const args = process.argv.slice(2)
const flag = (name, dflt) => {
  const i = args.indexOf(`--${name}`)
  return i >= 0 ? args[i + 1] : dflt
}
const positional = args.filter((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1].startsWith('--')))

const url = positional[0] ?? 'http://localhost:5273/'
const out = positional[1] ?? 'shots/scene.png'
const width = Number(flag('w', 1600))
const height = Number(flag('h', 1000))
const wait = Number(flag('wait', 7000))

await mkdir(dirname(out), { recursive: true })

const browser = await chromium.launch({
  args: [
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--enable-webgl',
    '--ignore-gpu-blocklist',
    '--no-sandbox',
  ],
})
const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 })

const problems = []
page.on('console', (m) => {
  if (m.type() === 'error' || m.type() === 'warning') problems.push(`[${m.type()}] ${m.text()}`)
})
page.on('pageerror', (e) => problems.push(`[pageerror] ${e.message}`))

await page.goto(url, { waitUntil: 'networkidle', timeout: 60_000 })
// SwiftShader needs real wall-clock time to compile shaders and settle.
await page.waitForTimeout(wait)

// Jump to a point on the scroll spine. Lenis eases toward its target, so the
// jump is made instantly and then given time to arrive.
const at = flag('scroll', null)
if (at !== null) {
  await page.evaluate((frac) => {
    const max = document.documentElement.scrollHeight - window.innerHeight
    const lenis = window.__lenis
    // Lenis owns the scroll position; window.scrollTo gets reverted on its
    // next frame. It has to be told, not the window.
    if (lenis) lenis.scrollTo(max * Number(frac), { immediate: true, force: true })
    else window.scrollTo({ top: max * Number(frac), behavior: 'instant' })
  }, at)
  await page.waitForTimeout(Number(flag('settle', 3500)))
}

const state = await page.evaluate(() => {
  const s = window.__scroll
  return s ? { progress: +s.progress.toFixed(4), act: s.index, t: +s.t.toFixed(4) } : null
})
if (state) console.log(`state: progress=${state.progress} act=${state.act} t=${state.t}`)

await page.screenshot({ path: out })
await browser.close()

if (problems.length) {
  console.log('--- console ---')
  for (const p of [...new Set(problems)].slice(0, 25)) console.log(p)
}
console.log(`wrote ${out} (${width}x${height})`)
