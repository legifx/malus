import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import CustomShaderMaterial from 'three-custom-shader-material'
import { Apple } from '../components/Apple'
import { makeCutDisc, CUT_AT } from '../geometry/cutDisc'
import { cutFaceVertex, cutFaceFragment, CUT_FACE_DEFAULTS } from '../materials/cutFace'
import { useActReady, HERO_DETAIL } from '../scroll/useActReady'
import { useMalus } from '../store'
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

/**
 * Gate and body are separate components on purpose.
 *
 * Putting `if (!ready) return null` inside the body would sit AFTER the hooks
 * that build the geometry, so everything would still be constructed on the
 * first render and the gate would buy nothing. Only an unmounted subtree
 * actually skips the work.
 */
export function Star() {
  const ready = useActReady(3)
  if (!ready) return null
  return <StarBody />
}

function StarBody() {
  const quality = useMalus((st) => st.quality)
  const detail = HERO_DETAIL[quality]
  const root = useRef<THREE.Group>(null)
  const topHalf = useRef<THREE.Group>(null)
  const spin = useRef<THREE.Group>(null)
  const camera = useThree((s) => s.camera)

  const { geometry: disc, radius } = useMemo(() => makeCutDisc(7, detail), [detail])

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
          <Apple seed={7} detail={detail} character={0.38} withStem={false} clippingPlanes={[planeLower]} />
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
          <Apple seed={7} detail={detail} character={0.38} clippingPlanes={[planeUpper]} />
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
