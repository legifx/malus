import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import CustomShaderMaterial from 'three-custom-shader-material'
import { makeAppleGeometry, makeStemGeometry } from '../geometry/apple'
import { appleSkinVertex, appleSkinFragment, APPLE_SKIN_DEFAULTS } from '../materials/appleSkin'

export interface AppleProps {
  seed?: number
  detail?: number
  character?: number
  /** Overrides for the skin uniforms — see materials/appleSkin.ts. */
  skin?: Partial<Record<keyof typeof APPLE_SKIN_DEFAULTS, number>>
  sunDir?: [number, number, number]
  withStem?: boolean
  /** Fires once per geometry with the metrics the acts need for placement. */
  onMetrics?: (m: { restY: number; topY: number }) => void
  /**
   * Hands the live uniform object to the caller so an act can drive the skin
   * per frame. Act II sweeps the three gloss axes with it.
   */
  onSkinUniforms?: (u: Record<string, { value: unknown }>) => void
}

export function Apple({
  seed = 1,
  detail = 40,
  character = 0.55,
  skin,
  sunDir = [0.6, 0.35, 0.7],
  withStem = true,
  onMetrics,
  onSkinUniforms,
}: AppleProps) {
  const geo = useMemo(() => makeAppleGeometry({ seed, detail, character }), [seed, detail, character])

  useEffect(() => {
    onMetrics?.({ restY: geo.userData.restY, topY: geo.userData.topY })
  }, [geo, onMetrics])

  const stem = useMemo(() => (withStem ? makeStemGeometry(seed) : null), [seed, withStem])
  const uniforms = useMemo(() => {
    const merged = { ...APPLE_SKIN_DEFAULTS, ...skin, uSeed: (skin?.uSeed ?? seed * 0.137) % 10 }
    const u: Record<string, { value: unknown }> = {}
    for (const [k, v] of Object.entries(merged)) u[k] = { value: v }
    u.uSunDir = { value: new THREE.Vector3(...sunDir).normalize() }
    return u
    // Uniform object identity must stay stable or CSM rebuilds the program.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed])

  // Declared after `uniforms`, not before it: reading the const from an effect
  // placed above its declaration is a temporal dead zone, not a hoist.
  useEffect(() => {
    onSkinUniforms?.(uniforms)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uniforms])

  // Where the stem meets the fruit — the floor of the well, not the top of the
  // bounding box, or it floats.
  const stemAnchor = useMemo(() => {
    geo.computeBoundingBox()
    const p = geo.attributes.position as THREE.BufferAttribute
    // Lowest point of the stem well: nearest the vertical axis, on the top half.
    let best = Infinity, bx = 0, bz = 0
    const v = new THREE.Vector3()
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i)
      if (v.y <= 0) continue
      if (v.x * v.x + v.z * v.z > 0.030) continue // within ~0.17 of the axis
      if (v.y < best) { best = v.y; bx = v.x; bz = v.z }
    }
    return best === Infinity ? [0, geo.boundingBox!.max.y, 0] : [bx, best - 0.02, bz]
  }, [geo]) as [number, number, number]

  return (
    <group>
      <mesh geometry={geo} castShadow receiveShadow>
        <CustomShaderMaterial
          baseMaterial={THREE.MeshPhysicalMaterial}
          vertexShader={appleSkinVertex}
          fragmentShader={appleSkinFragment}
          uniforms={uniforms}
          // Skin over translucent flesh. Kept subtle: the flesh gets its own
          // treatment once the fruit is cut open in act IV.
          transmission={0}
          sheen={0.35}
          sheenRoughness={0.7}
          sheenColor={new THREE.Color('#ff6a4d')}
          envMapIntensity={1.15}
          clearcoat={1}
        />
      </mesh>

      {stem && (
        <mesh geometry={stem} position={stemAnchor} castShadow>
          <meshStandardMaterial color="#4a3524" roughness={0.86} metalness={0} />
        </mesh>
      )}
    </group>
  )
}
