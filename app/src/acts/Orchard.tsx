import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import CustomShaderMaterial from 'three-custom-shader-material'
import { makeAppleGeometry } from '../geometry/apple'
import { orchardVertex, orchardFragment, ORCHARD_DEFAULTS } from '../materials/orchard'
import { setPose } from '../scene/CameraRig'
import { scroll, signals } from '../scroll/acts'
import { rng } from '../lib/noise'
import { useMalus } from '../store'
import { useActReady } from '../scroll/useActReady'

/**
 * ACT VI — ORCHARD
 *
 * The turn the second half of the piece is built on.
 *
 * Domestication is best modelled as a natural evolutionary response to
 * herbivory: plants recruited humans as seed dispersers, and early
 * domestication traits paid for themselves by doing so. The apple did not get
 * sweet and large and red for us. It got that way because that recruited a
 * species which would carry it across continents.
 *   research/papers/megafauna-seed-dispersal-.../2020-anthropogenic-seed-disper...md
 *
 * So: you were never the farmer. You were the deal.
 *
 * And then the orchard goes out, fruit by fruit, and a handful do not. No
 * number is put on screen — the figures usually quoted for lost cultivars are
 * not in the research library, and BRIEF.md §6 keeps unsourced numbers off the
 * site. The image carries it without them.
 */

const ACT = 5

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)
const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a))
  return t * t * (3 - 2 * t)
}

const COUNT = { high: 6000, mid: 3000, low: 1200 } as const

/**
 * Gate and body are separate components on purpose.
 *
 * Putting `if (!ready) return null` inside the body would sit AFTER the hooks
 * that build the geometry, so everything would still be constructed on the
 * first render and the gate would buy nothing. Only an unmounted subtree
 * actually skips the work.
 */
export function Orchard() {
  const ready = useActReady(5)
  if (!ready) return null
  return <OrchardBody />
}

function OrchardBody() {
  const root = useRef<THREE.Group>(null)
  const mesh = useRef<THREE.InstancedMesh>(null)
  const shadows = useRef<THREE.InstancedMesh>(null)
  const quality = useMalus((s) => s.quality)
  const count = COUNT[quality]

  // Low subdivision on purpose: this is thousands of instances, and the
  // silhouette is what carries at this distance, not the surface.
  const geometry = useMemo(() => makeAppleGeometry({ seed: 3, detail: 5, character: 0.5 }), [])

  const uniforms = useMemo(() => {
    const u: Record<string, { value: unknown }> = {}
    for (const [k, v] of Object.entries(ORCHARD_DEFAULTS)) u[k] = { value: v }
    u.uSunDir = { value: new THREE.Vector3(0.5, 0.5, 0.7).normalize() }
    return u
  }, [])

  // Per-instance identity. Attached to the shared geometry because only this
  // mesh draws it.
  const seeds = useMemo(() => {
    const rand = rng(24601)
    const a = new Float32Array(count)
    for (let i = 0; i < count; i++) a[i] = rand() * 512
    return new THREE.InstancedBufferAttribute(a, 1)
  }, [count])

  useLayoutEffect(() => {
    geometry.setAttribute('aSeed', seeds)
    const m = mesh.current
    if (!m) return
    const rand = rng(1337)
    const dummy = new THREE.Object3D()
    const shade = new THREE.Object3D()
    const restY = geometry.userData.restY as number

    // Planted in rows. An orchard is not a scatter — the rows are the point,
    // because they are the visible half of the bargain the act is about.
    const SPACING = 1.55
    const cols = Math.ceil(Math.sqrt(count * 1.6))
    let i = 0
    for (let r = 0; i < count; r++) {
      for (let c = 0; c < cols && i < count; c++) {
        const x = (c - cols / 2) * SPACING + (rand() - 0.5) * 0.55
        const z = -r * SPACING * 0.92 - rand() * 0.4
        // Thin the far rows so the field fades rather than ending.
        if (r > 6 && rand() > 0.94 - r * 0.0015) { continue }
        const scale = 0.30 + rand() * 0.16
        dummy.position.set(x, restY * scale, z)
        dummy.rotation.set((rand() - 0.5) * 0.25, rand() * Math.PI * 2, (rand() - 0.5) * 0.25)
        dummy.scale.setScalar(scale)
        dummy.updateMatrix()
        m.setMatrixAt(i, dummy.matrix)

        // A painted contact shadow under each fruit. Real shadow maps over a
        // field this wide would need a huge cascade for a handful of pixels;
        // without ANY contact the apples read as spheres floating in the dark,
        // which was the first render's most obvious failure.
        if (shadows.current) {
          shade.position.set(x, 0.012, z)
          shade.rotation.set(-Math.PI / 2, 0, rand() * Math.PI)
          shade.scale.setScalar(scale * 2.6)
          shade.updateMatrix()
          shadows.current.setMatrixAt(i, shade.matrix)
        }
        i++
      }
    }
    m.count = i
    m.instanceMatrix.needsUpdate = true
    m.frustumCulled = false
    if (shadows.current) {
      shadows.current.count = i
      shadows.current.instanceMatrix.needsUpdate = true
      shadows.current.frustumCulled = false
    }
  }, [geometry, seeds, count])

  useFrame(() => {
    const active = scroll.index === ACT
    if (root.current) root.current.visible = active
    if (!active) return

    const t = scroll.t

    // The scale jump. Awe is built on perceived vastness, and vastness here is
    // not a big room — it is going from standing among the fruit to seeing how
    // much of it there is.
    //   research/papers/awe-wonder-.../2022-awe-as-a-pathway-to-me...md
    const rise = smoothstep(0.16, 0.62, t)
    const y = 0.65 + rise * 21.0
    const z = 5.0 - t * 5.5 + rise * 10.0
    setPose(0, y, z, 0, rise * 1.2, z - 9.0 - rise * 16.0)

    const dark = smoothstep(0.58, 0.96, t)
    uniforms.uDark.value = dark
    signals.dark = dark
  })

  return (
    <group ref={root} visible={false}>
      <instancedMesh ref={mesh} args={[geometry, undefined, count]} castShadow>
        <CustomShaderMaterial
          baseMaterial={THREE.MeshStandardMaterial}
          vertexShader={orchardVertex}
          fragmentShader={orchardFragment}
          uniforms={uniforms}
          envMapIntensity={0.85}
        />
      </instancedMesh>

      <instancedMesh ref={shadows} args={[undefined, undefined, count]} renderOrder={1}>
        <planeGeometry args={[1, 1]} />
        <shaderMaterial
          transparent
          depthWrite={false}
          vertexShader={/* glsl */ `
            varying vec2 vUv;
            void main() {
              vUv = uv;
              gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
            }
          `}
          fragmentShader={/* glsl */ `
            varying vec2 vUv;
            void main() {
              float d = length(vUv - 0.5) * 2.0;
              float a = (1.0 - smoothstep(0.10, 1.0, d)) * 0.62;
              if (a < 0.004) discard;
              gl_FragColor = vec4(0.0, 0.0, 0.0, a);
            }
          `}
        />
      </instancedMesh>

      {/* Ground. Unlit and fading by colour, same reasoning as act I. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -30]}>
        <planeGeometry args={[400, 400]} />
        <shaderMaterial
          fragmentShader={/* glsl */ `
            varying vec2 vUv;
            void main() {
              float d = length(vUv - 0.5) * 2.0;
              vec3 near = vec3(0.0250, 0.0180, 0.0120);
              vec3 far  = vec3(0.0125, 0.0092, 0.0078);
              gl_FragColor = vec4(mix(near, far, smoothstep(0.05, 0.55, d)), 1.0);
            }
          `}
          vertexShader={/* glsl */ `
            varying vec2 vUv;
            void main() {
              vUv = uv;
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `}
        />
      </mesh>
    </group>
  )
}
