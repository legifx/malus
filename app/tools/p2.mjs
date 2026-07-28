import { chromium } from 'playwright'
const b = await chromium.launch({ args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-sandbox'] })
const p = await b.newPage({ viewport:{width:900,height:600} })
p.on('pageerror', e => console.log('ERR', e.message))
await p.goto('http://127.0.0.1:8390/', { waitUntil:'networkidle' })
await p.waitForTimeout(10000)
await p.evaluate(() => { const m = document.documentElement.scrollHeight - innerHeight; window.__lenis?.scrollTo(m*0.142,{immediate:true,force:true}) })
await p.waitForTimeout(5000)
console.log(JSON.stringify(await p.evaluate(() => ({
  scroll: { act: window.__scroll.index, t: +window.__scroll.t.toFixed(3) },
  pose: window.__pose,
})), null, 1))
await b.close()
