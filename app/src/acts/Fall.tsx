import { useMemo, useRef, useState, useCallback } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { Apple } from '../components/Apple'
import { useActReady, HERO_DETAIL } from '../scroll/useActReady'
import { useMalus } from '../store'
import { scroll, signals } from '../scroll/acts'
import { rng } from '../lib/noise'

/**
 * ACT I — FALL
 *
 * The premise of the whole scroll spine, stated in the first act: scrolling is
 * gravity. Distance fallen goes with the SQUARE of scroll progress, so speed
 * rises linearly — the reader's own hand supplies the acceleration, and because
 * position is a pure function of scroll it scrubs perfectly in both directions.
 *
 * Nothing here runs on a timer. Reverse the scroll and the apple un-falls, the
 * shockwave collapses back into the ground and the dust returns.
 */

const ACT = 0
const IMPACT_AT = 0.66 // fraction of the act spent falling

const START = new THREE.Vector3(1.2, 58, -22)
const REST = new THREE.Vector3(0, 0, 0)

// Aimed along the line to the apple's start, a few degrees below it, so the
// fruit sits in the upper third instead of on the edge of the frame. With a
// 34° vertical fov the usable half-angle is 17° — the earlier target put the
// apple at 17.4° and clipped it.
// Framed so the landed fruit occupies the upper half and leaves the lower
// third clear for the wordmark. Aiming below the apple lifts it in frame.
const GROUND_LOOK = new THREE.Vector3(0, 0.2, 0)
const CAM_HIGH = new THREE.Vector3(0, 4.5, 11)
const CAM_LOW = new THREE.Vector3(0, 2.0, 8.0)

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)
const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a))
  return t * t * (3 - 2 * t)
}

export function Fall() {
  const quality = useMalus((st) => st.quality)
  const detail = HERO_DETAIL[quality]
  const root = useRef<THREE.Group>(null)
  const grp = useRef<THREE.Group>(null)
  const inner = useRef<THREE.Group>(null)
  const shock = useRef<THREE.Mesh>(null)
  const dust = useRef<THREE.Points>(null)
  const [restY, setRestY] = useState(0.87)
  const camera = useThree((s) => s.camera)

  const onMetrics = useCallback((m: { restY: number }) => setRestY(m.restY), [])

  const shockUniforms = useMemo(
    () => ({ uT: { value: 0 }, uRadius: { value: 0 }, uColor: { value: new THREE.Color('#ff7a3d') } }),
    [],
  )
  const dustUniforms = useMemo(() => ({ uT: { value: 0 }, uSize: { value: 26 } }), [])

  // Dust burst. Directions are fixed at build time so the burst is identical
  // every time the reader scrubs back over the impact — a burst that reshuffles
  // itself breaks the illusion that this is one continuous event.
  const dustGeo = useMemo(() => {
    const N = 520
    const rand = rng(4242)
    const pos = new Float32Array(N * 3)
    const dir = new Float32Array(N * 3)
    const seedA = new Float32Array(N)
    for (let i = 0; i < N; i++) {
      const a = rand() * Math.PI * 2
      // Low, flat spray: dust thrown out by an impact hugs the ground.
      const lift = 0.06 + rand() * rand() * 0.55
      const sp = 0.35 + rand() * rand() * 2.6
      dir[i * 3] = Math.cos(a) * sp
      dir[i * 3 + 1] = lift * sp
      dir[i * 3 + 2] = Math.sin(a) * sp
      seedA[i] = rand()
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    g.setAttribute('aDir', new THREE.BufferAttribute(dir, 3))
    g.setAttribute('aSeed', new THREE.BufferAttribute(seedA, 1))
    return g
  }, [])

  useFrame(() => {
    const active = scroll.index === ACT
    if (root.current) root.current.visible = active
    if (!active) return

    const t = scroll.t
    const fallT = clamp01(t / IMPACT_AT)
    // Free fall: s = ½gt². The reader is the g.
    const travelled = fallT * fallT
    const after = clamp01((t - IMPACT_AT) / (1 - IMPACT_AT))

    const end = REST.clone().setY(restY)
    const p = new THREE.Vector3().lerpVectors(START, end, travelled)

    // Squash on landing, then recover. Brief, "juice": the impact needs a
    // physical consequence on the object, not just on the environment.
    const squash = Math.exp(-after * 9) * Math.sin(after * 26) * 0.16 * (after > 0 ? 1 : 0)

    // Motion stretch must follow SPEED, not distance fallen. Tying it to
    // travelled distance leaves the apple stretched after it has stopped —
    // it reads as a dome, not as a fruit. Speed goes with fallT and is
    // released just before contact so the squash can take over.
    const speed = fallT * (1 - smoothstep(0.93, 1.0, fallT))
    const stretch = 1 + 0.45 * speed * speed

    if (grp.current) {
      grp.current.position.copy(p)
      const sy = stretch * (1 - squash)
      const sxz = 1 / Math.sqrt(sy)
      grp.current.scale.set(sxz, sy, sxz)
    }
    if (inner.current) {
      // Tumble while falling, land upright.
      //
      // The TIP has to reach zero exactly at contact. restY is measured on the
      // unrotated geometry, so a fruit that is still tipped over when it lands
      // sinks through the floor — and the ground plane, being nearer to the
      // camera along those rays, paints over the submerged half. The apple
      // comes out looking like a dome.
      //
      // Yaw is safe to keep: rotating about the vertical axis cannot change how
      // far the lowest point sits below the centre.
      const tip = (1 - Math.pow(fallT, 2.2)) * (1 - after)
      inner.current.rotation.set(tip * 1.5, fallT * 2.3 + after * 0.12, tip * 0.65)
    }

    // Camera.
    //
    // It has to TRACK. A locked-off camera cannot hold a fall of this length:
    // interpolating the look target from "sky" to "ground" on its own schedule
    // put the apple 40° off axis at mid-fall, against a 17° half-fov — the
    // middle of the act was pointed at empty space.
    //
    // So the target follows the fruit, held below it so it sits above centre
    // and reads as falling INTO frame, and only hands over to the impact point
    // in the last stretch.
    camera.position.lerpVectors(CAM_HIGH, CAM_LOW, smoothstep(0.0, 1.0, fallT))
    const lead = 0.35 + 2.2 * (1 - fallT)
    const look = p.clone().setY(p.y - lead)
    look.lerp(GROUND_LOOK, smoothstep(0.86, 1.0, fallT))
    camera.lookAt(look)

    // Shockwave.
    shockUniforms.uT.value = after
    shockUniforms.uRadius.value = Math.pow(after, 0.55)
    if (shock.current) shock.current.visible = after > 0.001

    signals.impact = after
    dustUniforms.uT.value = after
    if (dust.current) dust.current.visible = after > 0.001
  })

  return (
    // Three separate levels, and the split matters:
    //   root  — visibility only, never transformed
    //   grp   — the apple's fall position and impact squash
    //   inner — the tumble
    // The ground, shockwave and dust MUST hang off root, not off grp. As
    // children of the falling group they inherited its position: the floor fell
    // with the fruit and came to rest at the fruit's own centre height, slicing
    // it in half at the equator, and spent the whole fall floating 58 units up.
    <group ref={root}>
      <group ref={grp}>
        <group ref={inner}>
          <Apple seed={7} detail={detail} character={0.38} onMetrics={onMetrics} />
        </group>
      </group>

      {/* Shockwave ring on the ground. Additive, so it reads as light thrown
          out of the contact point rather than as a decal lying on top of it. */}
      <mesh ref={shock} position={[0, 0.004, 0]} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
        <planeGeometry args={[26, 26]} />
        <shaderMaterial
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          uniforms={shockUniforms}
          vertexShader={/* glsl */ `
            varying vec2 vUv;
            void main() {
              vUv = uv;
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `}
          fragmentShader={/* glsl */ `
            varying vec2 vUv;
            uniform float uT;
            uniform float uRadius;
            uniform vec3 uColor;
            void main() {
              float d = length(vUv - 0.5) * 2.0;
              float r = uRadius;
              // Sharp leading edge, long trailing wake — the shape of a real
              // pressure front, and it reads as speed rather than as a circle.
              float lead = smoothstep(r + 0.035, r, d);
              float wake = smoothstep(r - 0.34, r, d);
              float ring = lead * wake;
              float fade = pow(1.0 - uT, 1.6) * smoothstep(1.0, 0.25, d);
              float a = ring * fade;
              if (a < 0.002) discard;
              gl_FragColor = vec4(uColor * (0.6 + 1.6 * ring), a * 0.85);
            }
          `}
        />
      </mesh>

      {/* Dust. */}
      <points ref={dust} geometry={dustGeo} visible={false}>
        <shaderMaterial
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          uniforms={dustUniforms}
          vertexShader={/* glsl */ `
            attribute vec3 aDir;
            attribute float aSeed;
            uniform float uT;
            uniform float uSize;
            varying float vA;
            void main() {
              // Ballistic, with drag: fast out, then settling.
              float t = uT;
              float ease = 1.0 - exp(-t * 3.4);
              vec3 p = aDir * ease * 2.4;
              p.y -= 1.9 * t * t * (0.4 + aSeed);       // falls back down
              p.y = max(p.y, 0.006);
              vA = (1.0 - smoothstep(0.35, 1.0, t)) * (0.35 + 0.65 * aSeed);
              vec4 mv = modelViewMatrix * vec4(p, 1.0);
              gl_Position = projectionMatrix * mv;
              gl_PointSize = uSize * (0.35 + aSeed) / max(0.4, -mv.z);
            }
          `}
          fragmentShader={/* glsl */ `
            varying float vA;
            void main() {
              vec2 c = gl_PointCoord - 0.5;
              float d = 1.0 - smoothstep(0.16, 0.5, length(c));
              if (d * vA < 0.004) discard;
              gl_FragColor = vec4(vec3(1.0, 0.72, 0.48), d * vA * 0.5);
            }
          `}
        />
      </points>

      {/* Ground.
          A lit standard material picks up the whole studio rig and ends up
          BRIGHTER than the sky, which turns the void into a beige studio
          floor. So this is unlit, and fades radially to nothing — no horizon
          line, no visible disc edge, just something for the fruit to land on
          and for the shockwave to travel across. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[60, 96]} />
        {/* Opaque, and it fades by COLOUR rather than by alpha.
            A transparent floor is sorted into the blended pass, where a large
            plane whose object origin sits nearer the camera than the fruit gets
            painted over the fruit's lower half — the apple comes out sliced
            flat with a ghost of itself underneath. Converging the colour to the
            void instead gives the same vanishing horizon with none of that. */}
        <shaderMaterial
          vertexShader={/* glsl */ `
            varying vec2 vUv;
            void main() {
              vUv = uv;
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `}
          fragmentShader={/* glsl */ `
            varying vec2 vUv;
            void main() {
              float d = length(vUv - 0.5) * 2.0;
              // A faint warm pool under the point of contact.
              float pool = exp(-d * 13.0) * 0.20;
              vec3 near = vec3(0.0290, 0.0182, 0.0132) + vec3(0.30, 0.13, 0.06) * pool;
              vec3 far  = vec3(0.0130, 0.0094, 0.0080); // the void, so the disc has no edge
              gl_FragColor = vec4(mix(near, far, smoothstep(0.10, 0.92, d)), 1.0);
            }
          `}
        />
      </mesh>
    </group>
  )
}
