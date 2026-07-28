import { chromium } from 'playwright'
const b = await chromium.launch({ args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-sandbox'] })
const p = await b.newPage({ viewport:{width:900,height:600} })
p.on('pageerror', e => console.log('ERR', e.message))
p.on('console', m => { if (m.type()==='error') console.log('CONSOLE-ERR', m.text().slice(0,300)) })
await p.goto('http://127.0.0.1:8390/', { waitUntil:'networkidle' })
await p.waitForTimeout(10000)
await p.evaluate(() => { const m = document.documentElement.scrollHeight - innerHeight; window.__lenis?.scrollTo(m*0.142,{immediate:true,force:true}) })
await p.waitForTimeout(5000)
console.log(await p.evaluate(() => {
  const T = window.__THREE, scene = window.__scene, out = []
  scene.traverse(o => {
    if (!o.isMesh && !o.isPoints && !o.isInstancedMesh) return
    let vis = o.visible, q = o.parent
    while (q) { vis = vis && q.visible; q = q.parent }
    const wp = o.getWorldPosition(new T.Vector3())
    const g = o.geometry, m = o.material
    const tris = g?.index ? g.index.count/3 : (g?.attributes?.position?.count??0)/3
    out.push(`${o.type} tris=${Math.round(tris)} vis=${vis} y=${wp.y.toFixed(2)} `
      + `mat=${m?.type} matVis=${m?.visible} op=${m?.opacity} colorWrite=${m?.colorWrite} `
      + `clip=${m?.clippingPlanes === null ? 'null' : (m?.clippingPlanes === undefined ? 'UNDEF' : m?.clippingPlanes?.length)}`)
  })
  return out.join('\n')
}))
await b.close()
