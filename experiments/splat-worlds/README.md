# Explorable splat worlds and live portals

Experimental implementation inside Nova64's existing console. Three.js uses
Spark 2.4.0; Babylon uses its installed Gaussian renderer. This is a browser
reference, not a production `nova64.scene` Gaussian/portal API.

Start Vite on the explicit port:

```sh
pnpm splat:assets   # downloads scans from pinned URLs, verifies SHA-256 (gitignored)
pnpm dev --host 127.0.0.1 --port 5193
```

- Three.js: http://127.0.0.1:5193/console.html?path=/experiments/splat-worlds/cart.js&w=640&h=360
- Babylon: http://127.0.0.1:5193/console.html?backend=babylon&path=/experiments/splat-worlds/cart.js&w=640&h=360

WASD moves, left/right arrows turn, Shift moves faster. Walk into the cyan
portal to enter the gallery, then turn around and walk into the amber portal
to return. Keys 0–4 select original, radial reveal, dissolve, scan pulse or tint.
Effects alter splat colors/opacity in GPU shaders; baked scan lighting is retained.

The apartment is a 661,466-splat licensed environment; the gallery contains a
162,598-splat scanned sculpture. Babylon pads these buffers slightly. Source
attribution, pinned URLs and SHA-256 are in
[`../gaussian-splatting/assets/ATTRIBUTION.md`](../gaussian-splatting/assets/ATTRIBUTION.md).
Spark code is MIT; scan assets remain CC BY 4.0.

Each doorway renders the other world from a transformed camera into a separate
render target. Three.js clips with an oblique projection; Babylon uses its
Gaussian/mesh clip-plane support. The aperture is depth tested against ordinary
geometry. The two worlds own separate sort/render resources. Crossing transforms
the player pose and movement through the linked door frames. Destination assets
finish loading before cart initialization completes, so traversal never enters an
unloaded world. This prototype waits for both downloads rather than streaming.

```sh
pnpm test:splat:worlds
# Optional 48-second moving comparison and the same checks:
node scripts/splat-worlds-check.mjs --capture
```

Checks cover asset hashes, portal transform/projection, doorway crossing bounds,
actual clipping/occlusion pixels, parallax, tint pixels, WASD and cart reset.
Artifacts go to ignored `retroarch/build/splat-worlds/`. Capture uses fixed steps
and yields to worker sorting: it is motion footage, not a frame-rate benchmark.
The combined movie puts Three.js/Spark on the left and Babylon on the right.

Current limits: one portal view per world, one bounce, equal-scale upright
frames, a flat floor and bounded movement. Scanned walls/furniture do **not** have
collision proxies yet. No recursive portals, portable `.nova` packaging,
USDZ/NeRF import, World Labs generation service, Godot, native or WASM Gaussian
path is implemented. Shader effects are inspired by PlayCanvas; engine shader
chunks are not interchangeable. The old synthetic renderer remains an independent
small correctness fixture.

## Guided demos

Three looping presentations use the same licensed scans on both backends:

- **Afterimage — The Room Remembers:** a slow apartment camera move, cyan
  reconstruction wave, original scan colors and a scanning pulse.
  [Open Afterimage](http://127.0.0.1:5193/console.html?path=/experiments/splat-worlds/cart.js&splatDemo=apartment&w=640&h=360).
- **Relic — Matter into Signal:** a full orbit around the scanned sculpture,
  transitioning from its original surface into dissolve and scan effects.
  [Open Relic](http://127.0.0.1:5193/console.html?path=/experiments/splat-worlds/cart.js&splatDemo=relic&w=640&h=360).
- **Threshold — Two Places, One Door:** a continuous camera move through the
  apartment portal into the gallery, followed by a cut back to the start.
  [Open Threshold](http://127.0.0.1:5193/console.html?path=/experiments/splat-worlds/cart.js&splatDemo=portal&w=640&h=360).

Press **6 / 7 / 8** to switch presentations and **9** to explore with WASD.
Append `&backend=babylon` to any link for Babylon. Guided cameras follow authored
paths (the relic orbit bypasses walking collision); interactive exploration uses
scan-derived collision. These are new presentations of the existing two scans,
not additional scanned locations. Lighting remains baked into the source scans.

Camera-loop and portal-continuity regressions:
`node --test tests/test-splat-showcases.mjs tests/test-splat-portals.mjs`.

Four additional presentations (same scans, new shared GPU effects):

- **Blueprint — Architecture in Light:** a moving horizontal section and cyan
  height contours reveal the apartment's structure (`splatDemo=blueprint`).
- **Spectrum — A Chromatic Relic:** an orbit with animated height-based spectral
  color, retaining the scan's luminance (`splatDemo=spectrum`).
- **Echo — Signals Through Matter:** a lateral portal view with traveling cyan
  and violet interference bands (`splatDemo=echo`).
- **Ember — An Artifact Reforged:** a breathing orbit and moving molten scan
  front across the relic (`splatDemo=ember`).

Use **[ / ]** to cycle all seven presentations, including the original three.
The `splatDemo` parameter accepts any of the seven names above; use the same
console URLs and optional `backend=babylon`. These effects recolor the captured
surface; they do not change its baked illumination or implement physical relighting.

With Vite running, `node scripts/splat-showcases-check.mjs` checks all seven
presentations on both backends, visible scene detail, cycle controls and return
to exploration, saving PNG previews and a report under
`retroarch/build/splat-showcases/`. Use `--base=http://127.0.0.1:PORT` to select
a different running server.

Guided motion waits at its initial pose while Babylon prepares the first splat
sort, preventing a continuously moving camera from delaying the first scan draw.

## Ten-demo collection

Three further presentations reuse the same licensed scans:

- **Nocturne — A Room After Dark** (`splatDemo=nocturne`): a wandering amber
  pool reveals room details against a cool, dark surface treatment.
- **Porcelain — The Drawn Relic** (`splatDemo=porcelain`): a full relic orbit
  with quantized ivory tones and animated world-space ink hatching.
- **Tide — Memories Underwater** (`splatDemo=tide`): a slow apartment view
  with two intersecting waves producing turquoise caustic patterns.

Bracket keys now cycle all **ten** demos. These are stylized surface effects;
Nocturne does not add physical lighting, and Tide does not simulate water.
The showcase browser check covers all ten on both Three.js and Babylon.
