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
- [ ] 2. Act IV — STAR. Equator cut, five carpels, the pentagram.
- [ ] 3. Act V — TIME. Enzymatic browning as reaction–diffusion, reversible.
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
