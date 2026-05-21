# Nova64 GLES Smoke Matrix

Manual test log for real-hardware/real-driver validation of the Nova64 libretro core.
Automated headless conformance runs (Mesa softpipe via `run_conformance.sh`) cover
render correctness. This file documents driver-level smoke tests that require a real
RetroArch installation or a real OpenGL ES driver stack.

## Test procedure

1. Build the core: `make -C retroarch all`
2. Copy `retroarch/nova64_libretro.so` to your RetroArch cores directory.
3. Open RetroArch → Load Core → nova64_libretro.
4. Load any `.js` or `.nova` content (e.g. `retroarch/conformance/06-cube.js`).
5. Note: which video driver is active under Settings → Driver → Video Driver.
6. Verify the cart renders without errors, GLES 3D is visible, and there are no
   GPU driver crashes or black screens.

## Platform matrix

| Platform       | Video driver | GLES version | Status  | Notes                                       |
| -------------- | ------------ | ------------ | ------- | ------------------------------------------- |
| Linux x86-64   | glcore       | GLES 3.1     | ✅ pass | Tested via Mesa EGL headless (automated)    |
| Linux x86-64   | gl           | GL 3.3       | 🔲 todo | Context type mismatch — needs field check   |
| Linux x86-64   | vulkan       | n/a          | 🔲 todo | Vulkan renderer not yet implemented         |
| Windows WSL2   | glcore (EGL) | GLES 3.1     | ✅ pass | Mesa softpipe via WSL; all conformance pass |
| Android        | glcore       | GLES 3.1     | 🔲 todo | Needs arm64 build + RetroArch Android APK   |
| Android        | vulkan       | n/a          | 🔲 todo | Not yet implemented                         |
| Raspberry Pi 4 | glcore       | GLES 3.1     | 🔲 todo | VideoCore VI; needs field check             |

## Known issues / gaps

- **Vulkan renderer**: Not implemented. Core requests GLES via
  `RETRO_ENVIRONMENT_SET_HW_RENDER`; RetroArch falls back to software if no
  GLES context is available. Software 2D output works on all drivers.
- **GL (desktop) driver**: RetroArch's `gl` driver does not expose GLES proc
  addresses the same way `glcore` does. Core may fall back to software.
- **Shadow FBO on older GLES**: `GL_DEPTH_COMPONENT16` + dummy RGB565 RBO
  matches what older Mali/Adreno drivers require for depth-only FBO completeness.
  Tested on Mesa softpipe; real Adreno/Mali coverage still needed.
- **Post-processing FBO**: Core targets GLES 3.1. The post target now attempts
  `RGBA16F` for HDR bloom and falls back to `RGBA8` if the framebuffer is
  incomplete. Real mobile/embedded drivers should verify this fallback path.

## How to update this file

When you smoke-test on a new platform, add a row to the matrix above with:

- Platform + GPU/driver version
- Video driver selected in RetroArch
- GLES version reported (check RetroArch log)
- Pass/fail + one-line note on what was tested

Automated conformance checksums live in `tests/run_conformance.sh` and are
the ground truth for pixel-exact regression testing. This file is for
real-driver integration notes only.

## 2026-05-20 note

- GLES sphere smoke coverage was refreshed after replacing the old octahedron
  sphere proxy with a generated 12x16 UV sphere. Headless Mesa capture:
  `retroarch/build/sphere-uv-gles.png`.
- Affected GLES conformance locks were updated for sphere-based carts.
- GLES cone smoke coverage was added for the new real cone primitive:
  `retroarch/build/gles-cone-primitive.png`. `space-shooter.js` also captures
  the pointed player ship at `retroarch/build/space-shooter-cone-gles.png`.
- GLES capsule/cylinder smoke coverage was added for the new generated geometry
  paths:
  - `retroarch/build/gles-capsule-primitive.png`
  - `retroarch/build/gles-cylinder-primitive.png`
  - `retroarch/build/dungeon-crawler-cylinder-gles.png`
- GLES transparent z-sort smoke coverage was added after moving blended/alpha
  meshes to a back-to-front pass with depth writes disabled:
  - `retroarch/build/gles-transparent-z-sort.png`
  - `retroarch/build/demoscene-zsort-smoke.png`

## 2026-05-21 note

- HDR/multi-mip bloom was validated under Mesa llvmpipe through the GLES harness.
  The post log reported `format=RGBA16F` and `bloom_mips=5`.
- Windows cross-build passed, but real Windows/AMD RetroArch smoke should verify
  that the `RGBA16F` path is accepted and that the `RGBA8` fallback behaves
  cleanly if a driver rejects float color attachments.
