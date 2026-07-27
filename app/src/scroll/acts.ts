/**
 * The spine.
 *
 * Scroll is the only clock in this site. Every act is a window on it, and
 * everything inside an act is a pure function of `actT` — which means the whole
 * experience is scrubbable in both directions and never gets out of sync with
 * itself. Nothing animates on a timer.
 *
 * `vh` is how many viewport heights of scrolling an act occupies. That is the
 * pacing dial: it is the only place the rhythm of the piece is decided.
 */
export interface ActDef {
  id: string
  /** Roman numeral shown in the corner. Empty for the framing acts. */
  numeral: string
  title: string
  /** The one world-model-correcting sentence. Brief, law 2. */
  line: string
  /** The open question the act ends on. Brief, law 7. */
  question: string
  vh: number
}

export const ACTS: ActDef[] = [
  {
    id: 'fall',
    numeral: 'I',
    title: 'FALL',
    line: 'It fell for four seconds and rearranged physics.',
    question: 'What else is hiding in something this ordinary?',
    vh: 3.5,
  },
  {
    id: 'skin',
    numeral: 'II',
    title: 'SKIN',
    line: 'The shine is not polish. It is a shield the fruit builds to turn ultraviolet light into heat.',
    question: 'So what is underneath it?',
    vh: 3.5,
  },
  {
    id: 'bite',
    numeral: 'III',
    title: 'BITE',
    line: 'Crisp and mealy are not freshness. They are two different ways for a crack to travel.',
    question: 'And if we cut instead of bit?',
    vh: 4.5,
  },
  {
    id: 'star',
    numeral: 'IV',
    title: 'STAR',
    // "People burned for less" was cut: it gestures at witch-trial history that
    // is nowhere in the research library. The pentagram's proportions are not a
    // claim about the world — they are provable geometry.
    line: 'Cut it across the middle. Five carpels make a star, and that star is built on the golden ratio.',
    question: 'What happens if we leave it open?',
    vh: 3.5,
  },
  {
    id: 'time',
    numeral: 'V',
    title: 'TIME',
    line: 'It is not rotting. It is defending itself — and the browning is the wound closing.',
    question: 'Then what survives?',
    vh: 3.5,
  },
  {
    id: 'orchard',
    numeral: 'VI',
    title: 'ORCHARD',
    line: 'You were never the farmer. You were the deal.',
    question: 'What did we agree to?',
    vh: 5,
  },
  {
    id: 'seed',
    numeral: '',
    title: 'SEED',
    line: 'Every seed is a stranger. Every named apple is one tree, copied.',
    question: '',
    vh: 2.5,
  },
]

/** Cumulative start offset of each act, in viewport heights. */
export const ACT_STARTS: number[] = (() => {
  const out: number[] = []
  let acc = 0
  for (const a of ACTS) {
    out.push(acc)
    acc += a.vh
  }
  return out
})()

export const TOTAL_VH = ACTS.reduce((s, a) => s + a.vh, 0)

/** Which act a global 0..1 progress falls in, and how far through it is. */
export function locate(progress: number): { index: number; t: number } {
  const vh = progress * TOTAL_VH
  for (let i = ACTS.length - 1; i >= 0; i--) {
    if (vh >= ACT_STARTS[i] || i === 0) {
      return { index: i, t: Math.min(1, Math.max(0, (vh - ACT_STARTS[i]) / ACTS[i].vh)) }
    }
  }
  return { index: 0, t: 0 }
}

/**
 * Live scroll state.
 *
 * Deliberately a plain mutable object rather than React state: at 60fps every
 * scrolled pixel would otherwise re-render the tree. useFrame reads this
 * directly; React is only told when the ACT changes.
 */
export const scroll = {
  progress: 0,
  index: 0,
  t: 0,
  /** Signed, in progress-units per second. Drives motion blur and audio. */
  velocity: 0,
}

/**
 * What the acts are currently doing, for anything that needs to react without
 * knowing which act it is watching.
 *
 * Same reasoning as `scroll`: a plain mutable object, written by acts in
 * useFrame and read by the audio engine in its own loop. Routing this through
 * React state would re-render the tree for every frame of a fracture.
 */
export const signals = {
  /** Act I — 0 before contact, rising after it. */
  impact: 0,
  /** Act III — 0 whole, 1 fully apart. */
  burst: 0,
  /** Act III — 1 crisp, 0 mealy. */
  turgor: 1,
  /** Act V — how far the drop has spread. */
  drop: 0,
  /** Act VI — how much of the orchard has gone out. */
  dark: 0,
}
