# Web → RetroArch Cart Port Status

Tracking which carts from `examples/` have been ported to `retroarch/games/` for cross-platform parity testing. Each ported cart should produce visually comparable output to its web sibling when run through the parity harness.

Last updated: 2026-05-23

## Legend

- ✅ **Ported** — `.js` cart in `retroarch/games/`, smoke-tested, may also ship as `.nova`
- 🟡 **In progress** — partial port or known parity drift
- 🟢 **Easy** — pure 2D / scene API, fits the RetroArch runtime cleanly
- 🟠 **Hard** — uses TSL materials, advanced Three.js features, or large enemy/scenery counts
- 🔴 **Skip** — requires web-only APIs (WebXR, getUserMedia, Babylon, etc.). Documented, not portable.

## Ported (✅)

| Web cart                  | RA cart file                                   | Notes |
| ------------------------- | ---------------------------------------------- | ----- |
| `demoscene`               | `retroarch/games/demoscene.js`                 | 5-scene visual showcase, parity at **90.0% / 88.2% strict** |
| `dungeon-crawler-3d`      | `retroarch/games/dungeon-crawler.js`           | Existing port |
| `hello-3d`                | `retroarch/games/hello-3d.js`                  | Existing port |
| `particle-fireworks`      | `retroarch/games/particle-fireworks.js`        | Existing port |
| `space-harrier-3d`        | `retroarch/games/space-harrier-3d.js` + `.nova`| Parity port: purple sky, green checker floor, red player, yellow bullets, orange pillars |
| `camera-platformer`       | `retroarch/games/camera-platformer.js` + `.nova` | 2D side-scroller with cam2DFollow + parallax — pixel-close to web |
| `hello-world`             | `retroarch/games/hello-world.js` + `.nova`     | Trivial spinning-cube smoke port |
| `hud-demo`                | `retroarch/games/hud-demo.js` + `.nova`        | Spirit port: web uses parseCanvasUI XML; here we hand-roll bars, stars, radar with primitives. Same layout, near-identical look |
| `hello-skybox`            | `retroarch/games/nova-drift.js` + `.nova`      | 6DOF crystal hunter. Replaces createSpaceSkybox with setSkyColor; instanced asteroids; deterministic LCG so the field is reproducible |
| `tween-bounce`            | `retroarch/games/tween-bounce.js` + `.nova`    | 6 balls bouncing with `easeOutBounce`. Web `tw.tick(dt)` ⇒ runtime `updateTweens(dt)` + `getTweenValue(handle)` |
| `filter-glitch`           | `retroarch/games/filter-glitch.js` + `.nova`   | Plasma + auto-cycled CRT/VHS/Hyper-Sat/Sepia/Pixelate. Web `applyFilter(...)` ⇒ runtime `screenGlitch`/`screenChromaticAberration`/`screenGrayscale`/`screenHsv`/`screenSepia2`/`screenPixelate` |

## Cards-only RA carts (no web sibling yet)

These ship in RetroArch first; we may back-port to `examples/` later.

| RA cart file                              | Notes |
| ----------------------------------------- | ----- |
| `retroarch/games/neon-snake.js` + `.nova` | 3D-grid snake, instanced trail, bloom |
| `retroarch/games/sky-rider.js` + `.nova`  | Neon-themed shmup (similar vibe to space-harrier-3d but different palette) |
| `retroarch/games/neon-pinball.js`         | Existing |
| `retroarch/games/platformer.js`           | Existing (3D platformer, distinct from `camera-platformer`) |
| `retroarch/games/space-shooter.js`        | Existing |
| `retroarch/games/stealth-runner.js`       | Existing |
| `retroarch/games/wave-survival.js`        | Existing |

## Queued for port — easy/medium (🟢)

In rough priority order. Each is a small-to-medium cart with no web-only APIs.

- `hello-namespaced`, `test-minimal`, `test-font` — trivial smoke ports
- `startscreen-demo`, `stage-cards`, `stage-menu` — UI / overlay
- `tween-logo`, `tween-typewriter` — animation primitive demos
- `screen-demo`, `shader-showcase` — post-effect demos
- `particle-trail`, `particles-demo`, `boids-flocking`, `creative-coding`, `generative-art`, `blend-aurora` — visual demos
- `input-showcase`, `canvas-ui-showcase` — input/UI showcases
- `voxel-terrain`, `voxel-creative`, `voxel-creatures`, `vox-viewer`, `wad-demo` — voxel/world demos
- `game-of-life-3d`, `instancing-demo`, `physics-demo-3d` — sandbox/sim demos

## Queued for port — game carts (🟠)

Larger ports (~1000+ lines each). Each ships visual parity for a distinct genre.

- `super-plumber-64` (~1334 lines) — platformer
- `star-fox-nova-3d` (~1339 lines) — rail shooter
- `f-zero-nova-3d` (~1011 lines) — racing
- `wing-commander-space` — combat shmup
- `shooter-demo-3d`, `fps-demo-3d`, `space-combat-3d` — shooter variants
- `crystal-cathedral-3d`, `cyberpunk-city-3d`, `mystical-realm-3d`, `nature-explorer-3d` — explore/diorama
- `adventure-comic-3d`, `wizardry-3d`, `strider-demo-3d` — adventure

## Skipped — not portable to RetroArch (🔴)

These rely on browser-only APIs the RetroArch libretro core does not expose. Documented for completeness; intentionally **not ported**.

| Web cart           | Reason |
| ------------------ | ------ |
| `ar-hand-demo`     | WebXR / WebRTC `getUserMedia` for camera-based AR — no equivalent in libretro |
| `vr-demo`          | WebXR VR session — no XR device support in core |
| `vr-sword-combat`  | WebXR + hand tracking |
| `babylon-demo`     | Embeds Babylon.js engine — incompatible with the core's GLES path |
| `nft-art-generator`| Web crypto / network fetch dependency for IPFS |
| `nft-worlds`       | Same as above |

## Carts requiring partial-port (skip or stub)

Use a feature subset of the runtime not yet wired into the C core. Listed so future port efforts can plan around them.

| Web cart       | Missing runtime feature        | Workaround |
| -------------- | ------------------------------ | ---------- |
| `movie-clock`  | `createMovieClip` / `gotoAndStop` are UI-engine only | Port can compute frame numbers directly; visual identical |
| `audio-lab`    | Tone/synth API surface — partial | Some sfx already work; full synth lab needs API audit |
| `ui-demo`      | `nova64.ui.createPanel` etc. — partial | Use lower-level `drawPanel` + `print` |
| `tsl-showcase` | Three.js TSL materials (web-only) | Use emissive cubes/spheres as approximation |
| `pbr-showcase` | PBR material shaders | Use flat-shaded cubes |

## Workflow for adding a port

1. Read the web cart in `examples/<name>/code.js`.
2. Translate API calls:
   - `nova64.input.key('ArrowLeft')` → `btn('left')`
   - `nova64.input.keyp('Space')` → `btnp('z')`
   - `0xff8844` hex → `rgba8(0xff, 0x88, 0x44, 255)`
   - `nova64.draw.cls(c)` → global `cls(c)`
   - Skip TSL/PBR materials; use `setMeshEmissive` for glow
3. Match the camera/fog/light setup verbatim — this drives parity.
4. Smoke-test:
   ```
   build/harness ./nova64_libretro.so games/<name>.js --gles --btn b --frames 60 --capture /tmp/<name>.ppm
   python3 tests/ppm_to_png.py /tmp/<name>.ppm /tmp/<name>.png
   ```
5. Package as `.nova`:
   ```
   python3 -c "import zipfile; z=zipfile.ZipFile('retroarch/games/<name>.nova','w',zipfile.ZIP_DEFLATED); z.write('retroarch/games/<name>.js','code.js'); z.write('examples/<name>/meta.json','meta.json'); z.close()"
   ```
6. Move the entry from "Queued" to "Ported" in this file.

7. Refresh the Windows RetroArch review playlist from the current
   `retroarch/games/*.js` set:
   ```
   pnpm run retroarch:refresh:windows
   ```
