import { Canvas } from '@react-three/fiber'
import { EffectComposer, Bloom, Vignette, ChromaticAberration } from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'
import * as THREE from 'three'
import { Studio } from './components/Studio'
import { Backdrop } from './components/Backdrop'
import { Fall } from './acts/Fall'
import { Bite } from './acts/Bite'
import { Skin } from './acts/Skin'
import { Star } from './acts/Star'
import { Time } from './acts/Time'
import { Overlay } from './ui/Overlay'
import { ScrollDriver } from './scroll/ScrollDriver'
import { useMalus, detectQuality } from './store'
import { useEffect } from 'react'
import './ui/overlay.css'

function Effects() {
  const quality = useMalus((s) => s.quality)
  if (quality === 'low') {
    return (
      <EffectComposer>
        <Vignette offset={0.28} darkness={0.72} />
      </EffectComposer>
    )
  }
  return (
    <EffectComposer multisampling={quality === 'high' ? 4 : 0}>
      {/* Only genuinely bright things bloom — the shockwave and the specular
          highlights. A low threshold turns the whole frame to soup. */}
      <Bloom mipmapBlur luminanceThreshold={0.82} luminanceSmoothing={0.28} intensity={0.72} />
      <ChromaticAberration
        blendFunction={BlendFunction.NORMAL}
        offset={new THREE.Vector2(0.00042, 0.00052)}
        radialModulation
        modulationOffset={0.35}
      />
      <Vignette offset={0.12} darkness={0.42} />
    </EffectComposer>
  )
}

export function App() {
  const setQuality = useMalus((s) => s.setQuality)
  useEffect(() => setQuality(detectQuality()), [setQuality])

  return (
    <>
      <div className="stage">
        <Canvas
          shadows
          dpr={[1, 1.75]}
          gl={{ antialias: false, alpha: false, powerPreference: 'high-performance' }}
          camera={{ position: [0, 3.4, 9.2], fov: 34, near: 0.1, far: 260 }}
          onCreated={({ gl, scene }) => {
            // Act IV cuts the fruit with clipping planes rather than by
            // rebuilding the mesh, which needs local clipping switched on.
            gl.localClippingEnabled = true
            gl.toneMapping = THREE.ACESFilmicToneMapping
            gl.toneMappingExposure = 1.16
            // Background comes from Backdrop, not a flat clear colour.
            // Depth for the long fall: the apple emerges out of the dark
            // rather than simply being small at the start.
            scene.fog = new THREE.Fog('#0a0705', 34, 165)
          }}
        >
          <Backdrop />
          <Studio />
          <Fall />
          <Skin />
          <Bite />
          <Star />
          <Time />
          <Effects />
        </Canvas>
      </div>

      <Overlay />
      <ScrollDriver />
    </>
  )
}
