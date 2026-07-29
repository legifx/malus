import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import CustomShaderMaterial from 'three-custom-shader-material'
import { makeFracturedApple } from '../geometry/fracture'
import { appleBurstVertex, appleBurstFragment, APPLE_BURST_DEFAULTS } from '../materials/appleBurst'
import { useActReady, FRACTURE } from '../scroll/useActReady'
import { useMalus } from '../store'
import { setPose } from '../scene/CameraRig'
import { scroll, signals } from '../scroll/acts'
import { rng } from '../lib/noise'

/**
 * ACT III — BITE
 *
 * Two apples, side by side, broken at the same instant.
 *
 * This act used to break one fruit, run the pieces backwards into a whole
 * apple, and break it again with the turgor turned down. The science was right
 * and the staging was wrong: nobody can compare two things they saw thirty
 * seconds apart, so it read as one apple exploding twice — and the reassembly
 * in the middle looked like a glitch rather than an argument.
 *
 * A difference has to be shown side by side to be seen at all. Same scroll,
 * same instant, same camera. Left is turgid, right is not, and every channel
 * carries the distinction at once:
 *
 *   crisp — the crack runs THROUGH the cells. They burst under their own
 *     pressure: a fast, wide throw, many fine shards, wet glossy faces, and the
 *     contents of every ruptured cell thrown out as juice.
 *   mealy — the crack runs BETWEEN them, along the middle lamella. The cells
 *     separate whole and dry: a slow slump, few blunt lumps, chalky faces that
 *     are a mosaic of intact cells, and a puff of dry debris instead of juice.
 *
 *   research/papers/turgor-pressure-.../1999-comparison-of-softenin...md
 */

const ACT = 2

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)
const ramp = (t: number, a: number, b: number) => clamp01((t - a) / (b - a))
const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a))
  return t * t * (3 - 2 * t)
}

const HOLD_END = 0.20
const BREAK_END = 0.66

const ORIGIN = new THREE.Vector3(0.2, 0.15, 0.96).normalize()
/** Half the distance between the two fruits. */
export const BITE_SPREAD = 1.62

export function Bite() {
  const ready = useActReady(2)
  if (!ready) return null
  return <BiteBody />
}

function BiteBody() {
  const quality = useMalus((st) => st.quality)
  const root = useRef<THREE.Group>(null)
  const spinL = useRef<THREE.Group>(null)
  const spinR = useRef<THREE.Group>(null)
  const juice = useRef<THREE.Points>(null)
  const dust = useRef<THREE.Points>(null)

  // Two fracture sets, and the counts are part of the argument: a crisp break
  // shatters finely, a mealy one comes apart in a few blunt pieces.
  const crisp = useMemo(
    () => makeFracturedApple({
      ...FRACTURE[quality],
      cells: Math.round(FRACTURE[quality].cells * 1.25),
      seed: 7, origin: ORIGIN, character: 0.38,
    }),
    [quality],
  )
  const mealy = useMemo(
    () => makeFracturedApple({
      ...FRACTURE[quality],
      cells: Math.round(FRACTURE[quality].cells * 0.5),
      seed: 12, origin: ORIGIN, character: 0.44,
    }),
    [quality],
  )

  const uCrisp = useMemo(() => mkUniforms(1), [])
  const uMealy = useMemo(() => mkUniforms(0), [])

  const juiceU = useMemo(() => ({ uT: { value: 0 } }), [])
  const dustU = useMemo(() => ({ uT: { value: 0 } }), [])

  // Juice is thrown hard; dust barely leaves the fruit and settles straight
  // back down. Directions are fixed at build time so scrubbing back over the
  // break replays exactly the same event.
  const juiceGeo = useMemo(() => burstGeo(31337, 850, 0.55, 3.6), [])
  const dustGeo = useMemo(() => burstGeo(5150, 520, 0.05, 0.5), [])

  useFrame(() => {
    const active = scroll.index === ACT
    if (root.current) root.current.visible = active
    if (!active) return

    const t = scroll.t
    const burst = t < HOLD_END ? 0 : Math.pow(ramp(t, HOLD_END, BREAK_END), 0.62)

    uCrisp.uBurst.value = burst
    uMealy.uBurst.value = burst
    signals.burst = burst
    // The crunch belongs to the left-hand fruit: it is the one with a sound.
    signals.turgor = 1

    const spin = -0.4 + t * 0.7 * (1 - burst)
    if (spinL.current) spinL.current.rotation.y = spin
    if (spinR.current) spinR.current.rotation.y = spin + 0.9

    juiceU.uT.value = burst
    dustU.uT.value = burst
    if (juice.current) juice.current.visible = burst > 0.001
    if (dust.current) dust.current.visible = burst > 0.001

    // Wide enough to hold both fruits and their debris, closing in a little at
    // the end so the two fracture faces can be compared directly.
    // Both fruits sit at y = 0, so aiming at 0.72 pushed the whole pair below
    // the axis and off the bottom of the frame. The pair spans roughly ±2.6
    // before any debris, which needs about eight units of distance to hold.
    // The debris settles below where the fruit stood, so the aim has to come
    // down with it — otherwise both piles slide out of the bottom of frame
    // while the camera keeps looking at empty air.
    const close = smoothstep(0.74, 1.0, t)
    const dist = 7.8 + burst * 3.2 - close * 1.0
    setPose(0, 0.80 + burst * 0.30, dist, 0, 0.05 - burst * 0.80, 0)
  })

  return (
    <group ref={root} visible={false}>
      <group position={[-BITE_SPREAD, 0, 0]}>
        <group ref={spinL}>
          <mesh geometry={crisp.geometry}>
            <CustomShaderMaterial
              baseMaterial={THREE.MeshPhysicalMaterial}
              vertexShader={appleBurstVertex}
              fragmentShader={appleBurstFragment}
              uniforms={uCrisp}
              side={THREE.DoubleSide}
              envMapIntensity={0.85}
              clearcoat={1}
            />
          </mesh>
        </group>
      </group>

      <group position={[BITE_SPREAD, 0, 0]}>
        <group ref={spinR}>
          <mesh geometry={mealy.geometry}>
            <CustomShaderMaterial
              baseMaterial={THREE.MeshPhysicalMaterial}
              vertexShader={appleBurstVertex}
              fragmentShader={appleBurstFragment}
              uniforms={uMealy}
              side={THREE.DoubleSide}
              envMapIntensity={0.85}
              clearcoat={1}
            />
          </mesh>
        </group>
      </group>

      {/* Juice — the left-hand fruit only. Not a tint on a shared effect: a
          mealy apple has nothing to release, and that absence is half of what
          the act is showing. */}
      <points ref={juice} geometry={juiceGeo} position={[-BITE_SPREAD, 0, 0]} visible={false}>
        <shaderMaterial
          transparent
          depthWrite={false}
          uniforms={juiceU}
          vertexShader={/* glsl */ `
            attribute vec3 aDir;
            attribute float aSeed;
            uniform float uT;
            varying float vA;
            void main() {
              float t = uT;
              vec3 p = position + aDir * t * 1.6;
              p.y -= 3.1 * t * t * (0.4 + aSeed);
              vA = (1.0 - smoothstep(0.55, 1.0, t)) * (0.45 + 0.55 * aSeed);
              vec4 mv = modelViewMatrix * vec4(p, 1.0);
              gl_Position = projectionMatrix * mv;
              gl_PointSize = (13.0 + 20.0 * aSeed) / max(0.35, -mv.z);
            }
          `}
          fragmentShader={/* glsl */ `
            varying float vA;
            void main() {
              vec2 c = gl_PointCoord - 0.5;
              float d = length(c);
              if (d > 0.5) discard;
              // A droplet, not a sprite. The previous version drew a bright
              // ring at the rim, which at this size read as a little star or a
              // text glyph rather than as liquid.
              //
              // A real drop is a lens: a soft body, a hard specular dot high on
              // one side, and a darker edge where the surface turns away.
              float body = 1.0 - smoothstep(0.18, 0.5, d);
              float edge = smoothstep(0.34, 0.5, d);
              float spec = 1.0 - smoothstep(0.0, 0.10, length(c - vec2(-0.13, 0.15)));

              vec3 col = mix(vec3(0.96, 0.86, 0.60), vec3(0.72, 0.56, 0.30), edge);
              col += vec3(1.0, 0.97, 0.90) * spec * 0.9;

              float a = (body * 0.85 + spec * 0.6) * vA;
              if (a < 0.004) discard;
              gl_FragColor = vec4(col, min(1.0, a));
            }
          `}
        />
      </points>

      {/* Dry debris — the right-hand fruit only. A mealy break releases dust,
          not liquid, and having something come off both fruits keeps the
          comparison about WHAT is released rather than whether anything is. */}
      <points ref={dust} geometry={dustGeo} position={[BITE_SPREAD, 0, 0]} visible={false}>
        <shaderMaterial
          transparent
          depthWrite={false}
          uniforms={dustU}
          vertexShader={/* glsl */ `
            attribute vec3 aDir;
            attribute float aSeed;
            uniform float uT;
            varying float vA;
            void main() {
              // Barely thrown, and it settles almost immediately.
              float t = pow(uT, 1.5);
              vec3 p = position + aDir * t * 0.9;
              p.y -= 2.2 * t * t * (0.5 + aSeed);
              vA = (1.0 - smoothstep(0.5, 1.0, t)) * (0.18 + 0.30 * aSeed);
              vec4 mv = modelViewMatrix * vec4(p, 1.0);
              gl_Position = projectionMatrix * mv;
              gl_PointSize = (5.0 + 7.0 * aSeed) / max(0.35, -mv.z);
            }
          `}
          fragmentShader={/* glsl */ `
            varying float vA;
            void main() {
              vec2 c = gl_PointCoord - 0.5;
              float d = 1.0 - smoothstep(0.1, 0.5, length(c));
              float a = d * vA;
              if (a < 0.004) discard;
              // Chalky and colourless. Dry tissue, not light.
              gl_FragColor = vec4(vec3(0.80, 0.76, 0.68), a);
            }
          `}
        />
      </points>
    </group>
  )
}

function mkUniforms(turgor: number) {
  const u: Record<string, { value: unknown }> = {}
  for (const [k, v] of Object.entries(APPLE_BURST_DEFAULTS)) u[k] = { value: v }
  u.uTurgor = { value: turgor }
  u.uSunDir = { value: new THREE.Vector3(0.6, 0.35, 0.7).normalize() }
  u.uOrigin = { value: ORIGIN.clone().multiplyScalar(0.75) }
  return u
}

/** Emitter cloud shared by juice and dust; only the ballistics differ. */
function burstGeo(seed: number, n: number, lift: number, speed: number) {
  const rand = rng(seed)
  const pos = new Float32Array(n * 3)
  const dir = new Float32Array(n * 3)
  const sed = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    const u = rand() * 2 - 1
    const a = rand() * Math.PI * 2
    const r = Math.sqrt(1 - u * u)
    const d = new THREE.Vector3(r * Math.cos(a), u, r * Math.sin(a))
    d.lerp(ORIGIN, 0.35).normalize()
    const start = d.clone().multiplyScalar(0.3 + rand() * 0.5)
    pos[i * 3] = start.x; pos[i * 3 + 1] = start.y; pos[i * 3 + 2] = start.z
    const sp = 0.4 + rand() * rand() * speed
    dir[i * 3] = d.x * sp
    dir[i * 3 + 1] = d.y * sp + lift
    dir[i * 3 + 2] = d.z * sp
    sed[i] = rand()
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  g.setAttribute('aDir', new THREE.BufferAttribute(dir, 3))
  g.setAttribute('aSeed', new THREE.BufferAttribute(sed, 1))
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 30)
  return g
}
