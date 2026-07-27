/**
 * Startup and frame cost, measured rather than guessed.
 *
 * SwiftShader is far slower than any real GPU, so the absolute frame numbers
 * mean nothing — the ratios and the CPU-side startup cost do. Geometry
 * construction happens on the main thread and is hardware-independent, which
 * is exactly the part worth measuring here.
 */
import { chromium } from 'playwright'

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'],
})
const page = await browser.newPage({ viewport: { width: 1000, height: 700 } })
page.on('pageerror', (e) => console.log('pageerror:', e.message))

const t0 = Date.now()
await page.goto('http://127.0.0.1:8390/', { waitUntil: 'load', timeout: 60_000 })

// Wait for the first frame the renderer actually produces.
await page.waitForFunction(() => !!document.querySelector('canvas'), { timeout: 60_000 })
const tCanvas = Date.now() - t0

await page.waitForTimeout(14000)

const stats = await page.evaluate(() => {
  const nav = performance.getEntriesByType('navigation')[0]
  return {
    domContentLoaded: Math.round(nav?.domContentLoadedEventEnd ?? 0),
    loadEvent: Math.round(nav?.loadEventEnd ?? 0),
    jsHeapMB: performance.memory
      ? Math.round(performance.memory.usedJSHeapSize / 1048576)
      : null,
    scroll: window.__scroll ? { act: window.__scroll.index } : null,
  }
})
console.log('canvas present after (ms):', tCanvas)
console.log(stats)

// Frame time in a couple of representative acts.
for (const [label, frac] of [['act I fall', 0.06], ['act III bite', 0.325], ['act VI orchard', 0.80]]) {
  await page.evaluate((f) => {
    const max = document.documentElement.scrollHeight - window.innerHeight
    window.__lenis?.scrollTo(max * Number(f), { immediate: true, force: true })
  }, frac)
  await page.waitForTimeout(4000)
  const fps = await page.evaluate(() => new Promise((res) => {
    let n = 0
    const start = performance.now()
    const tick = () => {
      n++
      if (performance.now() - start > 3000) res(+(n / ((performance.now() - start) / 1000)).toFixed(1))
      else requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }))
  console.log(`${label}: ${fps} fps (swiftshader — ratios only)`)
}

await browser.close()
