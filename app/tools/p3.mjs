import { chromium } from 'playwright'
const b = await chromium.launch({ args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-sandbox'] })
const p = await b.newPage({ viewport:{width:900,height:600} })
p.on('pageerror', e => console.log('ERR', e.message))
await p.goto('http://127.0.0.1:8390/', { waitUntil:'networkidle' })
await p.waitForTimeout(10000)
await p.evaluate(() => { const m = document.documentElement.scrollHeight - innerHeight; window.__lenis?.scrollTo(m*0.142,{immediate:true,force:true}) })
await p.waitForTimeout(5000)
console.log(await p.evaluate(() => {
  const out = []
  window.__scene.traverse(o => {
    if (o.isMesh || o.isPoints || o.isInstancedMesh) {
      const wp = o.getWorldPosition(new window.__THREE.Vector3())
      out.push(`${o.type} vis=${o.visible} parentsVis=${(() => { let q=o.parent, v=true; while(q){ v = v && q.visible; q=q.parent } return v })()} pos=${wp.x.toFixed(2)},${wp.y.toFixed(2)},${wp.z.toFixed(2)} tris=${o.geometry?.index? o.geometry.index.count/3 : (o.geometry?.attributes?.position?.count??0)/3|0}`)
    }
  })
  return out.join('\n')
}))
await b.close()
