# Native glass and four-view comparison continuation

User asked to continue glass improvements, then explicitly requested four views:
Three.js, Godot, Native Core and WASM Core, including skyboxes. Work is isolated
in `/private/tmp/nova64-glass`, branch `feat/native-glass-transmission`, based on
main `1494831c` (already pushed in the previous task). The original workspace at
`/Users/brendonsmith/exp/nova64` retains unrelated dirty Godot changes. Do not reset
or stage them. This continuation is not committed or pushed yet.

## Implementation

- `retroarch/transmission-render.h`: lazy separate opaque-scene texture, mipmaps,
  matching framebuffer HDR bit depth, binding and context cleanup.
- Native C: separates transmissive meshes from opaque and transparent passes;
  samples projected refracted exits using thickness, IOR, object scale and
  roughness. The background includes opaque scene objects, excluding glass itself
  and other transmissive meshes. Adds/clamps/getters for thickness and glass
  properties. Primitive dimensions are divided out of object scaling.
- `pbr-glass-fixture.js`: colored emissive objects behind a lens, created after
  the lens to catch creation-order bugs. Supports numeric test variants.
- `retroarch/tests/glass_native.mjs`: real GL readback checks visible background,
  creation order, thickness, IOR, roughness, and opaque control.
- API smoke tests cover glass fields, partial updates and clamping.
- `scripts/capture-four-way-sky.mjs` reuses three-way captures, packages fixtures
  with shared sky assets into `.nova`, runs the real RetroArch WASM frontend,
  steps until 60 fixture updates and makes labeled 2x2 stills and a slideshow.
  It disables audio synchronization via capture-only player HTML interception.
  WebGL errors now FAIL a capture. Records WASM and native binary identities.
- Three-way capture accepts `--godot-project=` and a `glass` fixture. This Mac's
  original Godot project has the working GDExtension, so use its absolute path.
- New commands: `pnpm retroarch:test:glass`, `pnpm visual:four-way:sky`.

## WASM discovery and build

Earlier handoff claims about unavailable WASM execution were incomplete. Docker
IS installed and its daemon works. The repo already has
`public/retroarch-web/{index.html,nova64_libretro.js,nova64_libretro.wasm}` and
`pnpm build:retroarch-web` builds the pinned Emscripten/RetroArch player.
Initialized the pinned QuickJS submodule in the isolated worktree, installed
dependencies with `pnpm install --frozen-lockfile`, and built native+harness.
The Docker script successfully built a real WASM player locally.

Four-view pilot exposed a genuine WebGL2 issue: glCopyTexSubImage2D rejects a
32F scene copied into a 16F refraction texture. Native desktop GL permitted it.
Fixed the helper to allocate the SAME component bit depth as the source FBO.
The native and WASM builds both completed after the bit-depth fix.
The first sky capture also exposed mip attachment completeness in WebGL2;
`skybox-render.h` now allocates the full environment mip chain before rendering
into nonzero mip levels. This was verified by the complete eight-case capture.

## Verification and artifacts

- Native GL glass readback passed, including creation-order equality.
- Sky suite passed with the new getter tests; software and real native GL pass.
- Full `pnpm test` passed on this main-based worktree (includes the corrected
  numerical Godot bloom regression committed on main).
- Before/after web/native captures are in `retroarch/build/glass-{before,after}`.
  Whole-frame error was 8.21 -> 3.44 /255. The current four-view fixture remains
  at 3.44 native vs Three.js after explicitly disabling the directional light.
- Four-view pilot exists under `retroarch/build/four-way-glass-pilot`, but its
  WASM glass panel has been refreshed after the fix and transmits the stripes.
  Native/WASM error is 0.46/255 with zero WebGL warnings.
- Vite is running from this worktree on port 5193 (exec session 83306).
- Godot executable `/Applications/Godot.app/Contents/MacOS/Godot`; project:
  `/Users/brendonsmith/exp/nova64/nova64-godot/godot_project`.
- Optional Colyseus extension errors occur in Godot logs; Nova64Host still loads
  and snapshots work. Preserve these warnings in reports.
- MemPalace remains unavailable on this Mac; preserve Windows/WSL config.

## Completed four-view output and next actions

Default eight-case four-view capture PASSED. Each WASM fixture completed 60
updates, had no WebGL warnings, and stayed below the 5/255 native/WASM gate.
Mean RGB errors: gradient 1.59, aurora 1.80, space 1.68, HDR 1.45, image 1.72,
environment 1.54, coating 1.72, glass 0.46. Godot differences remain report-only.
The gallery and 24-second 1280x792 slideshow are under
`retroarch/build/four-way-sky/` and were copied to the same path in the ORIGINAL
workspace for convenient durable review. The reel contains stills, not animation.
The report preserves core/glue/extension identities and Godot warnings.

Next: review glass lighting against the full PBR showcase, including absorption
and dispersion, check wider platform coverage, and commit the scoped source
changes when requested. Screen-space refraction only sees opaque scene geometry;
no glass-in-glass, offscreen geometry or exact Three PMREM/bicubic sampling.
Thin-walled/default-thickness semantics and legacy instancing/scaling still need
broader parity review. Source remains local on `feat/native-glass-transmission`.
Prior commit/push requests were completed before this continuation.

Source cart files under examples/ were not edited. Generated archives and
capture images/videos live under ignored build directories. Rebuilt WASM files
are tracked public assets; decide explicitly whether a later commit includes
the reproducible build artifacts. Keep the original comparison galleries.

## Follow-up: richer PBR, 48-second reel and splat proposal

The user asked to implement the next material improvements, double the next
comparison length and propose splat mapping. Added PBR-only GGX direct shading,
dielectric IOR-derived F0, preserved metal direct highlights through environment
lighting, direct-light clearcoat highlights and transmission-preserved direct
specular. Added Beer-Lambert absorption with `attenuationColor` and
`attenuationDistance`, infinity preserving neutral transmission. First physical
glass upgrades now use the web's default thickness when omitted; IOR is capped
to the web range. Legacy non-PBR lighting remains on its previous path.

New `retroarch/tests/carts/pbr-lighting-fixture.js` uses the shared studio sky and
a known directional light. Mean RGB error improved from 1.35 to 0.98/255 against
Three.js. A trial without a shared environment revealed an important remaining
gap: Three keeps RoomEnvironment reflections after selecting a solid sky, and
this Three version uses scene.environmentIntensity for implicit environment
maps, overriding per-material envMapIntensity. Do NOT flatten the web reference
to hide this difference. Default room-environment/indirect BRDF parity is pending.

`pnpm retroarch:test:pbr` passes real GL readback checks for direct coat highlights,
metal direct response and glass absorption. API smoke checks default thickness
and absorption retention. Full `pnpm test` passed. Both native and Docker WASM
cores rebuilt successfully after the shader changes.

The new default four-view reel contains eight stills at six seconds each (48
seconds). Six skies, a direct-lit coating/metal reference and glass. Full capture
passed with zero WebGL errors; WASM/native fixture errors stay below 1.81/255.
Saved under `retroarch/build/four-way-pbr-upgrade/`; copy to the same path in
the original workspace for review. Keep the older 24-second gallery intact.

`plans/SPLAT_MAPPING_PROPOSAL.md` recommends a four-layer terrain material MVP
(provisional 7–13 engineering days) and separately scopes Gaussian splats for
scanned scenery. It cites primary technical sources and lists all four target
seams, asset packaging and performance/compatibility gates. No splat mapping
implementation was started. Source changes remain local and uncommitted.

## Latest scope clarification: PlayCanvas Gaussian splatting

The user supplied https://developer.playcanvas.com/user-manual/gaussian-splatting/
and clarified that Nova64 should offer similar Gaussian splatting capabilities.
The proposal has been rewritten around that goal; the earlier terrain-first
recommendation and its 7–13 day estimate DO NOT describe the requested feature.
Reviewed official format, rendering/global sorting, WebGL2/WebGPU, editing,
streaming and proxy relighting documentation. The new estimate is 21–37
engineering days for a bounded four-target MVP, with broader PlayCanvas-style
capabilities as a multi-month roadmap. It is a proposal, not implemented support.
The revised proposal was copied to the original workspace's plans directory and
the worktree BACKLOG entry updated. Do not start terrain blending as this task.
