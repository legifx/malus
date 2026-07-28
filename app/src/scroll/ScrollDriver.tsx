import { useEffect } from 'react'
import Lenis from 'lenis'
import { scroll, locate, TOTAL_VH, ACT_STARTS, ACTS } from './acts'
import { useMalus } from '../store'

/**
 * Owns the page scroll and keeps `scroll` (see acts.ts) up to date.
 *
 * Lives outside the Canvas because it owns DOM scrolling. It writes into a
 * mutable object rather than React state on purpose — see the note in acts.ts.
 */
/**
 * Jump to an act. Exposed so the chapter rail can actually be used as the
 * navigation it looks like.
 */
let lenisRef: Lenis | null = null

export function scrollToAct(index: number) {
  if (!lenisRef) return
  const max = document.documentElement.scrollHeight - window.innerHeight
  // A little past the start, so the act is already doing something when you
  // arrive rather than sitting on its own boundary dissolve.
  const vh = ACT_STARTS[index] + ACTS[index].vh * 0.12
  lenisRef.scrollTo(max * (vh / TOTAL_VH), { duration: 1.4 })
}

export function ScrollDriver() {
  const setAct = useMalus((s) => s.setAct)

  useEffect(() => {
    const lenis = new Lenis({
      // Long and heavy. This piece is about weight and gravity; a snappy
      // scroll would fight the subject matter.
      duration: 1.35,
      smoothWheel: true,
      wheelMultiplier: 0.9,
      touchMultiplier: 1.4,
    })

    // Lenis owns scrolling, so window.scrollTo does not stick. Expose the
    // instance and the live state so the headless capture tool can drive and
    // inspect the spine directly.
    ;(window as unknown as Record<string, unknown>).__lenis = lenis
    lenisRef = lenis

    // Lenis takes over scrolling and brings no keyboard handling of its own,
    // so without this the page simply cannot be operated from a keyboard —
    // arrows, Page keys and Home/End all did nothing.
    const onKey = (e: KeyboardEvent) => {
      const max = document.documentElement.scrollHeight - window.innerHeight
      const page = window.innerHeight * 0.9
      const step = window.innerHeight * 0.28
      let to: number | null = null
      switch (e.key) {
        case 'ArrowDown': to = lenis.scroll + step; break
        case 'ArrowUp': to = lenis.scroll - step; break
        case 'PageDown': case ' ': to = lenis.scroll + page; break
        case 'PageUp': to = lenis.scroll - page; break
        case 'Home': to = 0; break
        case 'End': to = max; break
        default: return
      }
      // Space still belongs to the sound button when it has focus.
      if (e.key === ' ' && (e.target as HTMLElement)?.tagName === 'BUTTON') return
      e.preventDefault()
      lenis.scrollTo(Math.max(0, Math.min(max, to)), { duration: 0.9 })
    }
    window.addEventListener('keydown', onKey)
    ;(window as unknown as Record<string, unknown>).__scroll = scroll

    let frame = 0
    let lastTime = performance.now()
    let lastProgress = 0

    const loop = (time: number) => {
      lenis.raf(time)

      const p = Math.min(1, Math.max(0, lenis.progress || 0))
      const dt = Math.max(1, time - lastTime) / 1000
      // Smoothed so a single stuttered frame cannot spike a velocity-driven
      // effect. SwiftShader made this failure mode very obvious.
      scroll.velocity += ((p - lastProgress) / dt - scroll.velocity) * 0.2
      scroll.progress = p

      const { index, t } = locate(p)
      scroll.index = index
      scroll.t = t
      setAct(index)

      lastTime = time
      lastProgress = p
      frame = requestAnimationFrame(loop)
    }
    frame = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('keydown', onKey)
      lenisRef = null
      lenis.destroy()
    }
  }, [setAct])

  // The scroll runway. Nothing is rendered into it — it exists only to give
  // the page a height for the acts to be measured against.
  return <div style={{ height: `${TOTAL_VH * 100}vh` }} aria-hidden />
}
