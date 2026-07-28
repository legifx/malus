/**
 * One pass over the whole piece in a single browser session.
 *
 * Doubles as the end-to-end check and as the screenshot run: relaunching the
 * browser per frame pays the shader-compile cost every time, which under
 * SwiftShader dominates everything else.
 */
import { chromium } from 'playwright'
import { mkdir } from 'node:fs/promises'

const OUT = process.argv[2] ?? 'shots/sweep'
const W = Number(process.argv[3] ?? 1400)
const H = Number(process.argv[4] ?? 900)

// Act boundaries moved when act I was lengthened; these are act-local t values
// converted against TOTAL_VH = 27.5.
const FRAMES = [
  ['01-fall-impact', 0.109],
  ['02-fall-copy', 0.145],
  ['03-boundary-in', 0.1770],
  ['04-boundary-at', 0.1818],
  ['05-skin', 0.2391],
  ['06-bite-crisp', 0.3582],
  ['07-bite-mealy', 0.4300],
  ['08-star', 0.5810],
  ['09-time', 0.6955],
  ['10-orchard', 0.8000],
  ['11-orchard-dark', 0.8909],
  ['12-seed', 0.9364],
]

await mkdir(OUT, { recursive: true })

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'],
})
const page = await browser.newPage({ viewport: { width: W, height: H } })

const problems = []
page.on('console', (m) => { if (m.type() === 'error') problems.push(m.text()) })
page.on('pageerror', (e) => problems.push('pageerror: ' + e.message))

await page.goto('http://127.0.0.1:8390/', { waitUntil: 'networkidle', timeout: 60_000 })
await page.waitForTimeout(9000)

for (const [name, frac] of FRAMES) {
  await page.evaluate((f) => {
    const max = document.documentElement.scrollHeight - window.innerHeight
    window.__lenis?.scrollTo(max * Number(f), { immediate: true, force: true })
  }, frac)
  // Long enough for the act to mount, build its geometry and compile shaders.
  await page.waitForTimeout(7000)
  const state = await page.evaluate(() => {
    const s = window.__scroll
    return s ? `act ${s.index} t=${s.t.toFixed(2)}` : 'no state'
  })
  await page.screenshot({ path: `${OUT}/${name}.png`, timeout: 180000 })
  console.log(`${name.padEnd(18)} ${frac.toFixed(3)}  ${state}`)
}

console.log(problems.length ? `\n--- ${problems.length} errors ---` : '\nno console errors')
for (const p of [...new Set(problems)].slice(0, 12)) console.log(p)
await browser.close()
