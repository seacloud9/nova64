# RetroArch native: current web sky and bloom parity

Prepared: 2026-11-12. Status: initial native implementation completed locally; comparison capture and
platform validation results are recorded below. Exact full-renderer parity remains
a follow-up, not an inferred outcome from loading demos.

## Outcome

Run unchanged current web carts through the native RetroArch core and preserve
their authored skies, animated atmosphere, sky-driven material reflections, and
bloom. Demonstrate the result with repeatable web/native screenshots and gameplay
videos. Three.js is the visual reference; keep Babylon and Godot behavior intact.
Do not retune carts to conceal renderer gaps or use older hand-authored native
ports as evidence that unchanged web carts match.

## Inspected baseline and gaps

- `runtime/sky-shaders.js` contains shared procedural shader source used by the
  web renderers. `runtime/api-skybox.js` wires options, animation, environment
  baking, image skies, HDR panoramas, and lifecycle.
- Recent relevant commits include `44550d5e` (procedural skies/presets and sky
  reflections), `28cf1173` (authored emissive intensity and palette), and
  `5015b346` (Babylon HDR skies). Freeze the exact tested web revision before
  implementation; inspect uncommitted changes separately rather than treating
  them as released behavior.
- In `retroarch/nova64_libretro.c`, injected `createGradientSkybox` and
  `createSpaceSkybox` wrappers currently record `nova64._skybox` options. This
  does not implement the web sky shader or prove that the requested effects render.
- Native GL already has equirectangular sky rendering, a two-color gradient,
  HDR post targets, and a multi-mip bloom chain. Extend these paths rather than
  introducing another independent renderer.
- Commit `a14b3cff` fixes desktop GL shader versions and macOS offscreen native
  capture. It is currently on the feature branch, not main. Integrate this
  prerequisite with its existing tests before relying on macOS comparisons.
- The backlog records demoscene tuning against an obsolete washed-out web
  reference. Historical similarity scores are not acceptance thresholds for the
  corrected web renderer.

## Implementation sequence and verification

### 1. Freeze references and make failures visible

Inventory the current sky API, defaults, return values, promises, update hooks,
and reset behavior against the native bindings. Include `createSkyPreset`,
gradient/space/solid/image/environment/HDR creation, clear/update operations,
reflection intensity, rotation, and all options exercised by the selected demos.
Audit missing functions, stubs, and silent fallbacks before visual tuning.

Capture the same web cart source, assets, viewport, seed, camera, input timeline,
and simulated time on both hosts. Retain revisions and source/asset hashes.
Separate loading or module failures from renderer failures; fix required loader
or API blockers before claiming a visual result. Preserve unrelated workspace work.

Verify: baseline screenshots and structured API-gap report for hello-skybox,
skybox-showcase, pbr-showcase, Space Harrier, F-Zero, and demoscene. Check whether
the harness omits module dependencies (notably Breakwater Circuit) before adding
that cart as a required gameplay comparison.

### 2. Implement procedural skies and preset parity

Use `runtime/sky-shaders.js` as the source of shader math. Evaluate deterministic
generation of C shader strings at build time, following the existing Godot sky
shader generation approach, instead of maintaining copied GLSL by hand. Adapt
interfaces/version declarations for desktop GL and GLES/WebGL without changing
the shader's visual calculations. Test generation drift if generation is adopted.

Implement view-direction-based sky sampling, correct camera rotation, no
translation parallax, projection/aspect handling, and explicit linear/sRGB output.
Carry the current web parameters and defaults through native state: horizon,
sun, clouds, wind, stars, nebulae and other space features, toon bands, ocean,
aurora, meteors, rays, rainbow, and seed where exposed. Inspect actual shader
uniforms to determine the complete set rather than inventing native defaults.
Drive animation with cart time and clear state/resources on cart reset.

Verify: all skybox-showcase modes at fixed times and camera orientations;
hello-skybox star fields; Space Harrier highlands; F-Zero's authored gradient.
Include animated sequences so a matching still cannot mask frozen effects.
Check horizon, sun placement, seams, poles, resize, and sky changes mid-cart.

### 3. Connect the visible sky to materials

Implement six-face image and HDR panorama loading with correct orientation,
rotation, exposure/intensity, asynchronous completion, and cleanup. Audit native
HDR decode/upload support before estimating or implementing additional formats.
Use the same visible environment for PBR illumination/reflections. Determine what
native roughness filtering and diffuse/specular environment integration exist;
implement missing pieces needed to match the web reference. A sky background
without material response does not pass this milestone.

Match basic/unlit versus diffuse versus PBR behavior and authored emission.
Preserve explicit zero intensity, color, opacity, and material-cache distinctions.
Distinguish reflection support from transmission/refraction; record and test any
remaining refraction gap rather than claiming full PBR parity from metallic spheres.
Cache expensive environment processing; do not regenerate every frame unless
the web reference does. Match the web policy for animated visible skies versus
environment refreshes.

Verify: pbr-showcase with existing HDR assets, environment presets, roughness
steps, metals and glass; rotating the sky changes highlights in the correct
direction. Switching carts releases environments and leaves no stale lighting.

### 4. Match bloom and the color pipeline

Trace web emission through bloom extraction, blur/mip composite, tone mapping,
exposure, and output encoding; compare the native pass order and render-target
formats. Reuse authored cart values without blanket brightness/saturation lifts.
Check dynamic `setBloomStrength` changes as well as initial `enableBloom` settings.

Match threshold and its transition, strength, radius/mip weights, blur kernels,
HDR bright values, and transparent emission where supported by the reference.
Inspect existing kernels before deciding which require changes. Ensure sky output
receives bloom exactly as in the web reference; isolate HUD composition so text
is neither double-encoded nor accidentally included/excluded from effects.
Report LDR fallback limitations explicitly instead of scoring them as HDR parity.

Verify: focused emission-intensity/color fixtures, bloom-off/on captures, bright
sky against dark geometry, moving highlights, and HUD colors. Check demoscene
scene transitions and F-Zero's boost-driven bloom. Preserve detail in highlights
and dark geometry; do not maximize similarity by washing out both images.

### 5. Demonstrate and lock the result

Extend the existing native/web visual harnesses rather than duplicating their
launch, input, and capture infrastructure. Use unchanged `examples/` sources
and dependency/asset manifests. Label the native execution environment: offscreen
core harness versus an actual RetroArch frontend. Both are useful, but the
harness alone cannot establish frontend presentation, pacing, or input behavior.

Deliver labeled web-left/native-right videos for Space Harrier gameplay,
skybox-showcase modes, PBR sky/material changes, F-Zero racing/boost, and
demoscene scenes. Capture at least 30 seconds of gameplay where applicable,
plus a concise highlight reel. Include a contact sheet and machine-readable
measurements. Preserve artifacts in a durable local artifact directory, not only
temporary session folders; agree on any public hosting separately.

Record synchronized start/time/input and any residual timing differences.
Report image structure, edge detail, color/brightness, HDR clipping, sky placement,
frame times, and memory independently. Establish numeric regression tolerances
after collecting correct baseline captures; overall similarity is supporting
evidence, not a substitute for checking authored effects and geometry.

Verify: native build, narrow new conformance cases, relevant existing sky/material/
bloom/overlay locks, then full conformance and native/web cart sweeps. Review
checksum changes individually with captures; never blanket-rebaseline regressions.
Run existing JS tests and build for shared changes. Confirm macOS desktop GL and
Linux GLES; validate Windows GL on available hardware before calling Windows
parity complete. Rebuild/redeploy platform binaries only after fixes pass.

## Definition of done

- Selected current web cart sources remain unchanged and load with their assets.
- Animated procedural skies, image/HDR skies, and material response match the
  tested reference within reviewed tolerances; limitations are listed per feature.
- Bloom honors authored settings and preserves palette, detail, and HUD behavior.
- No silent sky API stubs are counted as supported features.
- Reset, repeated cart switching, resize, and long-running animation pass.
- Side-by-side videos and comparison results are available with reproducible commands.
- Conformance/sweep results distinguish passing gameplay/rendering from mere loading.

## Effort estimate and order

Estimate for one experienced developer with AI assistance, working full-time:

| Work                                                            | Effort    |
| --------------------------------------------------------------- | --------- |
| Reference inventory, capture baseline, prerequisite integration | 2–3 days  |
| Procedural sky shaders, options, presets and animation          | 4–7 days  |
| Image/HDR skies and environment/material response               | 5–10 days |
| Bloom/color/emission alignment                                  | 3–6 days  |
| Demo comparisons, regression coverage, platform verification    | 3–5 days  |

Total: approximately 17–31 working days (4–7 weeks). This is preliminary;
re-estimate after the baseline identifies loader and native IBL/HDR gaps. Expect
a first procedural-sky comparison in roughly 1–2 weeks. Full refraction or major
missing environment-filtering infrastructure may extend the total. Account/device
availability and unrelated release work are excluded from effort estimates.

Start with hello-skybox and skybox-showcase, then PBR, Space Harrier/F-Zero, and
demoscene. Do not spend the first milestone polishing the reel while sky features
still fall back silently. Track all queued work through root `BACKLOG.md`.

MemPalace is unavailable on this Mac because `~/ai-tools` is absent. Consult
repository source/history for now; preserve the Windows/WSL memory configuration.

## Implementation checkpoint — 2026-11-12

Implemented locally on the existing feature branch; not committed or released.
The native macOS core was rebuilt. Existing web demo sources were not edited.

- Shared procedural shaders, constructor defaults and presets are generated into
  `retroarch/generated/sky.h`; generation drift and JS API defaults are tested.
- Native skies support clouds, ocean, aurora, nebulae and animated star sprites,
  plus HDR panoramas, cube-image skies and environment light-panel presets.
- Visible skies feed GGX-filtered specular mips and cosine-weighted diffuse sky
  lighting. PBR setters now carry color and emission instead of dropping them.
- The current web bloom path preserves strength/radius/threshold, including object
  arguments. Its bright-pass knee and per-mip Gaussian kernels track Three.js;
  forced tint/sharpening/ACES overrides were removed from that path. Zero bloom
  retains the output pass, matching the web composer's behavior.
- Corrected web-mode directional-light convention and point-light distance falloff.
  Legacy native rendering keeps its prior pipeline and checksum behavior.
- Both cart packagers include and declare shared sky assets; the packaged API
  regression loads outside the source checkout, including attribution.

Controlled fixed-camera captures on Apple M4 Pro (native desktop GL Core and
web ANGLE Metal) measured mean absolute RGB error on a 0–255 scale:

| Sky fixture                | Mean RGB error |
| -------------------------- | -------------- |
| Procedural highlands       | 0.12           |
| HDR panorama with rotation | 0.35           |
| Six-face image sky         | 0.48           |
| Studio environment panels  | 0.39           |

The first four measurements isolate background rendering; the final fixture
checks an emissive cube and its bloom halo. They are not a percentage of
full-engine parity. Demo scenes retain material, geometry, effects and RNG-related
visual differences; in particular native PBR filtering is not Three.js PMREM,
clearcoat is incomplete and glass refraction remains an environment approximation.

Validation:

- `pnpm retroarch:test:sky`: generated-header check, six web/native API tests,
  packager regression and packaged native software/GL smoke passed.
- Full software conformance passed with 47 recorded macOS mismatches excluded.
- Full GL conformance reported 20 additional checksum mismatches plus 50 recorded
  macOS mismatches. A separately compiled pre-change core produced the identical
  20 mismatch hashes. No checksum baselines were relaxed or rewritten.
- CLI tests passed (19 checks), and the CLI package regression passed.
- Root quick validation remains blocked by the existing uncommitted Godot bloom
  threshold mapping regression; that separate implementation was left in place.
- MemPalace remained unavailable on this Mac.

Artifacts: `retroarch/build/sky-bloom-parity/` contains six labeled
web/native comparison videos (Skybox Showcase, PBR Showcase, Space Harrier,
F-Zero, demoscene and Hello Skybox), stills, source hashes and validation logs.
Five videos run 30 seconds; demoscene runs 52 seconds with start input to cover
all five scenes.
`highlight-reel.mp4` and `contact-sheet.png` provide an overview.
The videos show the offscreen native core, not a running RetroArch frontend.
Controlled HDR/image/environment fixture captures are in sibling `sky-*-parity/`
directories. These local build artifacts are ignored by Git.

Remaining queued work: review full-demo material/geometry differences (including
F-Zero track props and RGBA32-versus-hex HUD color ambiguity), exact PBR
and clearcoat/refraction behavior, Windows/Linux driver checks and real RetroArch
frontend presentation/input validation. Preserve the current web reference and
use the new fixture modes to distinguish sky defects from unrelated cart behavior.
