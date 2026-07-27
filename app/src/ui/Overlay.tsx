import { useEffect, useRef, useState } from 'react'
import { ACTS, scroll } from '../scroll/acts'
import { enableAudio, disableAudio, audioSupported } from '../audio/engine'
import './overlay.css'

/**
 * Typography layer.
 *
 * Driven by the same scroll clock as the scene, and written straight to the DOM
 * from a rAF loop. Putting scroll into React state here would re-render the
 * tree every frame for the sake of two opacity values.
 *
 * Rules being enforced, from BRIEF.md:
 *   law 2 — exactly one world-model-correcting sentence per act
 *   law 5 — nothing that breaks absorption: no chrome, no counters, no controls
 *   law 7 — every act ends on an open question
 */

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)
/** Fade in over [a,b], hold, fade out over [c,d]. */
const window4 = (t: number, a: number, b: number, c: number, d: number) =>
  clamp01((t - a) / (b - a)) * (1 - clamp01((t - c) / (d - c)))

const IMPACT_AT = 0.66

export function Overlay() {
  const [sound, setSound] = useState(false)

  const toggleSound = async () => {
    // The click IS the gesture the browser is waiting for, which is why this
    // cannot be done automatically on scroll.
    if (sound) { disableAudio(); setSound(false) }
    else { const ok = await enableAudio(); setSound(ok) }
  }

  const marker = useRef<HTMLDivElement>(null)
  const numeral = useRef<HTMLSpanElement>(null)
  const title = useRef<HTMLSpanElement>(null)
  const wordmark = useRef<HTMLDivElement>(null)
  const line = useRef<HTMLParagraphElement>(null)
  const question = useRef<HTMLParagraphElement>(null)
  const invite = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let frame = 0
    let shownAct = -1

    const loop = () => {
      const { index, t, progress } = scroll
      const act = ACTS[index]

      if (index !== shownAct) {
        if (numeral.current) numeral.current.textContent = act.numeral
        if (title.current) title.current.textContent = act.title
        if (line.current) line.current.textContent = act.line
        if (question.current) question.current.textContent = act.question
        shownAct = index
      }

      // Act marker fades in once the piece has actually begun.
      if (marker.current) marker.current.style.opacity = progress > 0.012 ? '0.9' : '0'

      // Scroll invitation: dies at the first touch and never returns.
      // Removed from the layout rather than merely faded — opacity alone left
      // it faintly visible deep into the piece whenever the frame loop stalled
      // mid-transition, and law 5 does not tolerate a stray word on screen.
      if (invite.current) {
        if (progress > 0.006) {
          invite.current.style.opacity = '0'
          invite.current.style.display = 'none'
        } else {
          invite.current.style.opacity = '0.85'
        }
      }

      // The wordmark belongs to the impact and to nothing else.
      if (wordmark.current) {
        const a = index === 0 ? window4(t, IMPACT_AT + 0.01, IMPACT_AT + 0.09, 0.9, 1.0) : 0
        wordmark.current.style.opacity = String(a)
        // Settles downward as it appears — it arrives with the apple.
        const drop = (1 - a) * 26
        wordmark.current.style.transform = `translate(-50%, calc(-50% - ${drop}px))`
      }

      if (line.current) {
        // Act I holds its line back until after the landing; the other acts
        // let it arrive in the middle.
        const a = index === 0
          ? window4(t, IMPACT_AT + 0.16, IMPACT_AT + 0.26, 0.92, 1.0)
          : window4(t, 0.30, 0.42, 0.80, 0.92)
        line.current.style.opacity = String(a)
        line.current.style.transform = `translateX(-50%) translateY(${(1 - a) * 16}px)`
      }

      if (question.current) {
        const a = act.question ? window4(t, 0.88, 0.95, 0.985, 1.0) : 0
        question.current.style.opacity = String(a * 0.8)
      }

      frame = requestAnimationFrame(loop)
    }
    frame = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(frame)
  }, [])

  return (
    <div className="overlay">
      <div className="marker" ref={marker}>
        <span className="numeral" ref={numeral} />
        <span ref={title} />
      </div>

      <div className="wordmark" ref={wordmark}>
        <h1>MALUS</h1>
        <p>everything inside one apple</p>
      </div>

      <p className="line" ref={line} />
      <p className="question" ref={question} />
      <div className="invite" ref={invite}>scroll</div>

      {audioSupported() && (
        <button
          className="sound"
          data-on={sound}
          onClick={toggleSound}
          aria-pressed={sound}
          aria-label={sound ? 'Turn sound off' : 'Turn sound on'}
        >
          <span className="bars" aria-hidden><i /><i /><i /></span>
          <span>{sound ? 'sound on' : 'sound'}</span>
        </button>
      )}
    </div>
  )
}
