import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import CustomShaderMaterial from 'three-custom-shader-material'
import { Apple } from '../components/Apple'
import { makeAppleGeometry } from '../geometry/apple'
import { cutFaceVertex, cutFaceFragment, CUT_FACE_DEFAULTS } from '../materials/cutFace'
import { scroll } from '../scroll/acts'

/**
 * ACT IV — STAR
 *
 * Chaos, then order. Act III blew the fruit apart at speed; this one opens the
 * same fruit slowly and along one plane, and what was hidden inside turns out
 * to be arranged.
 *
 * The cut is done with clipping planes rather than by rebuilding the mesh: two
 * copies of the apple, one keeping everything below the equator and one keeping
 * everything above, each capped with a disc that carries the carpels. When the
 * top half lifts, its clipping plane travels with it.
 */

const ACT = 3

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)
const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a))
  return t * t * (3 - 2 * t)
}

const CUT_AT = 0.05  // slightly above centre: an apple's widest point is high

/**
 * A disc that follows the fruit's real outline at the cut height.
 *
 * A plain circle does not fit — the cross-section is five-lobed and noisy, so a
 * circular cap either overhangs the skin or leaves a gap showing the inside of
 * the shell. The outline is sampled straight off the geometry instead.
 */
function makeCutDisc(geo: THREE.BufferGeometry, cutY: number, segments = 160) {
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
  return { geometry: g, radius: rmax }
}

export function Star() {
  const root = useRef<THREE.Group>(null)
  const topHalf = useRef<THREE.Group>(null)
  const spin = useRef<THREE.Group>(null)
  const camera = useThree((s) => s.camera)

  const { disc, radius } = useMemo(() => {
    const base = makeAppleGeometry({ seed: 7, detail: 40, character: 0.38 })
    const d = makeCutDisc(base, CUT_AT)
    base.dispose()
    return { disc: d.geometry, radius: d.radius }
  }, [])

  // Keep-below and keep-above. THREE.Plane keeps points where
  // dot(normal, p) + constant > 0.
  const planeLower = useMemo(() => new THREE.Plane(new THREE.Vector3(0, -1, 0), CUT_AT), [])
  const planeUpper = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), -CUT_AT), [])

  const capUniforms = useMemo(() => {
    const mk = () => {
      const u: Record<string, { value: unknown }> = {}
      for (const [k, val] of Object.entries(CUT_FACE_DEFAULTS)) u[k] = { value: val }
      u.uRadius = { value: radius }
      u.uFleshPale = { value: new THREE.Color(0.729, 0.659, 0.451) }
      u.uFleshDeep = { value: new THREE.Color(0.573, 0.510, 0.337) }
      return u
    }
    return { lower: mk(), upper: mk() }
  }, [radius])

  useFrame(() => {
    const active = scroll.index === ACT
    if (root.current) root.current.visible = active
    if (!active) return

    const t = scroll.t
    const open = smoothstep(0.18, 0.44, t)
    const overhead = smoothstep(0.38, 0.70, t)
    const figure = clamp01((t - 0.68) / 0.22)

    // The top half is SET ASIDE, not lifted.
    //
    // Lifting it straight up put it directly between an overhead camera and the
    // cut face it was supposed to reveal. Sliding it sideways instead gives the
    // composition every cook already knows: one half skin up, the other open,
    // lying next to each other.
    const lift = open * 0.10
    if (topHalf.current) {
      topHalf.current.position.set(open * 2.05, lift, -open * 0.12)
      topHalf.current.rotation.z = -open * 0.30
      topHalf.current.rotation.x = open * 0.16
    }
    // The clipping plane belongs to the mesh, so it travels with it.
    // The plane travels with the mesh; only the vertical component matters
    // because the cut is horizontal.
    planeUpper.constant = -(CUT_AT + lift)

    // Whole-fruit rotation stops the moment the cut begins.
    if (spin.current) spin.current.rotation.y = -0.35 + t * 0.8 * (1 - open)

    capUniforms.lower.uFigure.value = figure
    capUniforms.upper.uFigure.value = 0

    // Side on, then straight down over the open face.
    // Far enough back to hold both halves once they separate: at 3.5 units a
    // single apple already spanned 31° of a 34° field.
    const side = new THREE.Vector3(0, 0.5, 3.9)
    const above = new THREE.Vector3(1.0, 6.8, 1.2)
    camera.position.lerpVectors(side, above, overhead)
    camera.lookAt(overhead * 1.0, CUT_AT, 0)
  })

  return (
    <group ref={root} visible={false}>
      <group ref={spin}>
        {/* Lower half: keeps everything below the cut, capped facing up. */}
        <group>
          <Apple seed={7} detail={40} character={0.38} withStem={false} clippingPlanes={[planeLower]} />
          <mesh geometry={disc} position={[0, CUT_AT, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <CustomShaderMaterial
              baseMaterial={THREE.MeshPhysicalMaterial}
              vertexShader={cutFaceVertex}
              fragmentShader={cutFaceFragment}
              uniforms={capUniforms.lower}
              envMapIntensity={0.9}
              clearcoat={1}
            />
          </mesh>
        </group>

        {/* Upper half: keeps everything above the cut, capped facing down. */}
        <group ref={topHalf}>
          <Apple seed={7} detail={40} character={0.38} clippingPlanes={[planeUpper]} />
          <mesh geometry={disc} position={[0, CUT_AT - 0.002, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <CustomShaderMaterial
              baseMaterial={THREE.MeshPhysicalMaterial}
              vertexShader={cutFaceVertex}
              fragmentShader={cutFaceFragment}
              uniforms={capUniforms.upper}
              envMapIntensity={0.9}
              clearcoat={1}
            />
          </mesh>
        </group>
      </group>
    </group>
  )
}
