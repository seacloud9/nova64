# Gaussian splatting feasibility prototype

This is the first Three.js reference experiment for the PlayCanvas-style
Gaussian splatting proposal. It runs inside Nova64's existing console and cart
lifecycle. It does not add a public `nova64.scene.loadGaussianSplat` API and does
not establish Godot, Native Core or WASM Core support.

## Run and verify

Start Vite separately:

```sh
pnpm exec vite --host 127.0.0.1 --port 5193
```

Open `/console.html?path=/experiments/gaussian-splatting/cart.js&w=640&h=360`
on that server for the moving camera scene. Then:

```sh
pnpm test:gaussian:prototype       # Node contracts + actual browser pixels
pnpm gaussian:prototype:capture   # same checks + 48-second motion capture
```

Both commands accept `--base=http://127.0.0.1:<port>` for an existing server.
Artifacts are under `retroarch/build/gaussian-prototype/`, including source/asset
hashes, renderer identity, screenshots and a report. The capture is fixed-step,
not a real-time FPS benchmark. It uses real console/module/asset URLs without
intercepting cart or asset responses.

## Implemented

- Bounded Gaussian PLY ingestion: ASCII or binary little-endian, scalar float32
  fields, vertex-only schema. Requires position, logarithmic scale, wxyz
  quaternion, logit opacity and SH DC color. Generic point clouds are rejected.
- Normalized in-memory positions, physical standard deviations, xyzw quaternion
  and linear RGB/opacity. This layout is provisional, not a frozen delivery format.
- Rotated anisotropic covariance projected by the perspective Jacobian into a
  screen ellipse, rasterized as instanced quads with Gaussian alpha falloff.
- Global stable depth ordering across both resource objects; object position,
  rotation, scale and visibility feed that same batch.
- Opaque-mesh depth testing, linear/HDR scene integration, and cart-reset cleanup.
- Project-owned analytic torus PLY, instantiated twice with different transforms:
  2,304 total Gaussians, plus an ordinary mesh occluder.

One manager/batch per scene ensures global sorting within the prototype. Sorting,
world transforms and attribute packing run synchronously on the main thread.
The prototype is intentionally capped at 16,384 Gaussians and 16 MiB input,
with a 64 KiB header limit. These are feasibility bounds, not shipping budgets.

## Evidence

Node checks cover binary/ASCII decoding, fixture regeneration, rejection of bad
records, quaternion/covariance rotation, transformed global ordering, near-plane
culling, single-manager ownership and disposal.

Browser checks use pixels, not just object state: elongated ellipse moments and
rotation, compositing before/after reversing the camera, an opaque cube covering
Gaussian fragments, and switching carts releasing geometry exactly once.

The reported preparation timing includes CPU transforms, sort and attribute
packing. It excludes GPU drawing. Normalized input and attribute byte counts are
logical payload sizes, not peak application/GPU memory. The captured hardware
identity must accompany any timing result.

## Deliberate limitations and next milestone

This uses synthetic data, not a real captured scan. Imported higher SH properties
are explicitly reported as discarded; only DC color is rendered. PLY DC values
are provisionally treated as display-encoded color and decoded to linear RGB;
that convention needs comparison with a licensed training/export sample.

Perspective cameras only. No worker/GPU sorting, compressed formats, LOD,
streaming, picking, proxy collision, splat shadows, relighting or glass ordering.
The depth test uses splat-center depth; it does not reconstruct physical surfaces.
Normal transparent mesh interleaving is not solved. Public cart handles and
cross-host resource/reset contracts remain to be implemented.

Next: validate a small licensed real scan, settle color/SH and coordinate
conventions, then implement the worker sorter and the shared C/native/WASM and
Godot paths against this reference. Keep the synthetic pixel cases as regressions.

`synthetic.ply` is generated deterministically by `makeSyntheticPly()` in
`synthetic.js`. Its byte-for-byte generation is checked by the Node suite. It
contains no external scan data and follows this repository's license.
