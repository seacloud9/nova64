# Indie Odyssey — Hand-off for Codex

Continuing the cart port + cross-backend combat work that landed in
commits `6c0a5f0` and `5f5e32b` on `main` (2026-06-18 / 19).

## What's done

### Cart (`examples/indie-odyssey/`)

- Full cross-backend port of *Indie Odyssey: Book One — Echoes of the
  Shardgrid* (originally `refrence/IndieOdyssey_1/`, a Babylon-only
  TypeScript project).
- Combat scene with a SkyboxBattleSceneManager-style purple sky, GLB
  enemy models (`dataImp.glb`, `glitchRat.glb`, `firewallSlime.glb`,
  `hexWraith.glb`), 2D HUD overlay (`combatSpriteCanvas` at z=12),
  sprite fallback when no GLB is available.
- Story-mode intro slides with pixel-melt transitions
  (`storyFrameCanvas` at z=13, `drawStory*` helpers).
- Random encounters during dungeon movement, autoplay gated on GLB
  resolution so enemies can't die before their model arrives.
- `__INDIE_ODYSSEY_DEBUG.forceCombat([...])` dev-console hook for
  triggering combat from any screen — also disables autoplay so the
  scene stays open for inspection.

### Engine

- `runtime/api-effects.js` — added `OutputPass` as the EffectComposer's
  terminal pass so adding/removing intermediate effect passes can't
  break canvas presentation. Added `fx.setEffectsBypass(bool)` and
  `fx.isEffectsBypassed()` plumbing (kept in the API even though
  indie-odyssey no longer uses bypass — other carts may need it).
- `runtime/backends/threejs/gpu-threejs.js` — pre-acquires the WebGL2
  context with `alpha: false` BEFORE constructing `WebGLRenderer`, so
  the canvas drawing buffer is reliably opaque.
- `runtime/backends/babylon/compat.js` — material-protocol shims
  (`isReady`, `isReadyForSubMesh`, `needAlphaTestingForMesh`) so GLB
  materials don't throw during Babylon's render-prep walk.
- `runtime/namespace.js` — exposes `fx.setEffectsBypass`,
  `fx.isEffectsBypassed`, `scene.getScene`, `scene.getRenderer`,
  `scene.getMesh` to carts.

### Tests

- `tests/playwright/indie-odyssey.spec.js` — runs the boot + combat
  flow on BOTH `threejs` and `babylon`. Asserts:
  - cart manifest loaded, default difficulty, asset count
  - **zero console errors at boot** (`expect(errorLogs).toEqual([])`)
  - GLB enemies reach `modelStatus: 'ready'` (NOT `'loading'` or
    `'error'`) within 30s
- `tests/playwright/bloom-clear-color.spec.js` — regression test for
  the `fx.setEffectsBypass` + `scene.setClearColor` contract.

### Documentation + memory

- `docs/api-improvements.md` items #13 (`nova64.loader`), #14
  (`nova64.story`), #15 (`nova64.video`) added — patterns the cart
  re-implemented locally that should be promoted to engine APIs.
- `ROADMAP.md` — added a "Cross-Cart Effect Backlog" note for shared
  transition/glitch overlays.
- Mempalace memory `feedback_render_bug_strategy.md` updated with two
  concrete root causes from this session: (1) CSS
  `canvas { background: #000 }` poisons dynamically-created overlay
  canvases — always set `style.background = 'transparent'`; (2)
  `fx.setEffectsBypass(true)` wipes the canvas on some GPUs — default
  to composer path.

## Open issues

### 1. Demoscene Three.js vs RetroArch render parity (MEDIUM)

User flagged earlier: "the demoscene threejs version renders
differently in comparison to retroarch — there is a bug that does
not properly clear that scene". Needs a side-by-side visual
comparison. Likely suspect: `examples/demoscene/code.js`
`_local_setupScene` and `cleanupScene` don't reset
`renderer.clearColor` between scenes; the previous scene's clear
colour leaks into the next one.

Quick experiment: log `renderer.getClearColor()` at the start of
each `transitionToNextScene` call to confirm it's stale before
patching.

### 2. Babylon backend deeper visual fidelity (LOW)

The shader compile failure and muted Babylon dungeon view are fixed:
Indie Odyssey tracks dungeon point lights, hides them during combat
with the shared `setLightVisible(id, visible)` API, and Babylon
materials/effects now honor emissive intensity plus object-form bloom
options. The old Babylon 2D fallback dungeon renderer is now opt-in via
`globalThis.__INDIE_ODYSSEY_2D_FALLBACK = true` instead of covering the
real 3D scene by default.

Use `scripts/diagnostics/indie-level-visual-check.mjs` for future
Three/Babylon dungeon visual checks and
`scripts/diagnostics/combat-visual-proof.mjs` for combat screenshot
checks.

## Diagnostic helpers reference

All under `scripts/diagnostics/` (uncommitted as noted above). See
`scripts/diagnostics/README.md` for full details. Quick map:

| Helper | What it answers |
|---|---|
| `run-combat-proof.sh` | Does threejs combat render purple at the centre pixel? |
| `run-babylon-shader-check.sh` | Does babylon emit any shader / compile errors during combat? (See caveat above re BJS log channel.) |
| `run-indie-glb-combat-check.sh` | Do GLBs reach `ready` state on both backends? |
| `indie-level-visual-check.mjs` | Do Three.js and Babylon show comparable first-dungeon brightness/glow? |

When porting a probe to a real CI test, target
`tests/playwright/indie-odyssey.spec.js`.

## Key lessons (also captured in mempalace)

The two render bugs that ate the longest debugging cycle, in order
of likelihood for next time:

1. **`canvas { background: #000 }` poisons dynamically-created
   overlay canvases.** `console.html` has a global rule applied to
   every `<canvas>` element. Any cart-created overlay canvas
   (combat sprite, story slide, debug panel, video player) inherits
   it and becomes an opaque-black layer everywhere except where
   canvas content is drawn — **completely hides the WebGL canvas
   below**. Always set `style.background = 'transparent'` on
   dynamically-created overlay canvases. Centre-pixel pixel probes
   miss this because the centre IS transparent — check
   `getComputedStyle(c).background` too.

2. **`fx.setEffectsBypass(true)` wipes the canvas on some GPUs.**
   Its DIRECT render path (explicit clear + `renderer.render(scene,
   camera)`) produces zeroed output on at least one Windows/Chrome
   GPU combo, and subsequent overlay quads rendered afterward are
   invisible. With `alpha: false` locked on the canvas context, the
   original alpha=0 quirk that bypass was working around is moot —
   default to the composer path.

Heuristic order for "render looks broken but state dump says
correct": heartbeat assert → pixel readback (all canvases) →
bright-block isolation → CSS-bg probe → pragmatic fallback through
a layer you've already proven reaches pixels.

## Branch state

No outstanding rebases or merge conflicts were pending when this note was
last updated. Use `git log --oneline -5` and `git status --short` for the
current local state.
