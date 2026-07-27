/**
 * Audio cannot be verified by looking at a screenshot, so it gets its own
 * check: click the toggle, confirm the context actually starts, scroll into
 * the fracture, and confirm nothing threw.
 */
import { chromium } from 'playwright'

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
         '--no-sandbox', '--autoplay-policy=no-user-gesture-required'],
})
const page = await browser.newPage({ viewport: { width: 1000, height: 700 } })

const problems = []
page.on('console', (m) => { if (m.type() === 'error') problems.push(m.text()) })
page.on('pageerror', (e) => problems.push('pageerror: ' + e.message))

// Count how many audio nodes get built, by wrapping the constructors before
// the app ever runs.
await page.addInitScript(() => {
  window.__audio = { contexts: 0, sources: 0, oscillators: 0 }
  const AC = window.AudioContext
  window.AudioContext = class extends AC {
    constructor(...a) {
      super(...a)
      window.__audio.contexts++
      const bs = this.createBufferSource.bind(this)
      this.createBufferSource = () => { window.__audio.sources++; return bs() }
      const os = this.createOscillator.bind(this)
      this.createOscillator = () => { window.__audio.oscillators++; return os() }
      window.__ctx = this
    }
  }
})

await page.goto('http://localhost:5273/', { waitUntil: 'networkidle', timeout: 60_000 })
await page.waitForTimeout(9000)

const btn = page.locator('button.sound')
console.log('toggle present:', await btn.count() === 1)
await btn.click()
await page.waitForTimeout(1500)

console.log('after click:', await page.evaluate(() => ({
  ...window.__audio,
  state: window.__ctx?.state ?? 'none',
  pressed: document.querySelector('button.sound')?.getAttribute('data-on'),
})))

// Into act III, across the fracture, then back over it.
for (const frac of [0.30, 0.325, 0.30]) {
  await page.evaluate((f) => {
    const max = document.documentElement.scrollHeight - window.innerHeight
    window.__lenis?.scrollTo(max * Number(f), { immediate: true, force: true })
  }, frac)
  await page.waitForTimeout(2500)
}

console.log('after fracture:', await page.evaluate(() => ({
  ...window.__audio,
  state: window.__ctx?.state ?? 'none',
})))

if (problems.length) {
  console.log('--- errors ---')
  for (const p of [...new Set(problems)].slice(0, 10)) console.log(p)
} else {
  console.log('no console errors')
}
await browser.close()
