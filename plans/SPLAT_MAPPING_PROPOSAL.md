# Nova64 Gaussian splatting proposal

Revised 2026-11-12 following the user's PlayCanvas reference. The production
feature remains proposed; a bounded Three.js feasibility renderer now exists
under `experiments/gaussian-splatting/`. This replaces the earlier
terrain-first recommendation with the user's intended Gaussian splatting goal.

The feasibility scene decodes synthetic Gaussian PLY, projects anisotropic
ellipses, globally sorts two transformed resources and tests ordinary mesh
occlusion and cart reset. It is Three.js-only, synchronous and DC-color-only.
It does not yet provide the proposed public loader, a validated real scan,
worker sorting or a Godot/native/WASM implementation. See the
[experiment README](../experiments/gaussian-splatting/README.md).

A newer browser implementation now exists in `experiments/splat-worlds/`:
licensed apartment/sculpture assets, Spark and Babylon rendering, four splat
shader effects and live linked portals with player crossing. The focused checks
verify clipping, opaque occlusion, parallax, crossing/return and reset. This is
still an experimental console cart with a flat floor proxy; production APIs,
portable packaging, Apple conversion and Godot/native/WASM splats remain pending.
See [the implementation handoff](SPLAT_WORLDS_HANDOFF.md).

## Product target

Give Nova64 capabilities comparable in direction to
[PlayCanvas Gaussian Splatting](https://developer.playcanvas.com/user-manual/gaussian-splatting/):
load scanned scenes and objects, compose them with gameplay and ordinary meshes,
preview them in Studio, optimize/package assets and run the same cart on
Three.js web, Babylon.js web, Godot, Native Core and WASM Core.

Use external capture/training and SuperSplat authoring initially. Nova64 should
consume their output and provide an integrated runtime and preview workflow.
A complete capture/training service or a replacement SuperSplat editor is not
part of the initial implementation.

## Explorable worlds, effects and live portals

The user's clarified creative direction is World Labs-style explorable splat
worlds with PlayCanvas-style shader effects. The synthetic rings remain a
correctness fixture; they are not the visual quality target for the next demo.
Use a licensed environment with authored scale, entry pose, navigable collision
proxy and an intentional camera route. Preserve source attribution and hashes.

Evaluate [Spark](https://sparkjs.dev/docs/system-design/) for the Three.js
production candidate rather than scaling the synchronous experimental renderer.
Its [splat modifiers](https://sparkjs.dev/docs/splat-mesh/) offer programmable
GPU effects. Evaluate Babylon's installed Gaussian implementation separately;
keep common asset, camera and effect semantics above renderer-specific code.
PlayCanvas [shader customization](https://developer.playcanvas.com/user-manual/gaussian-splatting/building/custom-shaders/)
is the visual reference, not a promise that its shader chunks run unchanged on
other engines. Begin with radial reveal, noise dissolve, scan pulse and tint.
Effects must modify splat attributes or fragments, not only a screen overlay.
Retain an effects-off reference for image comparisons.

**Live portals are a required world interaction.** A portal must reveal a live,
perspective-correct view into a second world while the player approaches and
moves sideways, and allow the player to cross into it. A static image, looping
video or scene-change trigger alone does not satisfy this requirement.

First implement one linked pair between two separately managed worlds:

1. Transform the viewer camera through the entry and exit frames (including the
   half-turn between doorway orientations). Update the destination camera's
   orientation and projection each frame. Keep both world roots resident while
   the portal is visible.
2. Render the destination into a separate color/depth target. Clip against the
   destination doorway plane so geometry behind that doorway cannot leak into
   the view. Composite through a stencil or depth-tested aperture, with correct
   foreground occlusion and no destination pixels outside the opening.
3. Use the destination camera for its Gaussian projection, visibility and depth
   sorting; reusing the main camera's sorted list is incorrect. Keep per-view
   targets/order buffers distinct, even when source splat storage is shared.
4. Detect front-to-back plane crossing inside the doorway bounds, transform the
   player's pose and velocity, and transfer collision/world ownership. Define
   the world-up convention and prevent immediate crossing oscillation. The
   destination collision proxy must already be loaded before entry is enabled.
5. Dispose portal targets and secondary-view resources on cart reset. Surface
   destination loading/failure in the doorway; do not permit entry into an
   unloaded world. Package both worlds and their proxies in the portable demo.

Initial scope is equal-scale, upright doors, one visible portal view, one bounce
and no recursive portals. These bounds are implementation choices for the first
milestone, not limits of the intended product. Native/WASM and Godot require
explicit render-target, clipping and per-camera sorting work; browser success
alone does not establish five-target portal support.

Portal acceptance footage must show lateral parallax, approach and retreat,
foreground mesh occlusion, clipping at both doorway edges, crossing in both
directions, preserved movement and collision on arrival. Include a mesh object
in the destination so a picture-based substitute cannot pass. Compare each host
using the same route and record frame time with the second world visible.

The next hero demo should run at least 48 seconds: environment exploration,
a restrained reveal/pulse sequence, then a live view through a portal and a
walk into the second world. Provide manual controls as well as a reproducible
capture route. Label supported hosts truthfully; retain the existing native
material/sky comparison until Gaussian rendering is implemented there.

Apple interoperability remains part of discovery: USDZ is a container; inspect
its schema before accepting it as a Gaussian asset. Apple's
[RealityKit Gaussian sample](https://developer.apple.com/documentation/visionos/rendering-gaussian-splats-with-realitykit)
uses Gaussian particle data. Normalize supported data offline and reject unknown
neural representations clearly. General NeRF/light-field weights require their
own renderer or a conversion step. No USDZ or neural-field loader exists in the
current prototype.

World generation through World Labs is a separate integration from loading and
exploring exported worlds. Do not imply that Nova64 currently generates worlds.

## Reference capabilities and Nova64 milestones

| Capability          | First implementation                                                                     | Later expansion                                                            |
| ------------------- | ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Import and delivery | Validate Gaussian PLY offline; convert to one bounded runtime representation in `.nova`. | SOG/SPZ interoperability and streamed scenes.                              |
| Rendering           | Anisotropic projected Gaussians, opacity, DC color and global back-to-front sorting.     | Higher spherical-harmonic orders, advanced filtering and quality controls. |
| Scene composition   | Transforms, multiple overlapping splat assets, opaque-mesh depth testing and skyboxes.   | Glass/transparent interactions, shadows and proxy relighting.              |
| Interaction         | Cart loading/unloading, visibility, bounds and proxy collision.                          | Splat picking, annotations and Studio interaction tools.                   |
| Authoring           | Import/preview and reproducible offline conversion.                                      | Cropping, color adjustments and asset inspection.                          |
| Scale               | Explicit count/memory limits and measured quality presets.                               | Spatial hierarchy, LOD, progressive loading and eviction.                  |
| Evidence            | One identical cart and asset, four-target captures and timing/memory reports.            | Wider desktop/mobile driver coverage and stress scenes.                    |

PlayCanvas distinguishes source/interchange PLY from compressed delivery formats
and large-scene streaming. Treat these as separate milestones rather than claim
that accepting PLY means format parity.
[Format reference](https://developer.playcanvas.com/user-manual/gaussian-splatting/formats/).

PlayCanvas globally sorts splats across components to prevent overlap artifacts.
Its WebGL2 path uses CPU sorting; GPU sorting is a WebGPU path. This supports a
portable CPU-sort/raster baseline for Nova64's existing GLES3/WebGL2 targets.
[Architecture](https://developer.playcanvas.com/user-manual/gaussian-splatting/rendering-architecture/),
[renderers](https://developer.playcanvas.com/user-manual/gaussian-splatting/rendering-architecture/renderers/).

## Shared cart and asset contract

Proposed API shape, subject to a source-level contract review:

```js
const scan = await nova64.scene.loadGaussianSplat('assets/atrium.n64splat');
nova64.scene.setPosition(scan, 0, 0, 0);
nova64.scene.setRotation(scan, 0, Math.PI / 2, 0);
nova64.scene.setScale(scan, 1, 1, 1);
```

This API does not exist yet. The goal is the same cart on every target, with
compatible handles, reset/disposal, transforms and an explicit capability query.
Existing cart code should continue to work. Babylon's experimental host needs
an explicit supported path or unsupported capability response, not a silent no-op.

The first offline converter should inspect a precisely documented Gaussian PLY
schema, normalize position, scale, quaternion, opacity and color, then emit a
versioned runtime asset. Preserve source metadata and conversion settings for
reproducible builds. Reject unsupported schemas clearly; generic point-cloud
PLY files do not necessarily contain the Gaussian properties we need.

Keep heavy parsing and sorting outside cart JavaScript. The native/WASM core
should own its data and rendering buffers; Three.js should use a worker for
sorting. Evaluate sharing the sorting kernel between hosts after the initial
prototype proves the data layout. Do not place a new engine inside Three.js or
replace Nova64's existing renderer just to get a browser-only viewer.

`.nova` must include the converted asset, optional proxy mesh, attribution and
manifest entries. A packaged demonstration must run outside the source checkout.
Compressed-format decoders should not become mandatory dependencies of every
host until packaging, memory and platform builds have been demonstrated.

## Renderer design

1. Decode to a bounded internal representation, including bounds and transforms.
2. Collect visible splats from all active assets into a camera-specific order.
3. Sort globally by camera depth, with a stable tie policy and defined camera-cut
   behavior. Per-object bounding-box ordering is insufficient for overlapping scans.
4. Project each 3D covariance into a screen-space ellipse and draw instanced quads
   with Gaussian alpha falloff. Point sprites alone do not establish Gaussian parity.
5. Test against opaque geometry depth and blend back to front without treating
   translucent splats as solid depth-writing surfaces.
6. Integrate the splat pass with the existing linear/HDR pipeline, skyboxes and
   final exposure/output conversion. Avoid applying baked lighting twice.

A separate mesh remains useful for gameplay collision and depth-dependent
features. PlayCanvas also documents depth-buffer limitations for splats.
[Renderer depth considerations](https://developer.playcanvas.com/user-manual/gaussian-splatting/rendering-architecture/renderers/).

Glass refraction needs an explicit pass-order decision: Nova64's new transmission
snapshot currently includes opaque meshes. Including splats in that snapshot
requires a deliberate compositing stage and proxy/depth tests; it does not happen
automatically. Screen-space transmission still cannot see offscreen content.

For relighting, PlayCanvas uses a lit proxy mesh and transfers its lighting to
splat pixels. Nova64 can investigate this after basic composition is stable;
it is not equivalent to recovering fully editable physical materials from a scan.
[Relighting reference](https://developer.playcanvas.com/user-manual/gaussian-splatting/building/relighting/).

## Four-target implementation seams

| Target       | Work                                                                                                                   |
| ------------ | ---------------------------------------------------------------------------------------------------------------------- |
| Three.js web | Gaussian resource/adapter, custom raster material, worker sorting and disposal; preserve the existing console.         |
| Godot        | Native/ShaderMaterial resource and buffer upload, camera-depth sorting, blend/depth integration and host API bindings. |
| Native Core  | C-owned arrays, sort buffers, splat-specific GPU resources, pass ordering and GL context cleanup.                      |
| WASM Core    | Same C/shader path through the real RetroArch browser player; test WebGL restrictions and memory growth.               |

WebGPU sorting is an optional future acceleration, not a requirement for initial
support. Streaming likewise needs a portable resource-loading interface before
we promise hosted behavior on standalone native or packaged offline carts.

## Phases and effort

These are provisional engineering-effort ranges, not calendar promises. They
supersede the earlier small terrain estimate and browser-only splat estimate.
The discovery phase should produce a new estimate from measured results.

| Phase                                  | Effort    | Acceptance                                                                                                  |
| -------------------------------------- | --------- | ----------------------------------------------------------------------------------------------------------- |
| Feasibility and contract               | 2–4 days  | Small licensed scan plus synthetic fixtures; correct covariance projection, ordering and memory accounting. |
| Three.js reference implementation      | 4–7 days  | Converter, loading, transforms, global sorting, opaque occlusion and disposal.                              |
| Shared Native/WASM implementation      | 7–12 days | Same cart and asset on native GL and real WebGL2; bounded C-owned memory.                                   |
| Godot implementation                   | 5–9 days  | Same transforms, color/opacity, depth behavior and lifecycle.                                               |
| Packaging and four-target verification | 3–5 days  | Portable `.nova`, four-view comparison, profiling and documented limits.                                    |

Total: approximately **21–37 engineering days** for a bounded four-target MVP
(roughly 4–8 engineering weeks at five days per week). This is not full PlayCanvas
parity. Do not promise million-splat scenes or mobile frame rates before profiling.

For broader capabilities, provisionally add:

- Compressed-format integration, LOD and streaming: 3–6 engineering weeks.
- Picking, proxy shadows/relighting, transparency integration and Studio tools:
  3–6 engineering weeks.
- GPU sorting, XR, advanced procedural effects and capture/training tools:
  separately scoped after the baseline. Assets, devices and quality targets can
  materially change these estimates.

The broad PlayCanvas-style roadmap is therefore a multi-month effort. Reuse
compatible open-source tools where useful, after checking their actual licenses
and renderer boundaries; do not assume an engine-specific package ports to C.

## Validation gates

- Synthetic rotated anisotropic splats verify projection, not just point rendering.
- Overlapping components and camera cuts exercise global ordering.
- Transparent edges, SH/DC color and quaternion conventions match the reference.
- Opaque mesh occlusion, sky backgrounds, exposure and viewport resizing work.
- Repeated load/reset unloads CPU/GPU resources without growth.
- Missing, malformed and oversized data fail predictably before large allocations.
- Profile illustrative 10k, 50k and 100k datasets first; increase to 250k/500k only
  after memory and sorting costs are measured. These are test sizes, not limits
  or performance claims.
- Report sort time, upload time, draw time, peak CPU/GPU memory and cold startup
  independently. Separate CPU and asynchronous worker sorting latency.
- Preserve asset license/attribution, hashes, converter version and runtime identity.
- Record the same camera path across all four hosts. Keep the next comparison
  at least 48 seconds and label still-image reels separately from motion footage.

## Immediate milestone

Validate a licensed environment through the Three.js production candidate and
Babylon, with matching camera paths, effects, opaque occlusion and reset cleanup.
Then build the linked live portal pair and capture the exploration/crossing route.
Port the established asset and view contracts to Native Core, WASM Core and Godot.

The earlier 4–8 engineering-week estimate covers the bounded four-target baseline
only. It does not include the newly requested Babylon implementation, live
portals, large explorable worlds or Apple conversion. Provisionally allow 5–10
engineering days for a tested two-browser portal pair after reliable splat
rendering, and 10–20 additional days for Godot/native/WASM portal integration.
These are unvalidated planning allowances, not delivery dates; re-estimate after
measuring a real environment and a second simultaneous view.

