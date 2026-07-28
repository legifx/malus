import { chromium } from 'playwright'
const b = await chromium.launch({ args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-sandbox'] })
const p = await b.newPage({ viewport:{width:800,height:520} })
await p.goto('http://127.0.0.1:8390/', { waitUntil:'networkidle' })
await p.waitForTimeout(11000)
for (const [name, frac] of [['A-fall', 0.142], ['B-orchard', 0.80], ['C-fall-again', 0.142]]) {
  await p.evaluate((f) => { const m = document.documentElement.scrollHeight - innerHeight; window.__lenis?.scrollTo(m*f,{immediate:true,force:true}) }, frac)
  await p.waitForTimeout(6000)
  await p.screenshot({ path: `shots/pair-${name}.png`, timeout: 180000 })
  console.log('wrote', name)
}
await b.close()
