import * as THREE from 'three'
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js'
import { fbm3, rng } from '../lib/noise'

/**
 * Procedural apple.
 *
 * Built as a deformed icosphere rather than a UV sphere: even vertex density,
 * no pole pinching — and the two poles are exactly where an apple has its two
 * cavities, which is the hardest part of the silhouette to get right.
 *
 * Every apple is generated from a seed. That is not a convenience: act VI shows
 * ten thousand genetically distinct apples, which is the whole point of the act.
 *
 * Attributes written for the shader:
 *   aSphere — the original unit-sphere direction. Displacement destroys any
 *             stable UV frame, so all procedural skin detail is addressed in
 *             this space instead. No seams, no pole singularity.
 *   aCavity — 0..1, how deep inside the stem well / calyx basin a vertex sits.
 *             Real apples are darker and often russeted in both cavities.
 */

export interface AppleParams {
  seed?: number
  /**
   * Icosphere subdivision. PolyhedronGeometry subdivides QUADRATICALLY, not
   * exponentially: face count is 20·(detail+1)². So 40 ≈ 33k tris (hero),
   * 6 ≈ 980 tris (instanced crowd) — not the other way round.
   */
  detail?: number
  /** 0 = perfect specimen, 1 = strongly irregular. */
  character?: number
}

/** Silhouette multiplier over the unit sphere, t = -1 (blossom) … +1 (stem). */
function radiusProfile(t: number): number {
  // Apples are widest a little above the equator — that is the "shoulder".
  const shoulder = 0.045 * Math.exp(-Math.pow((t - 0.4) / 0.42, 2))
  // …and taper toward the blossom end.
  const taperArg = Math.max(0, -(t + 0.02))
  const taper = 0.50 * Math.pow(taperArg, 1.25) / Math.pow(0.98, 1.25)
  return 1 + shoulder - taper
}

export function makeAppleGeometry({
  seed = 1,
  detail = 40,
  character = 0.5,
}: AppleParams = {}): THREE.BufferGeometry {
  const rand = rng(seed)

  // Per-apple identity. Small ranges — these read as "a different apple",
  // not "a different object".
  const lobePhase = rand() * Math.PI * 2
  // Real lobing is subtle. Anything you can clearly count reads as a pumpkin.
  const lobeAmt = 0.008 + rand() * 0.010 * (0.5 + character)
  const stemDepth = 0.38 + rand() * 0.09
  const stemWidth = 0.38 + rand() * 0.09
  const calyxDepth = 0.17 + rand() * 0.06
  const calyxWidth = 0.33 + rand() * 0.07
  const yScale = 1.30 + rand() * 0.16
  // Apples are smooth. Surface interest belongs in the shader normals, not in
  // the silhouette — displaced geometry at this frequency reads as a potato.
  const bumpAmt = (0.0025 + rand() * 0.0030) * (0.4 + character)
  const nOff = new THREE.Vector3(rand() * 60, rand() * 60, rand() * 60)
  // No apple grew straight. A tiny lean sells "photographed" more than
  // any amount of shader work.
  const lean = new THREE.Euler((rand() - 0.5) * 0.16, rand() * Math.PI * 2, (rand() - 0.5) * 0.16)

  let geo: THREE.BufferGeometry = new THREE.IcosahedronGeometry(1, detail)
  geo = mergeVertices(geo) // PolyhedronGeometry is non-indexed; we need shared verts for smooth normals

  const pos = geo.attributes.position as THREE.BufferAttribute
  const n = pos.count
  const sphere = new Float32Array(n * 3)
  const cavity = new Float32Array(n)
  const d = new THREE.Vector3()

  for (let i = 0; i < n; i++) {
    d.fromBufferAttribute(pos, i).normalize()
    const t = d.y
    // Distance from the vertical axis. The cavities have to be a function of
    // THIS, not of t — a gaussian in t is flat at the pole and produces a bump
    // in the middle of the crater instead of a well.
    const rho = Math.sqrt(Math.max(0, 1 - t * t))
    const az = Math.atan2(d.z, d.x)

    let r = radiusProfile(t)

    // Five carpels leave five faint lobes, strongest around the blossom end.
    const lobe = Math.cos(5 * az + lobePhase)
    r += lobeAmt * lobe * Math.pow(Math.max(0, -t), 1.3)
    r += lobeAmt * 0.4 * lobe * Math.pow(Math.max(0, t), 1.5)

    // Organic irregularity: one low band for the overall lopsidedness, one
    // high band for surface unevenness.
    // One octave only, and low frequency: this is the fruit's lopsidedness, not
    // its texture. Two octaves put visible dents on the silhouette.
    r += 0.013 * character * fbm3(d.x * 1.15 + nOff.x, d.y * 1.15 + nOff.y, d.z * 1.15 + nOff.z, 1, seed)
    r += bumpAmt * fbm3(d.x * 6.5 + nOff.z, d.y * 6.5 + nOff.x, d.z * 6.5 + nOff.y, 2, seed + 7)

    let x = d.x * r, y = d.y * r, z = d.z * r

    const wellTop = stemDepth * Math.exp(-Math.pow(rho / stemWidth, 2)) * (t > -0.2 ? 1 : 0)
    const wellBot = calyxDepth * Math.exp(-Math.pow(rho / calyxWidth, 2)) * (t < 0.2 ? 1 : 0)
    y = y - wellTop + wellBot

    pos.setXYZ(i, x, y * yScale, z)
    sphere[i * 3] = d.x
    sphere[i * 3 + 1] = d.y
    sphere[i * 3 + 2] = d.z
    cavity[i] = Math.min(1, (wellTop / stemDepth) + (wellBot / calyxDepth))
  }

  geo.setAttribute('aSphere', new THREE.BufferAttribute(sphere, 3))
  geo.setAttribute('aCavity', new THREE.BufferAttribute(cavity, 1))

  // Normalise: centre on the bounding box, scale so the widest radius is 1.
  // Everything downstream can then assume a unit apple.
  geo.computeBoundingBox()
  const bb = geo.boundingBox!
  const cy = (bb.max.y + bb.min.y) / 2
  const halfWidth = Math.max(bb.max.x - bb.min.x, bb.max.z - bb.min.z) / 2
  const s = 1 / halfWidth
  geo.translate(0, -cy, 0)
  geo.scale(s, s, s)
  geo.rotateX(lean.x)
  geo.rotateY(lean.y)
  geo.rotateZ(lean.z)

  geo.computeVertexNormals()

  // How far the centre sits above the ground when the fruit is resting on it.
  // The apple is not vertically symmetric — the calyx basin makes the lower
  // half shorter — so this cannot be assumed.
  geo.computeBoundingBox()
  geo.userData.restY = -geo.boundingBox!.min.y
  geo.userData.topY = geo.boundingBox!.max.y

  return geo
}

/**
 * The stem. Short, woody, always slightly bent — a straight stem is one of the
 * clearest tells that a 3D fruit was modelled rather than grown.
 */
export function makeStemGeometry(seed = 1): THREE.BufferGeometry {
  const rand = rng(seed * 7919)
  const bend = 0.06 + rand() * 0.09
  const dir = rand() * Math.PI * 2
  // Long enough to clear the rim of the stem well — a stem that sits entirely
  // inside the cavity is botanically fine and photographically useless.
  const len = 0.44 + rand() * 0.12

  const pts: THREE.Vector3[] = []
  const steps = 8
  for (let i = 0; i <= steps; i++) {
    const u = i / steps
    // Quadratic lean plus a slight S so it never reads as an arc.
    const off = bend * u * u + 0.03 * Math.sin(u * Math.PI * 1.6)
    pts.push(new THREE.Vector3(Math.cos(dir) * off, u * len, Math.sin(dir) * off))
  }
  const curve = new THREE.CatmullRomCurve3(pts)
  const TUBULAR = 20, RADIAL = 8
  const geo = new THREE.TubeGeometry(curve, TUBULAR, 0.042, RADIAL, false)

  // Taper: thicker where it meets the fruit, thinner at the cut. TubeGeometry
  // lays vertices out ring by ring, so we shrink each ring around its own
  // point on the curve — shrinking toward the Y axis would undo the bend.
  const p = geo.attributes.position as THREE.BufferAttribute
  const v = new THREE.Vector3()
  const centre = new THREE.Vector3()
  const perRing = RADIAL + 1
  for (let i = 0; i < p.count; i++) {
    const u = Math.floor(i / perRing) / TUBULAR
    curve.getPoint(u, centre)
    v.fromBufferAttribute(p, i).sub(centre).multiplyScalar(1 - 0.42 * u).add(centre)
    p.setXYZ(i, v.x, v.y, v.z)
  }
  p.needsUpdate = true
  geo.computeVertexNormals()
  return geo
}
