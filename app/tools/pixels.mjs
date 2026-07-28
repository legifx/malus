/**
 * Read pixels out of the running page.
 *
 * "Is it dark or is it absent" is not answerable by looking at a screenshot at
 * this point — the difference between an unlit surface and a very dim one is
 * exactly what is in question. This asks the framebuffer directly.
 *
 *   node tools/pixels.mjs <scrollFrac> [<scrollFrac> …]
 */
import { chromium } from 'playwright'

const fracs = process.argv.slice(2).map(Number)
if (!fracs.length) fracs.push(0.142)

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'],
})
const page = await browser.newPage({ viewport: { width: 700, height: 460 } })
page.on('pageerror', (e) => console.log('ERR', e.message))

// preserveDrawingBuffer lets the WebGL canvas be read back after the frame.
await page.goto('http://127.0.0.1:8390/?readback=1', { waitUntil: 'networkidle', timeout: 60_000 })
await page.waitForTimeout(11000)

for (const f of fracs) {
  await page.evaluate((frac) => {
    const m = document.documentElement.scrollHeight - window.innerHeight
    window.__lenis?.scrollTo(m * Number(frac), { immediate: true, force: true })
  }, f)
  await page.waitForTimeout(5000)

  const stats = await page.evaluate(() => {
    const c = document.querySelector('canvas')
    if (!c) return 'no canvas'
    const off = document.createElement('canvas')
    off.width = c.width; off.height = c.height
    const ctx = off.getContext('2d')
    ctx.drawImage(c, 0, 0)
    const d = ctx.getImageData(0, 0, off.width, off.height).data
    let sum = 0, max = 0, lit = 0
    for (let i = 0; i < d.length; i += 4) {
      const l = (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114)
      sum += l
      if (l > max) max = l
      if (l > 40) lit++
    }
    const n = d.length / 4
    return {
      mean: +(sum / n).toFixed(1),
      max: Math.round(max),
      litPercent: +((lit / n) * 100).toFixed(1),
      size: `${off.width}x${off.height}`,
    }
  })
  const state = await page.evaluate(() => `act ${window.__scroll.index} t=${window.__scroll.t.toFixed(2)}`)
  console.log(`${String(f).padEnd(7)} ${state.padEnd(16)}`, JSON.stringify(stats))
}
await browser.close()
