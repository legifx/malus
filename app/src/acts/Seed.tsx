import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { fbm3 } from '../lib/noise'
import { useActReady } from '../scroll/useActReady'
import { setPose } from '../scene/CameraRig'
import { scroll } from '../scroll/acts'

/**
 * ACT VII — SEED
 *
 * The loop closes. The piece opened on a single point of light in the dark that
 * turned out to be an apple falling from a long way off; it ends on a single
 * point of light that turns out to be a pip.
 *
 * The pip is the argument in one object: an apple grown from seed is never its
 * parent, so every seed is a genuinely new individual and every named variety
 * is one tree that has been copied by grafting ever since. The thing in your
 * hand at the end is both the smallest object in the piece and the only one
 * that contains all of it.
 */

const ACT = 6

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)
const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a))
  return t * t * (3 - 2 * t)
}

/** A pip: flattened, broad at the base, drawn to a point at the tip. */
function makeSeedGeometry() {
  const geo = new THREE.IcosahedronGeometry(1, 28)
  const pos = geo.attributes.position as THREE.BufferAttribute
  const v = new THREE.Vector3()
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).normalize()
    const t = v.y
    let r = 1
    // Drawn to a point at the tip, full and round at the base.
    r *= 1 - 0.62 * smoothstep(-0.1, 1.0, t)
    r *= 1 - 0.10 * smoothstep(0.2, -1.0, t)
    // Seeds are not smooth — a faint wrinkle runs along the coat. Kept small
    // and low frequency: at 0.02 the displacement was enough to make the
    // icosahedron's own subdivision show through as a diagonal weave.
    r += 0.007 * fbm3(v.x * 1.9, v.y * 1.3, v.z * 1.9, 1, 11)
    pos.setXYZ(i, v.x * r * 0.62, v.y * r * 1.45, v.z * r * 0.44)
  }
  geo.computeVertexNormals()
  geo.computeBoundingBox()
  return geo
}

/**
 * Gate and body are separate components on purpose.
 *
 * Putting `if (!ready) return null` inside the body would sit AFTER the hooks
 * that build the geometry, so everything would still be constructed on the
 * first render and the gate would buy nothing. Only an unmounted subtree
 * actually skips the work.
 */
export function Seed() {
  const ready = useActReady(6)
  if (!ready) return null
  return <SeedBody />
}

function SeedBody() {
  const root = useRef<THREE.Group>(null)
  const spin = useRef<THREE.Group>(null)
  const glow = useRef<THREE.Mesh>(null)
  // Read-only: the rig owns where the camera goes, but the glow still has to
  // face it.
  const camera = useThree((st) => st.camera)

  const geometry = useMemo(() => makeSeedGeometry(), [])

  // Generated, not loaded. Hoisted out of the JSX: a hook call inside the
  // returned tree happens to work but breaks the moment the tree gets a branch.
  const glowTex = useMemo(() => {
    const S = 128
    const data = new Uint8Array(S * S * 4)
    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        const dx = (x + 0.5) / S - 0.5
        const dy = (y + 0.5) / S - 0.5
        const d = Math.min(1, Math.hypot(dx, dy) * 2)
        const a = Math.pow(1 - d, 3.2)
        const i = (y * S + x) * 4
        data[i] = 255; data[i + 1] = 255; data[i + 2] = 255
        data[i + 3] = Math.round(a * 255)
      }
    }
    const tex = new THREE.DataTexture(data, S, S, THREE.RGBAFormat)
    tex.needsUpdate = true
    return tex
  }, [])

  useFrame(() => {
    const active = scroll.index === ACT
    if (root.current) root.current.visible = active
    if (!active) return

    const t = scroll.t

    if (spin.current) spin.current.rotation.set(0.22, -0.6 + t * 1.5, 0.1)

    // Held close, then let go: the camera retreats until the pip is a point.
    // The first frame of the piece was a point of light at 58 units. This is
    // the same shot, run the other way.
    // The pip is 2.9 long and 1.24 across. At 0.62 the camera sat 0.18 outside
    // its own surface and the frame was solid brown.
    const away = smoothstep(0.30, 0.92, t)
    // Aim below the pip as the camera retreats, so it rises into the upper
    // frame and leaves the lower half to the closing text.
    setPose(0, 0.05, 4.4 + away * 30.0, 0, -away * 4.5, 0)

    // The glow takes over from the object exactly as the object stops being
    // resolvable, so the transition from thing to point has no seam.
    if (glow.current) {
      const g = smoothstep(0.55, 0.95, t)
      glow.current.visible = g > 0.01
      const s = 0.05 + away * 1.15
      glow.current.scale.setScalar(s)
      const mat = glow.current.material as THREE.Material & { opacity: number }
      mat.opacity = g * 0.9
      glow.current.quaternion.copy(camera.quaternion)
    }
  })

  return (
    <group ref={root} visible={false}>
      <group ref={spin}>
        <mesh geometry={geometry}>
          <meshPhysicalMaterial
            color="#6b3d1d"
            roughness={0.34}
            clearcoat={0.65}
            clearcoatRoughness={0.22}
            sheen={0.4}
            sheenColor="#b8763c"
            envMapIntensity={1.2}
          />
        </mesh>
      </group>

      <mesh ref={glow} visible={false}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          color="#ffb877"
          opacity={0}
          map={glowTex}
        />
      </mesh>
    </group>
  )
}
