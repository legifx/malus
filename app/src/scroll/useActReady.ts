import { useEffect, useState } from 'react'
import { scroll } from './acts'
import type { Quality } from '../store'

/**
 * Heavy acts build themselves shortly before they are needed.
 *
 * Every act generating its geometry at load put 133 MB on the heap and stalled
 * the main thread before the first frame — for five acts the reader will not
 * reach for minutes. This mounts an act once the scroll comes within `lead`
 * acts of it, and never unmounts: rebuilding on every approach would stutter
 * exactly where the piece must not.
 */
export function useActReady(act: number, lead = 1) {
  const [ready, setReady] = useState(() => Math.abs(scroll.index - act) <= lead)

  useEffect(() => {
    if (ready) return
    let raf = 0
    const check = () => {
      if (Math.abs(scroll.index - act) <= lead) {
        setReady(true)
        return
      }
      raf = requestAnimationFrame(check)
    }
    raf = requestAnimationFrame(check)
    return () => cancelAnimationFrame(raf)
  }, [act, lead, ready])

  return ready
}

/**
 * One subdivision for every full-apple act.
 *
 * Not a style choice — makeAppleGeometry caches on its parameters, so acts that
 * ask for 40, 44 and 56 get three separate 30k-triangle geometries while acts
 * that all ask for the same number share one. The relief that carries these
 * surfaces comes from shader normals rather than from vertices, so a single
 * value serves the hero shot and the macro alike.
 */
export const HERO_DETAIL: Record<Quality, number> = {
  high: 44,
  mid: 32,
  low: 22,
}

/** Fracture subdivision and fragment count, likewise scaled. */
export const FRACTURE: Record<Quality, { detail: number; cells: number }> = {
  high: { detail: 30, cells: 34 },
  mid: { detail: 24, cells: 28 },
  low: { detail: 18, cells: 20 },
}
