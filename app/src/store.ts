import { create } from 'zustand'

export type Quality = 'high' | 'mid' | 'low'

interface MalusState {
  /** Current act index. The ONLY scroll-derived value React is told about. */
  act: number
  setAct: (i: number) => void

  started: boolean
  start: () => void

  quality: Quality
  setQuality: (q: Quality) => void

  audio: boolean
  toggleAudio: () => void

  /** 0..1 asset + shader warm-up. The loading indicator is a seed. */
  loaded: number
  setLoaded: (n: number) => void
}

export const useMalus = create<MalusState>((set) => ({
  act: 0,
  setAct: (i) => set((s) => (s.act === i ? s : { act: i })),

  started: false,
  start: () => set({ started: true }),

  quality: 'high',
  setQuality: (quality) => set({ quality }),

  audio: false,
  toggleAudio: () => set((s) => ({ audio: !s.audio })),

  loaded: 0,
  setLoaded: (loaded) => set({ loaded }),
}))

/**
 * Pick a quality tier up front. Act VI puts ten thousand instanced apples on
 * screen; on a weak device that is the difference between the best moment of
 * the piece and a slideshow.
 */
export function detectQuality(): Quality {
  if (typeof navigator === 'undefined') return 'mid'
  const coarse = window.matchMedia?.('(pointer: coarse)').matches
  const mem = (navigator as { deviceMemory?: number }).deviceMemory ?? 8
  const cores = navigator.hardwareConcurrency ?? 4
  if (coarse || mem <= 4 || cores <= 4) return 'low'
  if (mem <= 8 || cores <= 8) return 'mid'
  return 'high'
}
