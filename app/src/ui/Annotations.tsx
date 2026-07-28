import { useEffect, useRef } from 'react'
import { ANNOTATIONS, projected } from './annotations'
import { scroll } from '../scroll/acts'

/**
 * Leader lines and labels.
 *
 * The anchors are projected from the scene by Projector; this only draws. Each
 * callout is a ring on the object, a line out to a fixed margin column, and a
 * short elbow into the label — the language of a technical plate, which is the
 * right register for a piece that is making claims about how a fruit works.
 *
 * Written to the DOM from a rAF loop, same as the rest of the overlay.
 */

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)
const smooth = (x: number) => x * x * (3 - 2 * x)
const window4 = (t: number, a: number, b: number, c: number, d: number) =>
  smooth(clamp01((t - a) / (b - a))) * (1 - smooth(clamp01((t - c) / (d - c))))

export function Annotations() {
  const svg = useRef<SVGSVGElement>(null)
  const paths = useRef<Record<string, SVGPathElement | null>>({})
  const dots = useRef<Record<string, SVGCircleElement | null>>({})
  const labels = useRef<Record<string, HTMLDivElement | null>>({})

  useEffect(() => {
    let frame = 0

    const loop = () => {
      const W = window.innerWidth
      const H = window.innerHeight
      // The margin column the labels live in. Kept clear of the act rail.
      const marginL = Math.max(84, W * 0.075)
      const marginR = W - Math.max(84, W * 0.075)

      for (const a of ANNOTATIONS) {
        const el = labels.current[a.id]
        const path = paths.current[a.id]
        const dot = dots.current[a.id]
        if (!el || !path || !dot) continue

        const p = projected[a.id]
        const alpha = a.act === scroll.index && p.visible
          ? window4(scroll.t, ...a.at)
          : 0

        el.style.opacity = String(alpha)
        path.style.opacity = String(alpha * 0.9)
        dot.style.opacity = String(alpha)

        if (alpha < 0.005) continue

        const labelX = a.side === 'left' ? marginL : marginR
        const labelY = a.y * H

        el.style.left = a.side === 'left' ? `${labelX}px` : 'auto'
        el.style.right = a.side === 'left' ? 'auto' : `${W - labelX}px`
        el.style.top = `${labelY}px`
        el.style.textAlign = a.side === 'left' ? 'left' : 'right'

        // Anchor ring, then out to a bend, then a short horizontal run into
        // the label. Two segments only — a curve here would read as decoration
        // rather than as a measurement.
        const bendX = a.side === 'left'
          ? labelX + Math.min(40, Math.abs(p.x - labelX) * 0.28)
          : labelX - Math.min(40, Math.abs(labelX - p.x) * 0.28)
        path.setAttribute('d', `M ${p.x} ${p.y} L ${bendX} ${labelY} L ${labelX} ${labelY}`)
        dot.setAttribute('cx', String(p.x))
        dot.setAttribute('cy', String(p.y))
      }

      frame = requestAnimationFrame(loop)
    }
    frame = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(frame)
  }, [])

  return (
    <div className="annotations">
      <svg ref={svg} aria-hidden>
        {ANNOTATIONS.map((a) => (
          <g key={a.id}>
            <path className="leader" ref={(el) => { paths.current[a.id] = el }} style={{ opacity: 0 }} />
            <circle
              className="dot"
              r="4.5"
              ref={(el) => { dots.current[a.id] = el }}
              style={{ opacity: 0 }}
            />
          </g>
        ))}
      </svg>

      {ANNOTATIONS.map((a) => (
        <div className="anno-label" key={a.id} ref={(el) => { labels.current[a.id] = el }}>
          <b>{a.label}</b>
          <span>{a.text}</span>
        </div>
      ))}
    </div>
  )
}
