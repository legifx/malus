import { Environment, Lightformer } from '@react-three/drei'

/**
 * Studio lighting.
 *
 * Built entirely from lightformers rendered into a procedural environment map —
 * no HDRI download, no CDN dependency, nothing to go missing on deploy. The
 * rig is a product-photography setup: a broad key, a narrow rim to draw the
 * silhouette, and two long strip lights whose reflections travel across the
 * fruit as it turns. Those travelling strips are what sell the wax.
 */
export function Studio({ intensity = 1 }: { intensity?: number }) {
  return (
    <>
      <Environment resolution={512} frames={1}>
        {/* Key — softbox. Kept modest and far: a big near rect reflects as a
            recognisable bright rectangle in the wax, which reads as CG. */}
        <Lightformer
          form="rect"
          intensity={2.2 * intensity}
          color="#fff4e8"
          scale={[5, 5, 1]}
          position={[-6, 7.5, 7]}
          target={[0, 0, 0]}
        />
        {/* Rim — small, hot, behind. Separates the fruit from the dark. */}
        <Lightformer
          form="rect"
          intensity={7 * intensity}
          color="#ffd9b0"
          scale={[3.2, 3.2, 1]}
          position={[4.5, 2.5, -6]}
          target={[0, 0, 0]}
        />
        {/* Two vertical strips: the highlights that slide as the apple turns. */}
        <Lightformer
          form="rect"
          intensity={4.2 * intensity}
          color="#ffffff"
          scale={[0.5, 12, 1]}
          position={[6, 1, 2]}
          target={[0, 0, 0]}
        />
        <Lightformer
          form="rect"
          intensity={2.6 * intensity}
          color="#ffe6cc"
          scale={[0.4, 10, 1]}
          position={[-6.5, 0.5, -1]}
          target={[0, 0, 0]}
        />
      </Environment>

      {/* Fill from below comes from a hemisphere light, not a lightformer.
          Anything with an outline placed under the fruit gets mirrored in the
          wax — a ring reflects as a visible ring, which is exactly the artefact
          that makes a render look staged. */}
      <hemisphereLight args={['#6d84a8', '#241812', 0.55]} />

      {/* A real directional light so we get a cast shadow with actual contact. */}
      <directionalLight
        position={[-4.5, 7, 4]}
        intensity={2.1 * intensity}
        color="#fff2e0"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
      >
        <orthographicCamera attach="shadow-camera" args={[-4, 4, 4, -4, 0.1, 24]} />
      </directionalLight>
      <ambientLight intensity={0.12 * intensity} color="#42506b" />
    </>
  )
}
