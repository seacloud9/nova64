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
