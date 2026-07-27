import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import CustomShaderMaterial from 'three-custom-shader-material'
import { Apple } from '../components/Apple'
import { makeCutDisc, CUT_AT } from '../geometry/cutDisc'
import { cutFaceVertex, cutFaceFragment, CUT_FACE_DEFAULTS } from '../materials/cutFace'
import { scroll, signals } from '../scroll/acts'

/**
 * ACT V — TIME
 *
 * The cut face from the previous act, left alone.
 *
 * Browning is not decay. Polyphenol oxidase acts on phenolics the moment a
 * wound lets oxygen in; the quinones it produces polymerise into the brown
 * pigment, and PPO itself is part of the plant's defence against pests and
 * pathogens. The fruit is not rotting — it is closing a wound.
 *   research/papers/enzymatic-browning-.../2024-inhibition-of-polypheno...md
 *   research/papers/enzymatic-browning-.../2020-assessment-of-enzymatic...md
 *
 * Then the reversal, which is real and quantified: ascorbic acid reduces the
 * quinones back before they can polymerise. The literature's best treatment for
 * apple slices is 1% ascorbic acid with 1% citric acid — so the drop that lands
 * here is lemon, and the patch it reaches goes pale again rather than merely
 * stopping.
 */

const ACT = 4

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)
const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a))
  return t * t * (3 - 2 * t)
}

const DROP_AT = 0.56
const DROP_XY = new THREE.Vector2(-0.20, 0.16)

export function Time() {
  const root = useRef<THREE.Group>(null)
  const drop = useRef<THREE.Mesh>(null)
  const camera = useThree((s) => s.camera)

  const { geometry: disc, radius } = useMemo(() => makeCutDisc(7), [])
  const planeLower = useMemo(() => new THREE.Plane(new THREE.Vector3(0, -1, 0), CUT_AT), [])

  const capUniforms = useMemo(() => {
    const u: Record<string, { value: unknown }> = {}
    for (const [k, val] of Object.entries(CUT_FACE_DEFAULTS)) u[k] = { value: val }
    u.uRadius = { value: radius }
    u.uDropC = { value: DROP_XY.clone() }
    u.uFleshPale = { value: new THREE.Color(0.729, 0.659, 0.451) }
    u.uFleshDeep = { value: new THREE.Color(0.573, 0.510, 0.337) }
    return u
  }, [radius])

  useFrame(() => {
    const active = scroll.index === ACT
    if (root.current) root.current.visible = active
    if (!active) return

    const t = scroll.t

    // Oxidation runs with the scroll. Reverse it and the fruit un-browns —
    // which is not a cheat: the chemistry here really is reversible, and
    // scrubbing back through the act is the same operation the drop performs.
    capUniforms.uBrown.value = smoothstep(0.10, DROP_AT, t)

    // The drop falls, lands, and spreads.
    const fall = clamp01((t - (DROP_AT - 0.10)) / 0.10)
    const spread = smoothstep(DROP_AT, 0.84, t)
    capUniforms.uDropR.value = spread * 0.62
    signals.drop = spread
    capUniforms.uDropWet.value = (1 - smoothstep(0.86, 1.0, t)) * smoothstep(DROP_AT - 0.02, DROP_AT + 0.05, t)

    if (drop.current) {
      const visible = fall > 0.001 && fall < 0.999
      drop.current.visible = visible
      if (visible) {
        // Free fall again, and it flattens as it arrives.
        const h = 1.5 * (1 - fall * fall)
        drop.current.position.set(DROP_XY.x * radius, CUT_AT + 0.03 + h, -DROP_XY.y * radius)
        const squash = 1 - 0.55 * smoothstep(0.82, 1.0, fall)
        drop.current.scale.set(1 / squash, squash, 1 / squash)
      }
    }

    // Close on the cut face, easing back as the drop does its work so the whole
    // patch is legible.
    // The disc is a unit across; at 2.9 units it spanned 38° of a 34° field and
    // spilled out of frame on every side.
    const dist = 3.9 + smoothstep(DROP_AT, 1.0, t) * 0.9
    camera.position.set(0.12, CUT_AT + dist, 0.5)
    camera.lookAt(0, CUT_AT, 0)
  })

  return (
    <group ref={root} visible={false}>
      <Apple seed={7} detail={40} character={0.38} withStem={false} clippingPlanes={[planeLower]} />
      <mesh geometry={disc} position={[0, CUT_AT, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <CustomShaderMaterial
          baseMaterial={THREE.MeshPhysicalMaterial}
          vertexShader={cutFaceVertex}
          fragmentShader={cutFaceFragment}
          uniforms={capUniforms}
          envMapIntensity={0.9}
          clearcoat={1}
        />
      </mesh>

      {/* The drop. Lemon: high refraction, almost no colour of its own. */}
      <mesh ref={drop} visible={false}>
        <sphereGeometry args={[0.075, 24, 18]} />
        <meshPhysicalMaterial
          transmission={0.94}
          thickness={0.14}
          roughness={0.05}
          ior={1.35}
          color="#fff8e0"
          attenuationColor="#f4e39a"
          attenuationDistance={0.5}
        />
      </mesh>
    </group>
  )
}
