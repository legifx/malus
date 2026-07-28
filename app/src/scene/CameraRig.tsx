import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { scroll, signals } from '../scroll/acts'

/**
 * One camera for the whole piece.
 *
 * Acts used to set camera.position and call lookAt themselves, which meant the
 * camera TELEPORTED the instant the scroll crossed an act boundary — the single
 * biggest reason the sections felt chopped apart. Now they only publish where
 * they would like the camera to be, and this drives toward it.
 *
 * The smoothing is exponential and frame-rate independent. Within an act the
 * requested pose moves slowly, so the camera tracks it essentially exactly; at
 * a boundary the request jumps and the same smoothing turns that into a short
 * glide. One mechanism, no special cases.
 */

export const pose = {
  pos: new THREE.Vector3(0, 4.5, 11),
  target: new THREE.Vector3(0, 0, 0),
  /** Field of view an act would like. Also eased. */
  fov: 34,
}

const _p = new THREE.Vector3()
const _t = new THREE.Vector3()

/** Acts call this instead of touching the camera. */
export function setPose(
  px: number, py: number, pz: number,
  tx: number, ty: number, tz: number,
  fov = 34,
) {
  pose.pos.set(px, py, pz)
  pose.target.set(tx, ty, tz)
  pose.fov = fov
}

export function setPoseV(p: THREE.Vector3, t: THREE.Vector3, fov = 34) {
  pose.pos.copy(p)
  pose.target.copy(t)
  pose.fov = fov
}

/** Seconds to close most of the gap. Short enough to feel attached, long
 *  enough that a boundary jump becomes a move rather than a cut. */
const TAU = 0.16

export function CameraRig() {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera
  const scene = useThree((s) => s.scene)
  const cur = useMemo(
    () => ({ pos: pose.pos.clone(), tgt: pose.target.clone(), fov: pose.fov }),
    [],
  )
  const lastAct = useRef(-1)
  const frames = useRef(0)

  useFrame((_, dt) => {
    // The curtain lifts on evidence, not on a timer: the environment map needs
    // a few real frames before anything is lit, and on a slow machine that is
    // long enough to see. Counting frames covers every machine correctly
    // instead of guessing a delay that is wrong on both ends.
    if (frames.current < 8) {
      frames.current++
      if (frames.current >= 8) signals.ready = 1
    }

    // A very large jump — the reader threw the scrollbar across three acts —
    // should not be a two-second swoop through the whole scene. Snap instead.
    const jumped = Math.abs(scroll.index - lastAct.current) > 1
    lastAct.current = scroll.index

    const k = jumped ? 1 : 1 - Math.exp(-Math.min(dt, 0.1) / TAU)

    cur.pos.lerp(_p.copy(pose.pos), k)
    cur.tgt.lerp(_t.copy(pose.target), k)
    cur.fov += (pose.fov - cur.fov) * k

    // Exposed for the headless tools: makes "where is the camera actually
    // pointing" answerable instead of guessable.
    ;(window as unknown as Record<string, unknown>).__pose = {
      want: pose.pos.toArray(), at: cur.pos.toArray(), target: pose.target.toArray(),
    }
    camera.position.copy(cur.pos)
    camera.lookAt(cur.tgt)
    ;(window as unknown as Record<string, unknown>).__scene = scene
    if (Math.abs(camera.fov - cur.fov) > 0.01) {
      camera.fov = cur.fov
      camera.updateProjectionMatrix()
    }
  })

  return null
}
