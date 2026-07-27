import { Canvas } from '@react-three/fiber'
import { EffectComposer, Bloom, Vignette, ChromaticAberration } from '@react-three/postprocessing'
import { PerformanceMonitor } from '@react-three/drei'
import { BlendFunction } from 'postprocessing'
import * as THREE from 'three'
import { Studio } from './components/Studio'
import { Backdrop } from './components/Backdrop'
import { Fall } from './acts/Fall'
import { Bite } from './acts/Bite'
import { Skin } from './acts/Skin'
import { Star } from './acts/Star'
import { Time } from './acts/Time'
import { Orchard } from './acts/Orchard'
import { Seed } from './acts/Seed'
import { Overlay } from './ui/Overlay'
import { ScrollDriver } from './scroll/ScrollDriver'
import { useMalus, detectQuality } from './store'
import { useEffect, useState } from 'react'
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

  // Resolution is the first thing to give, not the last. Halving pixel density
  // costs far less perceptually than losing bloom or the orchard's population,
  // and act VI is where a weak machine will feel it.
  //
  // Anchored to the device's OWN pixel ratio. A fixed 1.5 on a 1x display is
  // 2.25x the pixels for no visible gain — measured, and it cost most of the
  // frame rate.
  const maxDpr = Math.min(typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1, 1.75)
  const [dpr, setDpr] = useState(maxDpr)

  return (
    <>
      <div className="stage">
        <Canvas
          shadows
          dpr={dpr}
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
          <PerformanceMonitor
            factor={1}
            onChange={({ factor }) =>
              setDpr(Math.round(Math.max(0.65, 0.65 + factor * (maxDpr - 0.65)) * 20) / 20)
            }
          />
          <Backdrop />
          <Studio />
          <Fall />
          <Skin />
          <Bite />
          <Star />
          <Time />
          <Orchard />
          <Seed />
          <Effects />
        </Canvas>
      </div>

      <Overlay />
      <ScrollDriver />
    </>
  )
}
