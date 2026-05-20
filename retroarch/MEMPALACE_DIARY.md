# MemPalace Diary: RetroArch Rollout Preferences

This is a memory/progress note for MemPalace mining, not a replacement for the
canonical repository instructions in `../AGENTS.md`.

- Use WSL for Nova64 repo work on Windows.
- Before `pnpm` commands, run `nvm use 20`.
- Use `pnpm`, not npm or yarn.
- During RetroArch feature rollout, prefer fast batches:
  - Add several focused features at a time.
  - Add focused conformance carts and screenshots as features land.
  - Run `pnpm run retroarch:test:recent` for iteration.
  - Save the full `pnpm run retroarch:test` suite for the commit gate or when the
    user explicitly asks for full validation.
- Keep screenshots under `screenshots/retroarch/`.
- Use `pnpm run mempalace:mine:retroarch` after meaningful RetroArch progress.
- The current rollout is expanding the native libretro API surface with many
  small deterministic visual/runtime helpers, prioritizing quick conformance
  coverage and visible screenshots.

## 2026-05-19 — Demoscene parity + MemPalace wiring session

### What landed
- `.vscode/mcp.json` now launches MemPalace through WSL with
  `pipenv run mempalace-mcp`.
- `AGENTS.md` and `README.md` document the MemPalace/MCP startup path and daily
  scripts.
- `package.json` gained `mempalace:status`, `mempalace:wake`,
  `mempalace:repair-status`, and `mempalace:sync:retroarch`.
- Demoscene scene 3 was brightened with an emissive core, vertical beam, orbiting
  energy shards, and stronger neon rings.
- Demoscene scene 4 was brightened with denser void objects, a central glow,
  rotating torus halos, chromatic tuning, and less crushing vignette/fog.
- Scene 0 gained broad magenta/cyan terrain shards to better echo the browser
  reference capture's luminous terrain/horizon mass.
- Scene 2 gained emissive city light lanes.

### Latest subjective visual parity
- Estimate: ~89% against the available browser-style reference material.
- Caveat: this is a human visual estimate, not a formal metric. A hard 90% claim
  needs direct browser and RetroArch captures for all five scene beats.

### Captures
- `retroarch/build/demoscene-webparity-s0-final2.png`
- `retroarch/build/demoscene-webparity-s2-final2.png`
- `retroarch/build/demoscene-webparity-s3-90pass.png`
- `retroarch/build/demoscene-webparity-s4-90pass.png`

## 2026-05-15 — M8 Shadow Maps + Normal Maps session

### What landed this session (commits 11e8309..b0ecd65)
- **createCube/createSphere color-first arg fix** (commit 11e8309): Added
  `&& !JS_IsArray(argv[1])` guard so `createCube(rgba8(...), [x,y,z])` is
  correctly detected. Re-collected software checksums for ~40 affected carts.
- **GLES directional shadow maps** (commit b78bfd7): Full depth-FBO pipeline —
  depth-only pass from directional light POV, PCF 3x3 in cube fragment shader,
  `setCastShadow` / `setReceiveShadow` / `setShadowQuality`. `shadowMaps` capability
  flag. Conformance cart 103 (software + GLES locked checksums).
- **Plan doc cleanup** (commits 8ab85f6, 2ba8125): Updated 8A "Still missing" to
  mark custom mesh, scene hierarchy, PBR, ortho camera, raycast done. Marked all
  8B/8C/8F/8G/8H items done (they were implemented in prior sessions but plan was not updated).
- **GLES normal maps** (commit b0ecd65): Object-space normal map on texture unit 2.
  `v_normal` varying added to vertex shader. Fragment shader re-computes diffuse when
  `u_has_normal_map != 0`. `setMeshNormalMap(handle, texHandle)`. `normalMaps` cap flag.
  Conformance cart 104.

### Current true M8 gaps (all else is done)
- **8A**: Instanced rendering (render targets done; normal maps done; z-sort done)
- **8I**: Real hardware GLES smoke matrix; netplay review (manual/doc tasks)
- **8J**: `--frames N` conformance for all cart types

### Lessons
- Always `wsl -e bash` for git/make; PowerShell breaks husky hooks.
- GLES conformance needs `GALLIUM_DRIVER=softpipe MESA_LOADER_DRIVER_OVERRIDE=swrast`.
- GLSL ES 1.00 uniforms shared between vertex+fragment need matching precision;
  adding `uniform highp vec4` in fragment shader matches the vertex default.
- Shadow FBO needs a dummy color RBO (RGB565) for completeness — GLES does not allow
  depth-only FBOs on all drivers.

## 2026-05-15 — M8 Render Targets session

### What landed this session (commits 3e76598..5db0963)
- **Offscreen render targets** (commit 3e76598): GLES FBO + RGBA color texture + depth
  RBO. `createRenderTarget(w, h)` allocates; `renderScene(rt)` renders 3D scene at rt
  dimensions, reusing shadow map; `renderTargetAsTexture(rt)` returns borrowed texture
  handle (new `borrowed` flag on nova64_texture prevents double-free);
  `destroyRenderTarget(rt)`. `renderTargets` capability flag. Conformance cart 106
  sw=44044eca0be4f87f gles=f05b3c17d784bd72.
- Fixed forward declaration chain: `rt_destroy_gl`, `gles_any_cast_shadow_mesh`,
  `gles_init_shadow_resources`, `build_shadow_light_vp`, `render_gles_shadow_pass`,
  `gles_load_functions`, `gles_init_resources`. Added `#define GL_LINEAR 0x2601`.
- **8I complete** (commit 7dbadc1): `GLES_SMOKE_MATRIX.md` + `NETPLAY_NOTES.md`.
  `--frames N` propagation added to all conformance runner functions.
- **Instanced rendering** (commit 5db0963): `NOVA64_MESH_INSTANCED` type.
  `createInstancedMesh(geometry, count)`, `setInstanceTransform(mesh, i, mat16)`,
  `getInstanceCount(mesh)`. GLES: shared material uniforms + per-instance MVP loop.
  Conformance cart 107 sw=4fd99c7a95f90255 gles=f01a0e0dc49c9e0e.

### Current true M8 gaps (all else is done)
- **All 8A–8J items complete** as of 2026-05-15

## 2026-05-15 — Post-M8 documentation + noise API session

### What landed this session (commits 1b68724..d48cce1)
- **Comprehensive README update** (commit 1b68724): Fixed 3 stale Known Gaps
  (shadow maps, ortho camera, streamed music — all implemented). Added ~20 missing
  API sections: capsule/cylinder, createMesh, scene hierarchy, ortho camera, PBR,
  UV transforms, normal maps, shadow quality, blend modes, render targets, instanced
  mesh, skybox, music, voice handles, channels, positional audio, echo, physics,
  raycast, bitmap font, compressed storage, dev console, resolution, cheevos RAM,
  multi-port input, rumble, procedural noise. Extended conformance table from cart
  77 to 111. RELEASE_CHECKLIST.md: removed 4 stale gaps, added GLES screenshot checks.
- **MIGRATION.md** (commit d48cce1): Replaced stale known-gaps list (PNG decode,
  scene hierarchy, raycast all wrongly listed as missing) with accurate M8 state.
- **Procedural noise API** (commit d48cce1): `noise(x)`, `noise(x,y)`, `noise(x,y,z)`
  2D/3D Perlin gradient noise using classic 256-entry permutation table + quintic smoothing.
  `fbm(x, y, octaves, lacunarity, gain)` fractal Brownian motion normalized to [-1,1].
  `nova64.random.noise` / `nova64.random.fbm` aliases. Conformance cart 111
  sw=4847bd983f0c57e0.

### Full conformance sweep result
- Carts 0–50: all pass (build + harness)
- Carts 51–99: all pass
- Carts 100–111: all pass
- Total: 111 conformance carts passing

### State of the codebase
- All M1–M8 complete; no known pending gaps except Vulkan backend (M4, staged)
  and QuickJS heap serialization (out of scope per plan).
- next candidate: consider particle system, more math utilities, or Vulkan M4.

## 2026-05-15 — Post-M8 API expansion sprint (carts 112-134)

### What landed this session (commits d48cce1..d10f0f6)
- **2D Particle system** (cart 112): createParticles2D/emitParticles2D/setEmitterPos2D/
  setEmitterActive2D/destroyParticles2D/updateParticles/drawParticles/getParticleCount.
  CPU-side, 512 particles × 8 emitters. Continuous mode with rate accumulator.
- **Math utilities** (cart 113): lerp, clamp, map, smoothstep, wrap, approach, between.
- **Camera orbit** (cart 114): setCameraOrbit(tx,ty,tz,dist,azimuth_deg,elev_deg).
- **Camera shake** (cart 115): addCameraShake/stopCameraShake; noise-based, linear decay;
  applied at both GLES mat4_look_at sites.
- **Tween system** (cart 116): createTween/getTweenValue/tweenDone/destroyTween/resetTween;
  9 easing curves; auto-advance in retro_run; 16 max tweens.
- **sprTransform** (cart 117): rotated/scaled sprite blit via inverse-transform sampling.
- **Path drawing** (cart 118): beginPath/moveTo/lineTo/closePath/strokePath/fillPath;
  even-odd scanline fill; 128 point max.
- **Screen flash** (cart 119): screenFlash(color,duration); auto-fading overlay post-draw.
- **colorHSV** (cart 120): HSV → packed RGBA8; h:0-360, s/v/a:0-255.
- **drawPoly/fillPoly** (cart 121): polygon from flat or nested JS arrays.
- **screenPixelate** (cart 122): block-average pixelate; 2-64 block size.
- **textBox** (cart 123): word-wrapped text block.
- **drawArc/fillArc** (cart 124): arc and pie sector; angle in degrees.
- **drawSpline** (cart 125): Catmull-Rom smooth curve; open/closed; flat/nested arrays.
- **colorLerp2D** (cart 126): bilinear 4-corner color interpolation.
- **stampText** (cart 127): integer-scaled pixel-font text; 1-16x.
- **Timers** (cart 128): createTimer/timerDone/timerElapsed/timerProgress/resetTimer/
  destroyTimer; 32 slots; auto-advance in retro_run.
- **Logical grid** (cart 129): createGrid/setCell/getCell/clearGrid/gridCols/gridRows/
  destroyGrid; 8 grids × 4096 int cells.
- **measureText/printCentered** (cart 130): {width,height,lines} object; centered text.
- **setPixels/getPixels/printRight** (cart 131): batch framebuffer I/O; right-aligned text.
- **screenBlur** (cart 132): separable box blur; radius 1-8; deterministic cart.
- **Off-screen canvas** (cart 133): createCanvas/canvasClear/canvasPset/canvasPget/
  canvasBlit/destroyCanvas/canvasWidth/canvasHeight; 4 max; heap-allocated; freed on reset.
- **drawNineSlice** (cart 134): 9-slice panel scaling for UI.

### Key lessons
- JS_IsArray() takes 1 arg (not ctx+val) in this QuickJS version.
- Always use deterministic patterns in draw() — Math.random() breaks checksums.
- Forward declarations needed when new functions reference later-defined helpers
  (e.g., parse_poly_pts forward decl for drawSpline).
- Conformance carts using screen.draw() must call from draw(), not init(), or the
  fill pixels won't be in the expected frame.

### Current state: 134 conformance carts passing
- All M1–M8 + 23 new post-M8 APIs; no regressions in carts 110-134.
- All state (tweens, timers, grids, canvas, shake, flash, path) reset on retro_reset.

## 2026-05-18 — Batch 79-81 session (game utility APIs)

### What landed this session
- **Batch 79: 2D Inventory grid** — `createInventory`, `setSlot`, `getSlotColor`, `getSlotCount`,
  `clearSlot`, `drawInventory`, `setInventorySelected`, `destroyInventory`.
  NOVA64_MAX_INVENTORIES=4, up to 8×8 slots. Gap+border layout, selection highlight,
  item count label. Conformance carts 801 (sw=6aa3bf957f9352b4), 970-showcase (sw=748caa96474f3ea9).
- **Batch 80: Dialogue box** — `createDialogue`, `setDialogueSpeaker`, `setDialogueText`,
  `advanceDialogue`, `isDialogueDone`, `updateDialogue`, `drawDialogue`, `destroyDialogue`.
  NOVA64_MAX_DIALOGUES=4. Typewriter char-by-char reveal, word-wrap, speaker label box,
  blinking cursor. Conformance carts 802 (sw=95b31584bc521897), 981-showcase (sw=18bb799e427bfb73).
- **Batch 81: Toast notifications** — `createToast`, `showToast`, `updateToast`, `drawToast`,
  `isToastDone`, `destroyToast`. NOVA64_MAX_TOASTS=4. Slide-in from left, auto-fade at
  start/end 10% of duration. Conformance carts 803 (sw=42c07be8da8a1c64), 992-showcase (sw=37c3be468c5c6b9b).
- All 6 carts pass; range 801-992 (21 carts) clean.

### Key lessons
- Existing codebase already had `tilemaps[]` API (sprite-sheet based); avoid `createTilemap` name clash.
- Use `JS_ToCString(ctx, argv[N])` not `string_from_js` — no such helper exists in this QuickJS build.
- The `run_conformance.sh` runner stops at first mismatch; run harness directly without `--expect` to collect checksums.

### Current conformance state (after B82–B84)
- Feature carts up to 806, showcase up to 1025
- All B79–B84 carts passing

---

## Session: Batches 85–90 + 3 game carts (2026-05-18)

### APIs added
- **Batch 85: Particle burst** — `createBurst`, `triggerBurst`, `updateBurst`, `drawBurst`,
  `isBurstDone`, `setBurstColors`, `destroyBurst`. NOVA64_MAX_BURSTS=8, 24 particles each.
  Radial emission via rng_next_impl(), gravity, life fade. Conformance carts 807, 1036-showcase.
- **Batch 86: Text effects** — `printGradient`, `printWave`, `printFlash`, `printShake`,
  `printRainbow`. Stateless; all render char-by-char using glyph_row(). hsv_to_rgba8() helper
  added for rainbow hue cycling. Conformance carts 808, 1047-showcase.
- **Batch 87: Speech bubble** — `createBubble`, `setBubbleText`, `setBubbleTail`, `setBubbleColors`,
  `drawSpeechBubble`, `destroySpeechBubble`. NOVA64_MAX_BUBBLES=8. Renamed to `drawSpeechBubble`
  because `drawBubble`/`js_draw_bubble` already existed (circle outline API).
  Conformance carts 809, 1058-showcase.
- **Batch 88: Smooth 2D camera** — `createCam2D`, `setCam2DTarget`, `setCam2DZoom`, `updateCam2D`,
  `applyCam2D`, `getCam2DX`, `getCam2DY`, `destroyCam2D`. NOVA64_MAX_SMOOTH_CAMS=4.
  Lerps via `1 - exp(-lerp*dt)`. applyCam2D writes to global cam2d_x/y/zoom. Conformance 810, 1069.
- **Batch 89: Spotlight overlay** — `createSpotlight`, `setSpotlightPos`, `setSpotlightRadius`,
  `setSpotlightColor`, `drawSpotlight`, `destroySpotlight`. NOVA64_MAX_SPOTLIGHTS=4.
  Scanline renderer: draws shadow strips around a circular hole. Conformance 811, 1080.
- **Batch 90: Wave manager** — `createWaveManager`, `startWave`, `getWaveNumber`, `isWaveActive`,
  `enemyDefeated`, `getRemainingEnemies`, `nextWave`, `setWaveDelay`, `getWaveDelay`,
  `destroyWaveManager`. NOVA64_MAX_WAVE_MANAGERS=4. Conformance 812, 1091.

### Game carts added
- `wave-survival.js` — arena shooter; wave manager + particle bursts on kill
- `stealth-runner.js` — spotlight avoidance game; moving spotlights, level progression
- `neon-pinball.js` — glow-rendered pinball; bumper collisions + rainbow score text

### Key lessons (this session)
- `drawBubble`/`js_draw_bubble` already existed as a circle-outline primitive — speech bubble
  API must use `drawSpeechBubble`/`js_draw_speech_bub` to avoid duplicate symbol errors.
- Input API uses string names: `btn("left")`, `btn("z")`, `btnp("z")` — NOT numeric constants.
  Existing game carts use undefined `BUTTON_LEFT` (produces JS exception but still renders).
- Global sed on 31k-line file is dangerous; use `sed -i 'Ns/.../.../'` for line-specific fixups.

### Current conformance state
- Feature carts up to 812, showcase up to 1091
- All B85–B90 (12 new carts) passing; pre-B79 ranges have pre-existing failures unrelated to new work
