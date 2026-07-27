import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import CustomShaderMaterial from 'three-custom-shader-material'
import { makeFracturedApple } from '../geometry/fracture'
import { appleBurstVertex, appleBurstFragment, APPLE_BURST_DEFAULTS } from '../materials/appleBurst'
import { useActReady, FRACTURE } from '../scroll/useActReady'
import { useMalus } from '../store'
import { scroll, signals } from '../scroll/acts'
import { rng } from '../lib/noise'

/**
 * ACT III — BITE
 *
 * The fruit breaks TWICE, and that is the design.
 *
 * The finding this act exists for is that crisp and mealy are not degrees of
 * freshness but two different fracture paths — through the cells, or between
 * them. Leaving that to be discovered by fiddling would mean most people never
 * see it. So the act simply shows both: a crisp break, the pieces running
 * backwards into a whole apple again, then the same fruit breaking mealy.
 *
 * The reassembly costs nothing. Every fragment's motion is a pure function of
 * the burst value, so playing the scroll backwards IS the repair.
 */

const ACT = 2

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)
const ramp = (t: number, a: number, b: number) => clamp01((t - a) / (b - a))
const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a))
  return t * t * (3 - 2 * t)
}

// The beats of the act, in act-local time.
const HOLD_END = 0.17
const CRISP_END = 0.43
const REPAIR_END = 0.56
const MEALY_END = 0.84

const ORIGIN = new THREE.Vector3(0.35, 0.25, 0.9).normalize()

/**
 * Gate and body are separate components on purpose.
 *
 * Putting `if (!ready) return null` inside the body would sit AFTER the hooks
 * that build the geometry, so everything would still be constructed on the
 * first render and the gate would buy nothing. Only an unmounted subtree
 * actually skips the work.
 */
export function Bite() {
  const ready = useActReady(2)
  if (!ready) return null
  return <BiteBody />
}

function BiteBody() {
  const quality = useMalus((st) => st.quality)
  const root = useRef<THREE.Group>(null)
  const spin = useRef<THREE.Group>(null)
  const juice = useRef<THREE.Points>(null)
  const camera = useThree((s) => s.camera)

  const { geometry, restY } = useMemo(
    () => makeFracturedApple({ ...FRACTURE[quality], seed: 7, origin: ORIGIN, character: 0.38 }),
    [quality],
  )

  const uniforms = useMemo(() => {
    const u: Record<string, { value: unknown }> = {}
    for (const [k, v] of Object.entries(APPLE_BURST_DEFAULTS)) u[k] = { value: v }
    u.uSunDir = { value: new THREE.Vector3(0.6, 0.35, 0.7).normalize() }
    u.uOrigin = { value: ORIGIN.clone().multiplyScalar(0.75) }
    return u
  }, [])

  const juiceUniforms = useMemo(() => ({ uT: { value: 0 }, uAmount: { value: 1 } }), [])

  // Juice. Only the crisp break produces any — that is the point, so the
  // particle system is gated on turgor rather than merely tinted by it.
  const juiceGeo = useMemo(() => {
    const N = 900
    const rand = rng(31337)
    const pos = new Float32Array(N * 3)
    const dir = new Float32Array(N * 3)
    const sed = new Float32Array(N)
    for (let i = 0; i < N; i++) {
      // Emitted from the fracture zone, biased along the break direction.
      const u = rand() * 2 - 1
      const a = rand() * Math.PI * 2
      const r = Math.sqrt(1 - u * u)
      const d = new THREE.Vector3(r * Math.cos(a), u, r * Math.sin(a))
      d.lerp(ORIGIN, 0.42).normalize()
      const start = d.clone().multiplyScalar(0.35 + rand() * 0.55)
      pos[i * 3] = start.x; pos[i * 3 + 1] = start.y; pos[i * 3 + 2] = start.z
      const sp = 0.5 + rand() * rand() * 3.4
      dir[i * 3] = d.x * sp; dir[i * 3 + 1] = d.y * sp + 0.5; dir[i * 3 + 2] = d.z * sp
      sed[i] = rand()
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    g.setAttribute('aDir', new THREE.BufferAttribute(dir, 3))
    g.setAttribute('aSeed', new THREE.BufferAttribute(sed, 1))
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 30)
    return g
  }, [])

  useFrame(() => {
    const active = scroll.index === ACT
    if (root.current) root.current.visible = active
    if (!active) return

    const t = scroll.t

    // Burst: out, back in, out again. A fracture is violent at the start and
    // decelerates, so the outward legs are eased with a fractional power; the
    // repair leg is the same curve read backwards.
    let burst: number
    if (t < HOLD_END) burst = 0
    else if (t < CRISP_END) burst = Math.pow(ramp(t, HOLD_END, CRISP_END), 0.55)
    else if (t < REPAIR_END) burst = Math.pow(1 - ramp(t, CRISP_END, REPAIR_END), 0.9)
    else if (t < MEALY_END) burst = Math.pow(ramp(t, REPAIR_END, MEALY_END), 0.72)
    else burst = 1

    // Turgor hands over during the repair, so the second break is a different
    // fruit in every way that matters.
    const turgor = 1 - smoothstep(CRISP_END + 0.02, REPAIR_END + 0.04, t)

    uniforms.uBurst.value = burst
    uniforms.uTurgor.value = turgor
    signals.burst = burst
    signals.turgor = turgor

    // Juice belongs to the crisp break alone.
    juiceUniforms.uT.value = t < REPAIR_END ? Math.pow(ramp(t, HOLD_END, CRISP_END), 0.6) : 0
    juiceUniforms.uAmount.value = turgor
    if (juice.current) juice.current.visible = turgor > 0.05 && t > HOLD_END && t < REPAIR_END

    // A slow turn while the fruit is whole, frozen the instant it breaks —
    // the pieces carry their own rotation from there.
    if (spin.current) spin.current.rotation.y = -0.5 + t * 0.9 * (1 - burst)

    // Camera has to outrun the debris.
    //
    // At 3.15 + 2.5·spread the frame covered about 2.7 units while the
    // fragments had already spread across 4 — the camera was standing inside
    // the cloud, and shards read as huge plates instead of pieces of fruit.
    const spread = Math.max(burst, 0)
    const dist = 3.4 + spread * 6.5
    // …and follow the debris down. Gravity carries the cloud well below the
    // origin by the end of a break, and a mealy one crumbles almost straight
    // down — aiming at the start point drops it out of the bottom of frame.
    camera.position.set(0, restY + 0.5 + spread * 0.9, dist)
    camera.lookAt(0, restY - spread * 0.4 - spread * spread * 1.5, 0)
  })

  return (
    <group ref={root} visible={false}>
      <group ref={spin} position={[0, restY, 0]}>
        <mesh geometry={geometry} castShadow>
          <CustomShaderMaterial
            baseMaterial={THREE.MeshPhysicalMaterial}
            vertexShader={appleBurstVertex}
            fragmentShader={appleBurstFragment}
            uniforms={uniforms}
            side={THREE.DoubleSide}
            envMapIntensity={0.85}
            clearcoat={1}
          />
        </mesh>

        {/* Juice. */}
        <points ref={juice} geometry={juiceGeo} visible={false}>
          <shaderMaterial
            transparent
            depthWrite={false}
            uniforms={juiceUniforms}
            vertexShader={/* glsl */ `
              attribute vec3 aDir;
              attribute float aSeed;
              uniform float uT;
              uniform float uAmount;
              varying float vA;
              void main() {
                float t = uT;
                vec3 p = position + aDir * t * 1.5;
                p.y -= 3.1 * t * t * (0.4 + aSeed);
                vA = uAmount * (1.0 - smoothstep(0.45, 1.0, t)) * (0.4 + 0.6 * aSeed);
                vec4 mv = modelViewMatrix * vec4(p, 1.0);
                gl_Position = projectionMatrix * mv;
                gl_PointSize = (10.0 + 16.0 * aSeed) / max(0.35, -mv.z);
              }
            `}
            fragmentShader={/* glsl */ `
              varying float vA;
              void main() {
                vec2 c = gl_PointCoord - 0.5;
                float d = length(c);
                if (d > 0.5) discard;
                // A droplet, not a blob: bright core, refractive edge.
                float core = 1.0 - smoothstep(0.0, 0.34, d);
                float edge = smoothstep(0.34, 0.5, d) * (1.0 - smoothstep(0.46, 0.5, d));
                float a = (core * 0.75 + edge * 0.9) * vA;
                if (a < 0.004) discard;
                gl_FragColor = vec4(mix(vec3(1.0, 0.93, 0.74), vec3(1.0), core), a);
              }
            `}
          />
        </points>
      </group>
    </group>
  )
}
