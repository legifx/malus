import { chromium } from 'playwright'
const b = await chromium.launch({ args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-sandbox'] })
const p = await b.newPage({ viewport:{width:1300,height:820} })
p.on('pageerror', e => console.log('ERR', e.message))
p.on('console', m => { if (m.type()==='error') console.log('CERR', m.text().slice(0,160)) })
await p.goto('http://127.0.0.1:8390/', { waitUntil:'networkidle', timeout:60000 })
await p.waitForTimeout(12000)
for (const [name, frac] of [['hold',0.3255],['break',0.3827],['settled',0.4482]]) {
  await p.evaluate((f) => { const m = document.documentElement.scrollHeight - innerHeight; window.__lenis?.scrollTo(m*f,{immediate:true,force:true}) }, frac)
  await p.waitForTimeout(16000)
  await p.screenshot({ path: `shots/bite-${name}.png`, timeout: 240000 })
  console.log(name, await p.evaluate(() => `act ${window.__scroll.index} t=${window.__scroll.t.toFixed(2)}`))
}
await b.close()
