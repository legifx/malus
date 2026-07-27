import * as THREE from 'three'
import { makeAppleGeometry } from './apple'

/** Where the fruit is opened. Slightly above centre: an apple is widest high. */
export const CUT_AT = 0.05

/**
 * A disc that follows the fruit's real outline at the cut height.
 *
 * A plain circle does not fit — the cross-section is five-lobed and noisy, so a
 * circular cap either overhangs the skin or leaves a gap showing the inside of
 * the shell. The outline is sampled straight off the geometry instead.
 */
export function makeCutDisc(seed = 7, detail = 40, segments = 160) {
  const geo = makeAppleGeometry({ seed, detail, character: 0.38 })
  const cutY = CUT_AT
  const pos = geo.attributes.position as THREE.BufferAttribute
  const band = 0.06
  const radii = new Float32Array(segments)
  const v = new THREE.Vector3()
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i)
    if (Math.abs(v.y - cutY) > band) continue
    const a = Math.atan2(v.z, v.x)
    const bin = Math.min(segments - 1, Math.max(0, Math.floor(((a + Math.PI) / (Math.PI * 2)) * segments)))
    const r = Math.hypot(v.x, v.z)
    if (r > radii[bin]) radii[bin] = r
  }
  // Any empty bin borrows from its neighbours rather than collapsing to zero.
  for (let pass = 0; pass < 3; pass++) {
    for (let i = 0; i < segments; i++) {
      if (radii[i] > 0) continue
      const a = radii[(i - 1 + segments) % segments]
      const b = radii[(i + 1) % segments]
      if (a > 0 || b > 0) radii[i] = Math.max(a, b)
    }
  }

  const verts: number[] = [0, 0, 0]
  for (let i = 0; i <= segments; i++) {
    const k = i % segments
    const a = (k / segments) * Math.PI * 2 - Math.PI
    // Built in the XY plane; the mesh rotation lays it flat, and the shader
    // reads position.xy as its polar plane.
    verts.push(Math.cos(a) * radii[k], Math.sin(a) * radii[k], 0)
  }
  const idx: number[] = []
  for (let i = 1; i <= segments; i++) idx.push(0, i, i + 1)

  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3))
  g.setIndex(idx)
  g.computeVertexNormals()
  let rmax = 0
  for (const r of radii) rmax = Math.max(rmax, r)
  geo.dispose()
  return { geometry: g, radius: rmax }
}

