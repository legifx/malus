import * as THREE from 'three'
import { CUT_AT } from '../geometry/cutDisc'

/**
 * Callouts.
 *
 * Each one is anchored to a real point in the scene and projected every frame,
 * which is what makes the leader line feel attached to the object rather than
 * pasted over the top of it. This is the layer that carries the small facts —
 * the ones that do not deserve a headline but are the reason the object is
 * worth looking at.
 */

export interface Anno {
  id: string
  act: number
  /** Act-local time window: fade in over [0,1], out over [2,3]. */
  at: readonly [number, number, number, number]
  /** World-space point on the object. */
  anchor: THREE.Vector3
  /** Which margin the label sits in. */
  side: 'left' | 'right'
  /** 0..1 down the viewport. */
  y: number
  label: string
  text: string
}

// The cut face is drawn in a disc whose local (x, y) maps to world (x, -y)
// after the mesh is laid flat, so callouts on it convert through this.
const onCut = (lx: number, ly: number, r = 1) =>
  new THREE.Vector3(lx * r, CUT_AT + 0.01, -ly * r)

export const ANNOTATIONS: Anno[] = [
  // --- II SKIN ------------------------------------------------------------
  {
    id: 'lenticel',
    act: 1,
    at: [0.30, 0.40, 0.56, 0.64],
    anchor: new THREE.Vector3(0.30, 0.10, 0.94).normalize().multiplyScalar(0.99),
    side: 'right',
    y: 0.34,
    label: 'Lenticel',
    text: 'A pore. The fruit breathes through them, and goes on breathing through them after it is picked.',
  },
  {
    id: 'cuticle',
    act: 1,
    at: [0.68, 0.76, 0.88, 0.94],
    anchor: new THREE.Vector3(-0.15, 0.35, 0.92).normalize().multiplyScalar(0.99),
    side: 'left',
    y: 0.62,
    label: 'Cuticle',
    text: 'Wax the apple builds itself. It absorbs ultraviolet light and releases it as heat instead of damage.',
  },

  // --- III BITE -----------------------------------------------------------
  {
    id: 'turgor',
    act: 2,
    at: [0.03, 0.09, 0.13, 0.17],
    anchor: new THREE.Vector3(0.30, 0.95, 0.55),
    side: 'right',
    y: 0.30,
    label: 'Turgor',
    text: 'Water pressure inside every living cell. It is what a crisp apple is made of, and what a mealy one has lost.',
  },

  // --- IV STAR ------------------------------------------------------------
  {
    id: 'carpel',
    act: 3,
    at: [0.72, 0.80, 0.93, 0.99],
    anchor: onCut(0.0, -0.30),
    side: 'left',
    y: 0.30,
    label: 'Carpel',
    text: 'One of five seed chambers. Their tips are the points of the star.',
  },
  {
    id: 'bundles',
    act: 3,
    at: [0.78, 0.86, 0.93, 0.99],
    anchor: onCut(-0.60, 0.16),
    side: 'left',
    y: 0.62,
    label: 'Vascular ring',
    text: 'Ten bundles that fed the fruit while it grew. You can see them in any apple you cut this way.',
  },

  // --- V TIME -------------------------------------------------------------
  {
    id: 'acid',
    act: 4,
    at: [0.66, 0.74, 0.86, 0.93],
    anchor: onCut(-0.20, 0.16),
    side: 'left',
    y: 0.40,
    label: 'Ascorbic acid',
    text: 'One per cent, with one per cent citric acid — the treatment that works best on apple slices in the literature.',
  },

  // --- VI ORCHARD ---------------------------------------------------------
  {
    id: 'graft',
    act: 5,
    at: [0.22, 0.30, 0.42, 0.50],
    anchor: new THREE.Vector3(1.6, 0.42, -3.2),
    side: 'right',
    y: 0.32,
    label: 'Every one different',
    text: 'A pip never grows its parent. Which is why a named variety is not a lineage — it is one tree, cut and re-rooted ever since.',
  },
]

/** Live projected positions, written by the Projector inside the Canvas. */
export const projected: Record<string, { x: number; y: number; visible: boolean }> = {}
for (const a of ANNOTATIONS) projected[a.id] = { x: 0, y: 0, visible: false }
