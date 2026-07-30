# MALUS — Project Story

## Inspiration

Latin has two words that look identical in writing. `mālus` is an apple tree.
`malus` is evil. They differ only by a vowel length that Latin stopped writing
down — which is very likely why the unnamed fruit in Genesis became an apple.
A pun turned into two thousand years of iconography.

That got me interested in the apple as a subject, and then something else did.

Most 3D showcases pick a subject that is already impressive: a spaceship, a
supercar, a fantasy city, a neon skyline. The subject does half the work. Put a
starship on screen and it is interesting before you have written a line of
shader code.

So I wanted to try the opposite. Take the most ordinary object I could think of
— the thing in the fruit bowl that nobody looks at — and try to earn the same
reaction anyway. If I could make people stare at an apple for eight minutes,
that would mean something the spaceship never could.

## What it does

MALUS is a 3D essay in seven acts. You scroll; the fruit is taken apart.

**I — FALL.** Scrolling *is* gravity. The distance the apple has fallen grows
with the square of how far you have scrolled, so its speed climbs steadily.
That is free fall, and you are supplying it.

**II — SKIN.** Macro on the cuticle while three numbers come up one at a time.
You watch an apple *become* glossy — which is something nobody has ever seen,
because in life all three arrive at once.

**III — BITE.** Two apples, side by side, broken in the same instant by the
same force. One is turgid and one is not, and they do not break the same way at
all.

**IV — STAR.** The same fruit opened slowly along one plane. Five carpels, a
ring of vascular bundles, and a figure that closes exactly.

**V — TIME.** The cut face browns as you scroll. It is not rot. A drop of
ascorbic acid turns it back.

**VI — ORCHARD.** Thousands of individually distinct apples in planted rows.
Then it goes out, fruit by fruit, and a handful never do.

**VII — SEED.** The loop closes on a single point of light that turns out to be
a pip.

There is sound, and it is worth turning on: the crunch is synthesised, not
recorded.

## The part I did not expect

I did the research before writing any code — 228 papers pulled from arXiv and
OpenAlex across material rendering, perception psychology, and the botany of
the fruit. I expected it to give me accurate captions. Instead three findings
rewrote the design.

**Gloss has dedicated neurons.** Cells in the inferior temporal cortex respond
selectively to gloss, and their selectivity is organised along exactly three
physical reflectance parameters: specular reflectance, diffuse reflectance, and
the spread of the specular highlight. So the skin shader exposes those three by
name instead of "roughness" and "metalness", and act II sweeps them one at a
time. I am not adjusting a material. I am moving through a perceptual space the
brain built dedicated hardware for.

**Crisp and mealy are not freshness.** They are two different ways for a crack
to travel. In a crisp apple the fracture runs *through* the cells: they burst
under their own pressure, and what was inside them comes out — that is the
juice, and that is the noise. In a mealy one the crack takes the easier path
*between* them, so the cells separate whole and dry. Same fruit, same force,
completely different event. That finding is the entire third act.

**Domestication ran the other way round.** It is best modelled as a plant's
evolutionary answer to being eaten: the apple became sweet, large and red
because that recruited a species which would carry its seeds across continents.
It was a trade — sugar for distribution.

> You were never the farmer. You were the deal.

That sentence is where the piece stops being a nice visual and becomes an
argument, and it is why the act about lost varieties lands as a broken bargain
rather than as nostalgia.

## Nothing in it was downloaded

The rules allow finished assets, AI-generated models and templates, and most
entries will use them. This one has none. Not as a rule I set myself for
purity — it started as a licensing problem and turned out to be the more
interesting path.

- **The shape** is a deformed icosphere: a silhouette profile, a five-lobe
  modulation from the five carpels, two cavities placed as functions of
  distance from the axis, and gradient noise for the lopsidedness no real fruit
  is without. It is seeded, which is what makes act VI's thousands of
  individually distinct apples possible at all.
- **The skin** is GLSL: an anthocyanin blush laid over a yellow-green ground
  colour, varietal striping that only exists in the transition band where real
  striping lives, lenticels from a cellular noise field, russeting in the
  cavities.
- **The fracture** is written from scratch. The obvious off-the-shelf library
  has no licence file, which makes it all-rights-reserved and unusable — and it
  could not have expressed the crisp/mealy distinction anyway.
- **The sound** is synthesised. A real bite is not one event but a burst of
  cell walls rupturing, so the crunch is a cloud of micro-impulses whose centre
  frequency, attack, decay and density all move together with turgor.
- **The lighting** is a lightformer rig baked into a procedural environment
  map. No HDRI, no CDN.
- Even the noise is written from the definition rather than pulled from a
  library.

Two woff2 fonts, one CSS file and one JS bundle. That is the entire network
log.

## How I built it

I do not write shader code. Every line here was produced by working with an AI
agent (Claude Opus) from a research brief — and proving that this is now
possible was part of why I started.

The interesting part is not that it compiled. It is how much of the work turned
out to be *looking*.

The single most valuable thing I set up was a headless verification loop:
Playwright with SwiftShader gives real WebGL 2.0 with no GPU, so every change
could be rendered and actually examined instead of reasoned about. Later I
added a tool that reads pixels back out of the framebuffer, because "is this
dark or is it simply not being drawn" is not a question a screenshot can
answer.

Almost every real bug in this project looked completely correct in source.

## Challenges I ran into

**A floor that fell with the apple.** In act I the ground, the shockwave and
the dust were children of the group carrying the fruit's fall position. They
inherited it: the floor fell with the apple, came to rest at the fruit's own
centre height, and sliced it in half at the equator — while spending the whole
fall hovering fifty-eight units in the air. It looked exactly like a
transparency sorting bug and cost hours before a decisive test found it.

**A curtain measured in frames.** The opening fade eased by 5.5% per *frame*.
That is a third of a second at 300fps and over a minute on a slow renderer. The
frames I kept reading as "the scene is unlit" were a perfectly lit scene behind
a half-closed black veil. I chased the wrong cause for a while.

**One apple exploding twice.** Act III originally broke one fruit, ran the
pieces backwards into a whole apple, and broke it again with the turgor turned
down. The science was right and the staging was wrong: nobody can compare two
things they saw thirty seconds apart, so it read as one apple exploding twice,
and the rewind in the middle looked like a glitch. Rebuilding it as two fruits
breaking side by side fixed it completely.

**Facts I had to throw away.** Several things everybody repeats about apples —
cultivar counts, the extinction rate, "apples are 25% air" — were not
verifiable in the research library I had built. They are listed in the repo
under *unverified* and kept off the site. Act VI shows the orchard going dark
and puts no number on it, deliberately. One line was cut for gesturing at
witch-trial history that appears in no source. On a page that presents itself as
scientific, one wrong number costs more than the fact is worth.

## Accomplishments I am proud of

That the subject is boring and it works anyway.

That the third act makes a real distinction visible rather than asserting it —
you can *see* that a crisp break and a mealy break are different events, and
nobody told you to read a caption to get there.

And that the honesty held. It would have been easy to put an impressive-sounding
number under the dying orchard. There is no number there, and the image carries
it without one.

## What I learned

Research before code changes what you build, not just what you write in the
captions. All three findings above arrived before a single shader existed, and
each one redirected the design.

Looking beats reasoning. I have a long list of bugs in this project that were
invisible in source and obvious in a render.

And measuring beats looking, when the question is quantitative. The moment I
stopped squinting at screenshots and started reading pixel values out of the
framebuffer, a problem I had been circling for an hour resolved in one number.

## What's next

An honest list, because there is one.

The apple is good but not photoreal — it still reads slightly lacquered up
close. Act III's fragments have the right physics and their flesh could be
wetter. There are a couple of dark stretches between events that read as
atmosphere when you scroll slowly and as a bug when you scroll fast. And I
would like one more moment of direct manipulation, where you turn the fruit
yourself.

The pip is the argument in one object: an apple grown from seed is never its
parent, so every seed is a genuinely new individual, and every named variety is
one tree that has been copied by grafting ever since.

It seemed like the right thing to end on.
