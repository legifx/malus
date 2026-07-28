import { chromium } from 'playwright'
const b = await chromium.launch({ args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-sandbox'] })
const p = await b.newPage({ viewport:{width:900,height:600} })
p.on('pageerror', e => console.log('ERR', e.message))
p.on('console', m => { if (m.type()==='error') console.log('CONSOLE-ERR', m.text().slice(0,200)) })
await p.goto('http://127.0.0.1:8390/', { waitUntil:'networkidle' })
await p.waitForTimeout(10000)
await p.evaluate(() => { const m = document.documentElement.scrollHeight - innerHeight; window.__lenis?.scrollTo(m*0.142,{immediate:true,force:true}) })
await p.waitForTimeout(5000)
console.log(await p.evaluate(() => {
  const T = window.__THREE, scene = window.__scene
  let cam = null
  scene.traverse(o => { if (o.isCamera) cam = o })
  // R3F's default camera is not in the scene; grab it off the renderer state
  const lines = []
  lines.push('scene camera found: ' + !!cam)
  const pose = window.__pose
  lines.push('pose at: ' + JSON.stringify(pose.at.map(v=>+v.toFixed(2))))
  scene.traverse(o => {
    if (o.isMesh && o.geometry?.attributes?.position?.count > 30000) {
      const wp = o.getWorldPosition(new T.Vector3())
      lines.push(`big mesh y=${wp.y.toFixed(2)} visible=${o.visible} matVisible=${o.material?.visible} opacity=${o.material?.opacity} transparent=${o.material?.transparent} colorWrite=${o.material?.colorWrite} side=${o.material?.side} frustumCulled=${o.frustumCulled}`)
      const bs = o.geometry.boundingSphere
      lines.push(`  boundingSphere r=${bs? bs.radius.toFixed(2):'none'} center=${bs? [bs.center.x,bs.center.y,bs.center.z].map(v=>+v.toFixed(2)).join(',') : '-'}`)
    }
  })
  return lines.join('\n')
}))
await b.close()
