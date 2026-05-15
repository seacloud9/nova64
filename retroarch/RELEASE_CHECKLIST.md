# Nova64 RetroArch Core — Release Checklist

Run this checklist before tagging a release. Each step can be performed by
someone who did not implement the core. All commands assume WSL on Windows;
adapt paths for Linux/macOS natively.

Core status: Milestones 1–8 complete. 110 conformance carts passing.

## 1. Build

```bash
cd /mnt/c/Users/brend/exp/nova64
make -C retroarch clean all
```

Expected: `retroarch/nova64_libretro.so` is built with no errors or warnings
that are not already documented.

Optional debug build:

```bash
make -C retroarch DEBUG=1
```

Alternatively use the Makefile shorthand from the `retroarch/` directory:

```bash
cd retroarch && make        # build .so
make harness                # build the headless test harness
make conformance            # build + run full conformance suite
make release                # produce nova64_libretro-<ver>.tar.gz
```

## 2. Conformance Suite

```bash
bash retroarch/tests/run_conformance.sh
```

Expected final line: `Conformance passed.`

All numbered conformance carts must pass. If any fail:

- A checksum mismatch prints `expected=<hex> actual=<hex>` to stderr.
- A command-log mismatch prints `command log mismatch: expected=<sha> actual=<sha>`.
- Inspect the corresponding `retroarch/build/<name>.commands` file or the PPM
  capture in `screenshots/retroarch/` to diagnose the regression.
- Re-run a single case manually:
  ```bash
  retroarch/build/harness retroarch/nova64_libretro.so retroarch/conformance/06-cube.js \
    --expect 53584f0993f3ff6a --capture /tmp/06-cube.ppm
  ```

## 3. Screenshots

After the suite passes, inspect the visual captures in `screenshots/retroarch/`.
Check that the following render correctly (no blank/all-black frames):

- `06-cube.png` — blue cube, lit, on grey background
- `09-overlay-scene.png` — cube with 2D HUD overlay
- `10-lighting.png` — lit scene with directional light
- `17-light-fog.png` — fog gradient visible
- `20-post.png` — CRT/vignette effect visible
- `26-draw2d.png` — circles and aligned text
- `30-showcase.png` — 3D scene with HUD, score, indicator dot
- `103-shadow-map.png` — shadow cast on ground plane (GLES)
- `106-render-target.png` — scene rendered into texture (GLES)
- `107-instanced-mesh.png` — ring of instanced cubes (GLES)
- `108-skybox.png` — equirectangular panorama background (GLES)

## 4. Manual RetroArch Smoke Test

Load the following content in RetroArch with the nova64_libretro core and an
OpenGL or OpenGL ES video driver:

- [ ] `retroarch/conformance/00-boot.js` — loads and exits cleanly
- [ ] `retroarch/conformance/06-cube.js` — blue cube renders, rotates
- [ ] `retroarch/conformance/09-overlay-scene.js` — 3D cube plus 2D text HUD
- [ ] `retroarch/conformance/30-showcase.js` — full demo:
  - Camera orbits the scene
  - Pressing Space increments score and toggles CRT effect
  - Mouse movement shifts the cube
  - Frame counter increments in top-right HUD
  - Score persists after core reset (saved to storage)

For each test, verify:
- No black screen after the first few frames
- Audio (if applicable) plays without glitches
- No RetroArch crash or error toast

## 5. Save Directory

Verify persistent storage works with the RetroArch save directory:

```bash
NOVA64_SAVE_DIR=/tmp/nova64-saves bash retroarch/tests/run_conformance.sh
ls /tmp/nova64-saves/nova64/
```

Expected: `11-storage.js` and `24-storage-keys.js` related `.json` files present.

## 6. Core Info File

Copy `retroarch/nova64_libretro.info` alongside `nova64_libretro.so` in the
RetroArch cores directory and confirm the core browser shows:

- Display name: **Nova64**
- Supported extensions: `js`, `nova`
- Version: matches the release tag

## 7. Known Gaps (Compatibility Notes)

The following are tracked gaps, not bugs. Confirm they are still documented in
`README_RETROARCH.md` under "Known Gaps And Unsupported APIs":

- [ ] QuickJS heap is not serialized in save states (rollback covers only host state)
- [ ] Vulkan backend staged but not functional (selects GLES fallback)
- [ ] Texture sampling in software/headless mode is no-op (GL path only)
- [ ] Skybox and render targets require GLES 3.1 context (`caps.skybox`/`caps.renderTargets` false in software mode)

## 8. Version Bump

Update `display_version` in `retroarch/nova64_libretro.info` to the release tag.

## 9. Tag And Archive

```bash
git tag v0.x.0
git archive --format=tar.gz --prefix=nova64-retroarch-v0.x.0/ HEAD \
  retroarch/nova64_libretro.so \
  retroarch/nova64_libretro.info \
  retroarch/README_RETROARCH.md \
  retroarch/RELEASE_CHECKLIST.md \
  > nova64-retroarch-v0.x.0.tar.gz
```

Attach the archive and `nova64_libretro.so` to the release.
