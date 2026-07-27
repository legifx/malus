import { scroll, signals } from '../scroll/acts'

/**
 * Sound.
 *
 * This is not a soundtrack laid over the visuals — it is another channel of the
 * same information, and the research says so. Crossmodal correspondences
 * between sound and food texture are robust in non-synaesthetic listeners:
 * crisps map to sharp, angular sound symbolism and soft cheeses to round; music
 * measurably shifts how wine is perceived; ambient sound shifts how chocolate
 * is perceived.
 *   research/papers/crossmodal-correspondence-.../2010-what-sound-does-that-t...md
 *   research/papers/crossmodal-correspondence-.../2014-cross-cultural-differe...md
 *
 * So the rule from BRIEF.md law 4 is enforced literally here:
 *   high frequencies, sharp transients, short decays → crisp, fresh, angular
 *   low frequencies, soft attacks, long decays       → ripe, mealy, round
 * and the audio curve is driven by the same turgor value that drives the
 * geometry and the colour. Nothing is scored by hand.
 *
 * The crunch itself is granular because a real one is: biting a turgid apple
 * is not one event but a burst of individual cell walls rupturing. Synthesising
 * it as a cloud of micro-impulses gets the character right in a way no single
 * enveloped noise burst does.
 *
 * Everything is generated. No audio files, which keeps the asset-rights
 * position of the whole project intact.
 */

type Ctx = AudioContext & { __malus?: boolean }

let ctx: Ctx | null = null
let master: GainNode | null = null
let noise: AudioBuffer | null = null
let drone: { osc: OscillatorNode[]; filter: BiquadFilterNode; gain: GainNode } | null = null
let raf = 0
let enabled = false

// Previous frame's signal values, for edge detection. Scroll runs both ways,
// so every trigger has to fire on a crossing rather than on a level.
const prev = { burst: 0, impact: 0, drop: 0, act: -1 }

function makeNoise(c: AudioContext) {
  const len = Math.floor(c.sampleRate * 0.5)
  const buf = c.createBuffer(1, len, c.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1
  return buf
}

/**
 * One rupture. Short, band-limited, and violently enveloped.
 * `crisp` moves it along the whole perceptual axis at once — centre frequency,
 * attack time and decay length — rather than just filtering a fixed sound.
 */
function rupture(at: number, crisp: number, gainScale: number) {
  if (!ctx || !master || !noise) return
  const src = ctx.createBufferSource()
  src.buffer = noise
  src.playbackRate.value = 0.6 + Math.random() * 1.4

  const bp = ctx.createBiquadFilter()
  bp.type = 'bandpass'
  // 700 Hz when mealy, up past 3.5 kHz when crisp.
  bp.frequency.value = (700 + crisp * 2900) * (0.55 + Math.random() * 1.3)
  bp.Q.value = 1.4 + Math.random() * 7

  const g = ctx.createGain()
  const attack = 0.0009 + (1 - crisp) * 0.011   // sharp when crisp, soft when not
  const decay = (0.012 + Math.random() * 0.030) * (1 + (1 - crisp) * 1.6)
  const peak = gainScale * (0.16 + Math.random() * 0.30)
  g.gain.setValueAtTime(0.0001, at)
  g.gain.linearRampToValueAtTime(peak, at + attack)
  g.gain.exponentialRampToValueAtTime(0.0001, at + attack + decay)

  src.connect(bp).connect(g).connect(master)
  src.start(at)
  src.stop(at + attack + decay + 0.02)
}

/** A whole bite: a cloud of ruptures, dense and tight when crisp. */
function crunch(crisp: number) {
  if (!ctx) return
  const now = ctx.currentTime + 0.01
  const n = Math.round(28 + crisp * 78)
  // A crisp fracture is over fast; a mealy one is a longer, sparser crumble.
  const spread = 0.34 - crisp * 0.20
  for (let i = 0; i < n; i++) {
    // Front-loaded: the fracture is most violent at the start.
    const at = now + Math.pow(Math.random(), 1.7) * spread
    rupture(at, crisp, 0.55 + crisp * 0.45)
  }
}

/** The landing in act I. Low, short, with a little body. */
function thud() {
  if (!ctx || !master) return
  const now = ctx.currentTime + 0.01
  const osc = ctx.createOscillator()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(150, now)
  osc.frequency.exponentialRampToValueAtTime(38, now + 0.28)
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.0001, now)
  g.gain.linearRampToValueAtTime(0.5, now + 0.006)
  g.gain.exponentialRampToValueAtTime(0.0001, now + 0.55)
  osc.connect(g).connect(master)
  osc.start(now)
  osc.stop(now + 0.6)
  // Plus the dry slap of contact.
  for (let i = 0; i < 14; i++) rupture(now + Math.random() * 0.05, 0.35, 0.5)
}

/** The drop landing in act V. */
function drip() {
  if (!ctx || !master) return
  const now = ctx.currentTime + 0.01
  const osc = ctx.createOscillator()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(760, now)
  osc.frequency.exponentialRampToValueAtTime(1750, now + 0.055)
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.0001, now)
  g.gain.linearRampToValueAtTime(0.18, now + 0.004)
  g.gain.exponentialRampToValueAtTime(0.0001, now + 0.16)
  osc.connect(g).connect(master)
  osc.start(now)
  osc.stop(now + 0.2)
}

function startDrone() {
  if (!ctx || !master || drone) return
  const filter = ctx.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = 320
  filter.Q.value = 0.7
  const gain = ctx.createGain()
  gain.gain.value = 0.0
  filter.connect(gain).connect(master)

  // Three detuned voices. Slightly out of tune with each other so the bed
  // breathes instead of sitting still.
  const osc = [55, 82.5, 110].map((f, i) => {
    const o = ctx!.createOscillator()
    o.type = i === 2 ? 'triangle' : 'sawtooth'
    o.frequency.value = f
    o.detune.value = (i - 1) * 7
    o.connect(filter)
    o.start()
    return o
  })
  drone = { osc, filter, gain }
  gain.gain.linearRampToValueAtTime(0.055, ctx.currentTime + 2.5)
}

function loop() {
  raf = requestAnimationFrame(loop)
  if (!ctx || !enabled || !drone) return

  const now = ctx.currentTime
  const act = scroll.index

  // The bed follows the same ripeness arc the colour does: bright and open
  // early, closing down through TIME and the dark half of ORCHARD.
  const dark = Math.max(signals.dark, act === 4 ? 0.55 : 0)
  const target = 240 + (1 - dark) * 620 + signals.turgor * 160
  drone.filter.frequency.setTargetAtTime(target, now, 0.5)
  drone.gain.gain.setTargetAtTime(0.04 + (1 - dark) * 0.03, now, 0.8)
  for (let i = 0; i < drone.osc.length; i++) {
    drone.osc[i].detune.setTargetAtTime((i - 1) * 7 - dark * 22, now, 1.0)
  }

  // Crossings. Fired in both directions: scrolling back up through the
  // fracture should crunch too, because visually it does happen again.
  if (act === 2) {
    const b = signals.burst
    if (prev.burst < 0.04 && b >= 0.04) crunch(signals.turgor)
    if (prev.burst > 0.04 && b <= 0.04) crunch(signals.turgor * 0.6)
    prev.burst = b
  } else {
    prev.burst = 0
  }

  if (act === 0) {
    const im = signals.impact
    if (prev.impact <= 0.001 && im > 0.001) thud()
    prev.impact = im
  } else {
    prev.impact = 0
  }

  if (act === 4) {
    const d = signals.drop
    if (prev.drop <= 0.001 && d > 0.001) drip()
    prev.drop = d
  } else {
    prev.drop = 0
  }

  prev.act = act
}

export function audioSupported() {
  return typeof window !== 'undefined' && 'AudioContext' in window
}

/**
 * Must be called from a user gesture — browsers will not start an AudioContext
 * without one, which is also why the site ships muted with a single toggle
 * rather than trying to fade sound in on scroll.
 */
export async function enableAudio() {
  if (!audioSupported()) return false
  if (!ctx) {
    ctx = new AudioContext() as Ctx
    master = ctx.createGain()
    master.gain.value = 0.85
    master.connect(ctx.destination)
    noise = makeNoise(ctx)
    startDrone()
    raf = requestAnimationFrame(loop)
  }
  await ctx.resume()
  enabled = true
  if (drone && ctx) drone.gain.gain.setTargetAtTime(0.055, ctx.currentTime, 0.6)
  return true
}

export function disableAudio() {
  enabled = false
  if (drone && ctx) drone.gain.gain.setTargetAtTime(0.0, ctx.currentTime, 0.3)
}

export function stopAudio() {
  cancelAnimationFrame(raf)
  drone?.osc.forEach((o) => o.stop())
  drone = null
  ctx?.close()
  ctx = null
  master = null
  enabled = false
}
