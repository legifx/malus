import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { rng } from '../lib/noise'

/**
 * The void the apple falls through.
 *
 * Empty black reads as "not loaded yet", not as "vast". Awe needs perceived
 * vastness, and vastness needs something for the eye to measure itself
 * against — so the dark gets a slow vertical gradient, a warm pool of light
 * where the fruit is going to land, and a field of motes that parallax as the
 * camera tilts.
 *   research/papers/awe-wonder-.../2022-awe-as-a-pathway-to-me...md
 */
export function Backdrop({ motes = 900 }: { motes?: number }) {
  const points = useRef<THREE.Points>(null)
  const u = useMemo(() => ({ uTime: { value: 0 } }), [])

  const geo = useMemo(() => {
    const rand = rng(90210)
    const pos = new Float32Array(motes * 3)
    const seed = new Float32Array(motes)
    for (let i = 0; i < motes; i++) {
      // A tall cylindrical shell around the fall line — dense enough near the
      // path to give parallax, sparse enough not to read as snow.
      const a = rand() * Math.PI * 2
      const r = 6 + Math.pow(rand(), 0.55) * 46
      pos[i * 3] = Math.cos(a) * r
      pos[i * 3 + 1] = rand() * 76 - 6
      pos[i * 3 + 2] = Math.sin(a) * r - 8
      seed[i] = rand()
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1))
    return g
  }, [motes])

  useFrame((state) => {
    u.uTime.value = state.clock.elapsedTime
  })

  return (
    <group>
      {/* Sky shell. Rendered first, never writes depth. */}
      <mesh scale={200} renderOrder={-1}>
        <sphereGeometry args={[1, 32, 24]} />
        <shaderMaterial
          side={THREE.BackSide}
          depthWrite={false}
          fog={false}
          vertexShader={/* glsl */ `
            varying vec3 vDir;
            void main() {
              vDir = normalize(position);
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `}
          fragmentShader={/* glsl */ `
            varying vec3 vDir;
            void main() {
              float h = vDir.y * 0.5 + 0.5;
              // Near-black overhead, warming toward the floor: the light the
              // apple is falling toward.
              // Kept very low: ACES plus a 1.16 exposure lifts these hard, and
              // anything above ~0.02 stops reading as void and starts reading
              // as an unlit grey room.
              vec3 top = vec3(0.0055, 0.0048, 0.0046);
              vec3 mid = vec3(0.0145, 0.0102, 0.0082);
              vec3 low = vec3(0.0460, 0.0235, 0.0142);
              vec3 c = mix(low, mid, smoothstep(0.0, 0.46, h));
              c = mix(c, top, smoothstep(0.42, 0.92, h));
              gl_FragColor = vec4(c, 1.0);
            }
          `}
        />
      </mesh>

      {/* Motes. */}
      <points ref={points} geometry={geo} renderOrder={-1}>
        <shaderMaterial
          transparent
          depthWrite={false}
          fog={false}
          blending={THREE.AdditiveBlending}
          uniforms={u}
          vertexShader={/* glsl */ `
            attribute float aSeed;
            uniform float uTime;
            varying float vA;
            void main() {
              vec3 p = position;
              // Barely moving. Motes that drift visibly become snow.
              p.y += sin(uTime * 0.12 + aSeed * 41.0) * 0.5;
              p.x += cos(uTime * 0.09 + aSeed * 27.0) * 0.4;
              vec4 mv = modelViewMatrix * vec4(p, 1.0);
              float dist = -mv.z;
              vA = (0.16 + 0.5 * aSeed) * smoothstep(150.0, 24.0, dist);
              gl_Position = projectionMatrix * mv;
              gl_PointSize = (7.0 + 9.0 * aSeed) / max(1.0, dist * 0.16);
            }
          `}
          fragmentShader={/* glsl */ `
            varying float vA;
            void main() {
              vec2 c = gl_PointCoord - 0.5;
              float d = 1.0 - smoothstep(0.10, 0.5, length(c));
              float a = d * vA;
              if (a < 0.003) discard;
              gl_FragColor = vec4(vec3(1.0, 0.80, 0.62), a);
            }
          `}
        />
      </points>
    </group>
  )
}
