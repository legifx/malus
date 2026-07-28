import { chromium } from 'playwright'
const b = await chromium.launch({ args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-sandbox'] })
const p = await b.newPage({ viewport:{width:900,height:600} })
p.on('pageerror', e => console.log('ERR', e.message))
await p.goto('http://127.0.0.1:8390/', { waitUntil:'networkidle' })
await p.waitForTimeout(10000)
for (const frac of [0.142, 0.80]) {
  await p.evaluate((f) => { const m = document.documentElement.scrollHeight - innerHeight; window.__lenis?.scrollTo(m*f,{immediate:true,force:true}) }, frac)
  await p.waitForTimeout(4000)
  console.log('--- scroll', frac, await p.evaluate(() => {
    const scene = window.__scene
    const lights = []
    scene.traverse(o => { if (o.isLight) lights.push(`${o.type}(${o.intensity})vis=${o.visible}`) })
    let envMapOnApple = 'n/a'
    scene.traverse(o => {
      if (o.isMesh && o.material?.type === 'MeshPhysicalMaterial' && o.visible) {
        envMapOnApple = `envMap=${o.material.envMap ? 'yes' : 'NULL'} envInt=${o.material.envMapIntensity}`
      }
    })
    return JSON.stringify({
      sceneEnvironment: scene.environment ? 'set' : 'NULL',
      lights, envMapOnApple,
    })
  }))
}
await b.close()
