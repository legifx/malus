import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { ANNOTATIONS, projected } from '../ui/annotations'
import { scroll } from '../scroll/acts'

/**
 * Turns the annotations' world anchors into screen coordinates.
 *
 * Lives inside the Canvas because that is where the camera is; the DOM layer
 * that draws the leader lines only reads the result. Only the current act's
 * anchors are projected — everything else is off screen by definition.
 */
const _v = new THREE.Vector3()

export function Projector() {
  const camera = useThree((s) => s.camera)
  const size = useThree((s) => s.size)

  useFrame(() => {
    for (const a of ANNOTATIONS) {
      const p = projected[a.id]
      if (a.act !== scroll.index) {
        p.visible = false
        continue
      }
      _v.copy(a.anchor).project(camera)
      // z > 1 means the point is behind the camera; a leader line to it would
      // swing across the frame in the wrong direction.
      p.visible = _v.z < 1 && Math.abs(_v.x) < 1.6 && Math.abs(_v.y) < 1.6
      p.x = (_v.x * 0.5 + 0.5) * size.width
      p.y = (-_v.y * 0.5 + 0.5) * size.height
    }
  })

  return null
}
