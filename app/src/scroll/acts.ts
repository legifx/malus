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
  /**
   * The substance under it. Law 2 caps the HEADLINE at one sentence per act;
   * it never said the act may not explain itself. Set small and quiet so it
   * reads as annotation rather than as a second headline.
   */
  detail: string
  /** The open question the act ends on. Brief, law 7. */
  question: string
  vh: number
}

export const ACTS: ActDef[] = [
  {
    id: 'fall',
    numeral: 'I',
    title: 'FALL',
    line: 'It fell straight down. Someone asked why down — and the answer reached the moon.',
    detail: 'Scrolling is the gravity here. The distance the fruit has fallen grows with the square of how far you have scrolled, so its speed climbs steadily and evenly. That is free fall, and you are the one supplying it.',
    question: 'What else is hiding in something this ordinary?',
    // Longer than the rest: everything after the landing — wordmark, line,
    // detail, question — has to play out inside this one act.
    vh: 5,
  },
  {
    id: 'skin',
    numeral: 'II',
    title: 'SKIN',
    line: 'The shine is not polish. It is a shield the fruit builds to turn ultraviolet light into heat.',
    detail: 'What you are watching is three numbers moving. Specular reflectance, diffuse reflectance, and the width of the highlight — the three parameters that gloss-selective neurons in the visual cortex are tuned to. Here they arrive one at a time, which never happens in life.',
    question: 'So what is underneath it?',
    vh: 3.5,
  },
  {
    id: 'bite',
    numeral: 'III',
    title: 'BITE',
    line: 'Crisp and mealy are not freshness. They are two different ways for a crack to travel.',
    detail: 'In a crisp apple the fracture runs through the cells. They burst under their own pressure and release what is inside — that is the juice, and that is the noise. In a mealy one the crack runs between them instead, so the cells come apart whole and dry. Same fruit, broken twice.',
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
    detail: 'Five chambers, each holding its seeds, with a ring of vascular bundles running between them and the skin. Join every second tip and the figure closes exactly — and in a regular pentagram the diagonal is longer than the side by a factor of 1.618.',
    question: 'What happens if we leave it open?',
    vh: 3.5,
  },
  {
    id: 'time',
    numeral: 'V',
    title: 'TIME',
    line: 'It is not rotting. It is defending itself — and the browning is the wound closing.',
    detail: 'Polyphenol oxidase reaches the phenols the moment a cut lets oxygen in, and the quinones it produces polymerise into the brown. It is an immune response. Ascorbic acid reduces those quinones back before they can set, which is why lemon works — and why the patch it reaches turns pale again instead of merely stopping.',
    question: 'Then what survives?',
    vh: 3.5,
  },
  {
    id: 'orchard',
    numeral: 'VI',
    title: 'ORCHARD',
    line: 'You were never the farmer. You were the deal.',
    detail: 'Domestication is best modelled as a plant\'s answer to being eaten: sweet, large and red recruited a species that would carry the seeds across continents. Every fruit here is genuinely different, because an apple grown from seed never resembles its parent. A named variety is one tree, grafted ever since.',
    question: 'What did we agree to?',
    vh: 5,
  },
  {
    id: 'seed',
    numeral: '',
    title: 'SEED',
    line: 'Every seed is a stranger. Every named apple is one tree, copied.',
    detail: 'You began on a point of light in the dark. So does this.',
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
  /** 1 once the renderer has produced enough frames to be lit. */
  ready: 0,
}
