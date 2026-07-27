# Night run — 2026-07-27 → 28

Autonomous build. State lives here and in git, not in context: each pass reads
this file, does the next unchecked step, verifies it by rendering, commits, and
ticks the box.

**Live the whole time:** a private network address (tailnet, user's PC is
the author's own machine). `systemctl --user restart malus` after every build.
Vercel is not authenticated and login is interactive, so the tailnet service is
the delivery path.

## Order, and why

Deploy came first so there is never a moment where nothing is viewable. After
that the ordering is "make the piece whole before making any part perfect" — a
site where every act exists reads far better to a judge than two polished acts
and four gaps.

- [x] 0. Serve the build over the tailnet (systemd user unit `malus.service`)
- [x] 1. Act II — SKIN. Macro on the cuticle, ρs/ρd/α driven directly.
- [x] 2. Act IV — STAR. Equator cut, five carpels, the pentagram.
- [x] 3. Act V — TIME. Enzymatic browning as reaction–diffusion, reversible.
- [ ] 4. Act VI — ORCHARD. Instanced apples, each genetically distinct, then dark.
- [ ] 5. Act VII — SEED. Collapse back to one point. Closes the loop.
- [ ] 6. Audio. Procedural crunch; the crossmodal effect is half this act's power.
- [ ] 7. Performance pass + reduced mobile path.
- [ ] 8. Final polish, curated screenshots, README refresh.

## Rules for the night

- Verify by rendering. Every bug so far looked correct in source.
- Build + `systemctl --user restart malus` + commit after each act.
- Keep builds sparse: root disk I/O was already at WARN from this session's work.
- One act per commit, with what the render actually showed in the message.
- No unverified facts on screen (BRIEF.md §6).
- Tick a box only after the render has been looked at. Never write status ahead
  of the work.

## Log

- Service up; http 200 on both loopback and the tailnet address.
- Act II SKIN done. Camera crawls the cuticle while ρs/ρd/α are swept one at a
  time, then ultraviolet arrives and is absorbed rather than reflected.
  Two fixes the render forced: at 1.24 units the surface went flat and the
  frame was a featureless wall of red — no curvature means no travelling
  highlight, which is the whole act. And procedural detail tuned for a whole
  fruit vanishes under magnification, so the shader gained a uDetail uniform
  that scales every frequency at once.
- Act IV STAR done. Cut with clipping planes rather than by rebuilding the mesh;
  the cap disc follows the fruit's real cross-section (a plain circle overhangs
  the skin, because the section is five-lobed and noisy). Fixes the render
  forced: lifting the top half straight up parked it between an overhead camera
  and the very face it was meant to reveal — it is set ASIDE instead, which also
  gives the composition everyone already knows. Camera was at 3.5 units where a
  single apple already spanned 31° of a 34° field. Carpels and the vascular ring
  were both too faint to see at all on the first pass.
  Also cut the act's line "People burned for less" — it gestures at witch-trial
  history that is nowhere in the research library. Replaced with the pentagram's
  golden-ratio proportion, which is provable geometry rather than a claim.
- Act V TIME done. Browning is driven by the same cut-face shader act IV uses;
  the disc builder moved to geometry/cutDisc.ts so both share it. Ascorbic acid
  drop falls, spreads, and the patch it reaches goes pale again rather than
  merely stopping — which is the actual chemistry, not a visual metaphor.
  Fixes: camera at 2.9 units put a unit-wide disc across 38° of a 34° field and
  it spilled out on all sides; and the first browning pass was an even wash that
  read as a sepia filter over the frame rather than something happening to the
  fruit, so the front is now strongly blotched by the damage field.
