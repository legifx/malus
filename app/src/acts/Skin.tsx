import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Apple } from '../components/Apple'
import { useActReady, HERO_DETAIL } from '../scroll/useActReady'
import { useMalus } from '../store'
import { setPose, setPoseV } from '../scene/CameraRig'
import { scroll } from '../scroll/acts'
import { rng } from '../lib/noise'

/**
 * ACT II — SKIN
 *
 * The act is a demonstration, and it demonstrates exactly one thing: gloss is
 * three numbers, and the brain has cells tuned to all three.
 *
 * Neurons in the monkey inferior temporal cortex respond selectively to gloss
 * along specular reflectance, diffuse reflectance and the spread of the
 * specular lobe, and the population's tuning is biased toward increasing gloss.
 *   research/papers/gloss-perception-.../2012-neural-selectivity-and...md
 *   research/papers/gloss-perception-.../2014-perceptual-gloss-param...md
 *
 * So the camera crawls the cuticle while those three are swept one at a time.
 * The fruit starts matte and dead, the wax arrives, and the highlight
 * contracts to a point. You watch an apple BECOME glossy — which is a thing
 * nobody has seen, because in life all three arrive at once.
 *
 * Then the beat that earns the act its sentence: the shine is not polish. The
 * cuticle deactivates ultraviolet radiation non-radiatively, turning sunlight
 * into heat instead of damage.
 *   research/papers/fruit-cuticle-.../2022-radiationless-mechanis...md
 */

const ACT = 1

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)
const ramp = (t: number, a: number, b: number) => clamp01((t - a) / (b - a))
const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a))
  return t * t * (3 - 2 * t)
}

// Beats: matte, then wax, then the highlight tightens, then ultraviolet.
const WAX_IN = [0.16, 0.42] as const
const TIGHTEN = [0.40, 0.66] as const
const UV_IN = [0.66, 0.80] as const

/**
 * Gate and body are separate components on purpose.
 *
 * Putting `if (!ready) return null` inside the body would sit AFTER the hooks
 * that build the geometry, so everything would still be constructed on the
 * first render and the gate would buy nothing. Only an unmounted subtree
 * actually skips the work.
 */
const _cam = new THREE.Vector3()
const _look = new THREE.Vector3()

export function Skin() {
  const ready = useActReady(1)
  if (!ready) return null
  return <SkinBody />
}

function SkinBody() {
  const quality = useMalus((st) => st.quality)
  const detail = HERO_DETAIL[quality]
  const root = useRef<THREE.Group>(null)
  const uv = useRef<THREE.Points>(null)
  const skinRef = useRef<Record<string, { value: unknown }> | null>(null)

  const uvUniforms = useMemo(() => ({ uT: { value: 0 }, uOn: { value: 0 } }), [])

  // Ultraviolet arriving at the surface. Streams inward along radial paths and
  // is extinguished at the cuticle — the photons do not bounce off, they stop.
  const uvGeo = useMemo(() => {
    const N = 700
    const rand = rng(5150)
    const dir = new Float32Array(N * 3)
    const sed = new Float32Array(N)
    const pos = new Float32Array(N * 3)
    for (let i = 0; i < N; i++) {
      // Biased to the camera-facing side so the effect reads at macro range.
      const a = (rand() - 0.5) * 2.2
      const b = (rand() - 0.5) * 1.7
      const d = new THREE.Vector3(Math.sin(a), Math.sin(b) * 0.8, Math.cos(a)).normalize()
      dir[i * 3] = d.x; dir[i * 3 + 1] = d.y; dir[i * 3 + 2] = d.z
      sed[i] = rand()
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    g.setAttribute('aDir', new THREE.BufferAttribute(dir, 3))
    g.setAttribute('aSeed', new THREE.BufferAttribute(sed, 1))
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 6)
    return g
  }, [])

  useFrame((state) => {
    const active = scroll.index === ACT
    if (root.current) root.current.visible = active
    if (!active) return

    const t = scroll.t
    const u = skinRef.current
    if (u) {
      // The three axes, one at a time.
      //   rhoD is present from the first frame — without diffuse there is
      //   nothing to look at at all.
      //   rhoS brings the cuticle in.
      //   alpha contracts the lobe from a broad sheen to a hard highlight.
      const wax = smoothstep(WAX_IN[0], WAX_IN[1], t)
      const tight = smoothstep(TIGHTEN[0], TIGHTEN[1], t)
      u.uRhoS.value = 0.04 + 0.86 * wax
      u.uRhoD.value = 1.0
      u.uAlpha.value = 0.92 - 0.70 * tight
      u.uWetness.value = 0.05 + 0.22 * tight
      // Detail comes up with the wax, so the surface gains substance rather
      // than merely gaining shine.
      u.uLenticels.value = 0.35 + 0.65 * wax
      u.uBump.value = 0.0022 + 0.0052 * wax
      u.uDetail.value = 2.3
    }

    // Camera crawls the cuticle: close, near-perpendicular, always moving.
    const theta = -0.55 + t * 1.15
    const height = -0.12 + Math.sin(t * 2.4) * 0.22
    const radial = new THREE.Vector3(Math.sin(theta), height, Math.cos(theta)).normalize()
    // Pull back a little as the act proceeds, so the fruit resolves from an
    // abstract landscape into a recognisable apple by the end.
    // Close, but not so close the surface goes flat. At 1.24 the frame was a
    // featureless wall of red: no curvature, therefore no travelling highlight,
    // therefore nothing to see while the three gloss axes were being swept —
    // which is the entire act.
    const dist = 2.05 + smoothstep(0.55, 1.0, t) * 0.85
    _cam.copy(radial).multiplyScalar(dist)
    // Looking down the radial gives a true macro view of the surface.
    _look.copy(radial).multiplyScalar(0.18)
    setPoseV(_cam, _look)

    const on = smoothstep(UV_IN[0], UV_IN[1], t) * (1 - smoothstep(0.93, 1.0, t))
    uvUniforms.uOn.value = on
    uvUniforms.uT.value = state.clock.elapsedTime
    if (uv.current) uv.current.visible = on > 0.01
  })

  return (
    <group ref={root} visible={false}>
      {/* Detail is high because this is the only act where the surface is the
          subject rather than the object. */}
      <Apple
        seed={7}
        detail={detail}
        character={0.38}
        withStem={false}
        onSkinUniforms={(u) => { skinRef.current = u }}
      />

      <points ref={uv} geometry={uvGeo} visible={false}>
        <shaderMaterial
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          uniforms={uvUniforms}
          vertexShader={/* glsl */ `
            attribute vec3 aDir;
            attribute float aSeed;
            uniform float uT;
            uniform float uOn;
            varying float vA;
            varying float vHit;
            void main() {
              // Each photon runs its own inward trip on a staggered cycle.
              float phase = fract(uT * 0.42 + aSeed);
              float r = mix(2.6, 0.97, phase);
              vec3 p = aDir * r;
              // Absorbed at the cuticle: it brightens hard and stops. It does
              // not reflect — that is the whole point of the beat.
              vHit = smoothstep(0.80, 1.0, phase);
              vA = uOn * (0.25 + 0.75 * aSeed) * (1.0 - smoothstep(0.94, 1.0, phase));
              vec4 mv = modelViewMatrix * vec4(p, 1.0);
              gl_Position = projectionMatrix * mv;
              gl_PointSize = (5.0 + 7.0 * aSeed) * (1.0 + vHit * 2.2) / max(0.25, -mv.z);
            }
          `}
          fragmentShader={/* glsl */ `
            varying float vA;
            varying float vHit;
            void main() {
              vec2 c = gl_PointCoord - 0.5;
              float d = 1.0 - smoothstep(0.06, 0.5, length(c));
              // Violet on the way in, warm at the moment of absorption:
              // the radiation is leaving as heat.
              vec3 col = mix(vec3(0.55, 0.35, 1.0), vec3(1.0, 0.62, 0.28), vHit);
              float a = d * vA;
              if (a < 0.004) discard;
              gl_FragColor = vec4(col, a * 0.85);
            }
          `}
        />
      </points>
    </group>
  )
}
