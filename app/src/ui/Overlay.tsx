import { useEffect, useRef, useState } from 'react'
import { ACTS, scroll, signals } from '../scroll/acts'
import { enableAudio, disableAudio, audioSupported } from '../audio/engine'
import { scrollToAct } from '../scroll/ScrollDriver'
import { Annotations } from './Annotations'
import './overlay.css'

/**
 * Typography and the 2D layer.
 *
 * Driven by the same scroll clock as the scene and written straight to the DOM
 * from a rAF loop — putting scroll into React state would re-render the tree
 * every frame for the sake of a handful of opacities.
 *
 * From BRIEF.md:
 *   law 2 — one world-model-correcting sentence per act. That caps the
 *           HEADLINE, not the act: the detail paragraph carries the substance
 *           underneath it, set small so it reads as annotation.
 *   law 5 — nothing that breaks absorption. One control, in a corner.
 *   law 7 — every act ends on an open question.
 */

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)
const smooth = (x: number) => x * x * (3 - 2 * x)
/** Fade in over [a,b], hold, fade out over [c,d]. */
const window4 = (t: number, a: number, b: number, c: number, d: number) =>
  smooth(clamp01((t - a) / (b - a))) * (1 - smooth(clamp01((t - c) / (d - c))))

const IMPACT_AT = 0.52

/**
 * Act I carries the wordmark as well, so its copy runs on its own schedule:
 * nothing may appear until the fruit has actually landed.
 */
type Win = readonly [number, number, number, number]

function windowsFor(index: number): { line: Win; detail: Win; question: Win } {
  if (index === 0) {
    return {
      // Strictly sequential. The first pass had all three on screen at once,
      // with the copy printed straight through the middle of the wordmark.
      line: [0.70, 0.76, 0.865, 0.90] as const,
      detail: [0.76, 0.82, 0.865, 0.90] as const,
      question: [0.925, 0.955, 0.99, 1.0] as const,
    }
  }
  return {
    line: [0.22, 0.34, 0.78, 0.865] as const,
    detail: [0.34, 0.46, 0.78, 0.865] as const,
    question: [0.90, 0.95, 0.985, 1.0] as const,
  }
}

/** How close to an act boundary the dissolve begins, in act-local time. */
const DISSOLVE_BAND = 0.038

export function Overlay() {
  const [sound, setSound] = useState(false)

  const toggleSound = async () => {
    // The click IS the gesture the browser is waiting for, which is why this
    // cannot be done automatically on scroll.
    if (sound) { disableAudio(); setSound(false) }
    else { const ok = await enableAudio(); setSound(ok) }
  }

  const root = useRef<HTMLDivElement>(null)
  const marker = useRef<HTMLDivElement>(null)
  const numeral = useRef<HTMLSpanElement>(null)
  const title = useRef<HTMLSpanElement>(null)
  const wordmark = useRef<HTMLDivElement>(null)
  const line = useRef<HTMLParagraphElement>(null)
  const detail = useRef<HTMLParagraphElement>(null)
  const question = useRef<HTMLParagraphElement>(null)
  const invite = useRef<HTMLDivElement>(null)
  const rail = useRef<HTMLDivElement>(null)
  const dissolve = useRef<HTMLDivElement>(null)
  const opening = useRef<HTMLDivElement>(null)
  const colophon = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let frame = 0
    let shownAct = -1
    let curtain = 1
    let lastT = performance.now()
    let bootGone = false

    const loop = () => {
      const { index, t, progress } = scroll
      const act = ACTS[index]
      const w = windowsFor(index)

      if (index !== shownAct) {
        if (numeral.current) numeral.current.textContent = act.numeral
        if (title.current) title.current.textContent = act.title
        if (line.current) line.current.textContent = act.line
        if (detail.current) detail.current.textContent = act.detail
        if (question.current) question.current.textContent = act.question
        if (rail.current) {
          const ticks = rail.current.children
          for (let i = 0; i < ticks.length; i++) {
            ;(ticks[i] as HTMLElement).dataset.on = String(i === index)
          }
        }
        shownAct = index
      }

      // The opening frame used to be a small dark speck and the word "scroll".
      // Nothing to look at, nothing to screenshot, and no sense of what the
      // piece is. It now says what it is before it starts.
      if (opening.current) {
        const a = 1 - smooth(clamp01(progress / 0.010))
        opening.current.style.opacity = String(a)
        if (a < 0.01) opening.current.style.display = 'none'
        else opening.current.style.display = ''
      }

      // The ending. Previously the piece simply stopped on a floating pip:
      // no credits, no source, no way back to the beginning.
      if (colophon.current) {
        const a = smooth(clamp01((progress - 0.972) / 0.022))
        colophon.current.style.opacity = String(a)
        colophon.current.style.pointerEvents = a > 0.6 ? 'auto' : 'none'
      }

      const started = progress > 0.012
      if (marker.current) marker.current.style.opacity = started ? '0.9' : '0'
      if (rail.current) rail.current.style.opacity = started ? '1' : '0'

      // Scroll invitation: dies at the first touch and never returns. Removed
      // from layout rather than faded, or a stalled frame loop can leave it
      // faintly on screen deep into the piece.
      if (invite.current) {
        if (progress > 0.006) {
          invite.current.style.opacity = '0'
          invite.current.style.display = 'none'
        } else {
          invite.current.style.opacity = '0.85'
        }
      }

      // The wordmark hands over to the copy rather than sitting behind it.
      const aWord = index === 0 ? window4(t, IMPACT_AT + 0.01, IMPACT_AT + 0.07, 0.65, 0.71) : 0
      if (wordmark.current) {
        wordmark.current.style.opacity = String(aWord)
        wordmark.current.style.transform =
          `translate(-50%, calc(-50% - ${(1 - aWord) * 26}px))`
      }

      const aLine = window4(t, ...w.line)
      if (line.current) {
        line.current.style.opacity = String(aLine)
        line.current.style.transform = `translateY(${(1 - aLine) * 14}px)`
      }

      const aDetail = window4(t, ...w.detail)
      if (detail.current) detail.current.style.opacity = String(aDetail * 0.98)

      const aQ = act.question ? window4(t, ...w.question) : 0
      if (question.current) question.current.style.opacity = String(aQ * 0.85)

      // The scrim exists only to hold type. With nothing on screen it would
      // just be a permanent dark band across the bottom of the frame.
      if (root.current) {
        const need = Math.max(aLine, aDetail, aQ * 0.7, aWord * 0.8)
        root.current.style.setProperty('--scrim', (0.12 + need * 0.88).toFixed(3))
      }

      // The dissolve.
      //
      // At an act boundary the 3D subject genuinely changes — a different mesh
      // in a different place. The camera rig removes the jump, but the swap
      // itself is still a cut, so it is treated as one: a short dip, which
      // reads as an edit rather than as a glitch. Suppressed at the very start
      // and very end, where there is no neighbour to cut to.
      //
      // The same element is also the opening curtain. The environment map needs
      // a few real frames before anything in the scene is lit, and on a slow
      // machine that is long enough to see as a dark, wrong-looking first
      // second. So the piece starts behind black and the curtain lifts on
      // evidence — the renderer reporting it has produced frames — rather than
      // on a guessed delay. Eased in JS, not CSS: the opacity is rewritten
      // every frame, and a transition would fight it.
      if (dissolve.current) {
        const edge = Math.min(t, 1 - t)
        let dip = smooth(1 - clamp01(edge / DISSOLVE_BAND))
        if (progress < 0.004 || progress > 0.997) dip = 0

        // Eased against the CLOCK, not against the frame count. At 0.055 per
        // frame this took about a hundred frames to clear, which is a third of
        // a second at 300fps and over a minute on a slow renderer — the piece
        // sat behind a half-closed curtain and looked unlit.
        const now = performance.now()
        const dt = Math.min(0.1, (now - lastT) / 1000)
        lastT = now
        // The inline boot loader hands over here — it exists so the first
        // paint is never a blank rectangle, and it leaves as soon as the
        // renderer is actually producing frames.
        if (signals.ready && !bootGone) {
          document.getElementById('boot')?.classList.add('gone')
          bootGone = true
        }

        const want = signals.ready ? 0 : 1
        curtain += (want - curtain) * (1 - Math.exp(-dt / 0.28))
        if (curtain < 0.004) curtain = 0

        dissolve.current.style.opacity = Math.max(curtain, dip * 0.82).toFixed(3)
      }

      frame = requestAnimationFrame(loop)
    }
    frame = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(frame)
  }, [])

  return (
    <div className="overlay" ref={root}>
      <div className="marker" ref={marker}>
        <span className="numeral" ref={numeral} />
        <span ref={title} />
      </div>

      {/* The rail looked exactly like navigation and did nothing. It is
          navigation now. */}
      <nav className="rail" ref={rail} aria-label="Chapters">
        {ACTS.map((a, i) => (
          <button
            key={a.id}
            data-on="false"
            onClick={() => scrollToAct(i)}
            aria-label={`${a.numeral ? a.numeral + ' — ' : ''}${a.title}`}
            title={a.title}
          />
        ))}
      </nav>

      <Annotations />

      <div className="opening" ref={opening}>
        <p className="eyebrow">A 3D essay in seven acts</p>
        <p className="premise">
          Everything inside one apple — and none of it downloaded.
        </p>
      </div>

      <div className="wordmark" ref={wordmark}>
        <h1>MALUS</h1>
        <p>everything inside one apple</p>
      </div>

      <div className="copy">
        <p className="line" ref={line} />
        <p className="detail" ref={detail} />
        <p className="question" ref={question} />
      </div>
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

      <div className="colophon" ref={colophon}>
        <h2>MALUS</h2>
        <p className="what">
          Seven acts about the most ordinary object there is. The shape, the
          skin, the fracture, the orchard and the sound are all generated in
          code — there are no models, textures or audio files in this project.
        </p>
        <p className="tech">
          three.js · React Three Fiber · custom GLSL · Web Audio · Lenis · Vite
        </p>
        <div className="ends">
          <a href="https://github.com/legifx/malus" rel="noreferrer">Source</a>
          <button onClick={() => scrollToAct(0)}>Again</button>
        </div>
      </div>

      <div className="dissolve" ref={dissolve} />
    </div>
  )
}
