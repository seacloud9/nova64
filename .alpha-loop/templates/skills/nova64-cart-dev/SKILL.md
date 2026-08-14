---
name: nova64-cart-dev
description: Nova64 cart development guide. Use this skill whenever creating, editing, improving, or debugging any Nova64 cart — any file under examples/ or questions about the Nova64 API. Covers the critical dual-directory sync rule (examples/ must always mirror dist/), the cart lifecycle (init/update/draw), 3D vs 2D clearing, state machines, input, audio, persistent storage, and common pitfalls. Autoloop agents must load this skill before touching any cart.
---

# Nova64 Cart Development

## CRITICAL: Dual-Directory Sync Rule

Every cart change requires updates to **both** directories simultaneously:

```bash
# After editing examples/<cart>/code.js:
cp examples/<cart>/code.js dist/examples/<cart>/code.js

# Verify
diff examples/<cart>/code.js dist/examples/<cart>/code.js
```

`examples/` is the edit source. `dist/` is what the browser console loads. If they diverge, the cart runs stale code. There is no build step that does this automatically — you must copy manually every time.

## Cart Lifecycle

```js
export function init() {
  // Runs once on cart load.
  // Create 3D meshes, set lighting, skybox, post-processing, load save data.
  // Never skip — always call destroyMesh() on old handles before recreating.
}

export function update(dt) {
  // Runs every frame. dt = seconds since last frame (~0.016 at 60 fps).
  // All game logic, input, physics, timers, animations go here.
}

export function draw() {
  // Runs every frame AFTER 3D renders automatically.
  // Use ONLY for 2D HUD overlay work.
  // Do NOT create 3D meshes here — it leaks one mesh per frame.
}
```

## Clearing the Canvas in draw()

| Cart type    | Correct call                       | Why                                  |
| ------------ | ---------------------------------- | ------------------------------------ |
| 3D cart      | `cls3D()` or `cls(rgba8(0,0,0,0))` | Opaque clear blocks ALL 3D rendering |
| 2D-only cart | `cls(0x000000)`                    | Fills canvas solid black             |

`cls(0x000000)` is opaque and will make 3D invisible. Always use `cls3D()` in 3D carts.

## Standard State Machine

```js
let state = 'start'; // 'start' | 'playing' | 'wave_clear' | 'game_over'

export function update(dt) {
  if (state !== 'playing') {
    if (btnp(BUTTON_Z) || btnp(BUTTON_X)) init();
    return; // skip game logic
  }
  // ... game logic ...
}
```

## Input Constants

```js
// Buttons
BUTTON_Z, BUTTON_X     // primary action buttons (Z=A, X=B on gamepad)
BUTTON_UP, BUTTON_DOWN, BUTTON_LEFT, BUTTON_RIGHT

btn(BUTTON_Z)          // held this frame
btnp(BUTTON_Z)         // just-pressed (one frame only)

// Keyboard
key('KeyW')            // held
keyp('Space')          // just-pressed
```

## Persistent Storage

```js
export function init() {
  best = loadData('xx_best', 0);  // 'xx_' = unique prefix per cart
}

// Save when score improves:
if (score > best) { best = score; saveData('xx_best', best); }
```

## Audio — Named SFX Presets

```js
sfx('coin')       // collect item
sfx('jump')       // player jump
sfx('land')       // landing after fall
sfx('hit')        // damage taken
sfx('death')      // game over / life lost
sfx('blip')       // bumper / wall bounce / UI beep
sfx('select')     // menu confirm / level clear / power-up
sfx('powerup')    // power-up spawned/collected
sfx('explosion')  // boss or ship destroyed
sfx('laser')      // bullet fired
```

## Key 3D API

```js
// Primitives — all return a mesh handle
createCube(size, color, [x, y, z])          // uniform
createCube(w, h, d, color, [x, y, z])       // non-uniform box
createSphere(radius, color, [x, y, z])
createTorus(radius, tube, color, [x, y, z])
createCylinder(rt, rb, h, color, [x, y, z])
createCone(radius, h, color, [x, y, z])
createCapsule(radius, h, color, [x, y, z])

// Transforms
setPosition(mesh, x, y, z)
setRotation(mesh, rx, ry, rz)   // radians
setScale(mesh, sx, sy, sz)
rotateMesh(mesh, rx, ry, rz)    // adds to current rotation
destroyMesh(mesh)
setMeshVisible(mesh, bool)
setMeshEmissive(mesh, color, intensity)  // e.g. intensity 1.0–3.0 for neon glow
setMeshColor(mesh, color)
```

## Camera

```js
// Two-array form (idiomatic in update()):
setCamera([camX, camY, camZ], [targetX, targetY, targetZ])

// Separate calls (fine too):
setCameraPosition(x, y, z)
setCameraTarget(x, y, z)
setCameraFOV(degrees)   // default 75
```

## Post-Processing

`nova64.post` is a convenience shim (added 2026-07) that delegates to `nova64.fx`. Both work:

```js
// Preferred short form (nova64.post shim):
nova64.post.setBloom(strength)              // 1.5–2.5 for neon; 0.6 = default
nova64.post.setBloom(strength, radius, threshold)  // lower threshold = saturated colors glow
nova64.post.setChromatic(intensity)         // 0.001–0.008
nova64.post.setVignette(darkness, offset)   // e.g. 0.5, 0.5
nova64.post.setGlitch(intensity)
nova64.post.disable()                       // turn off all post-processing

// Canonical long form (nova64.fx — same capability, explicit names):
const { enableBloom, enableChromaticAberration, enableVignette } = nova64.fx;
enableBloom(2.2);
enableChromaticAberration(0.003);
enableVignette(0.15, 0.82);
```

For saturated neon that doesn't glow at default threshold: `nova64.post.setBloom(2.1, 0.85, 0.18)`.

## HUD Draw Functions (in draw())

```js
// Glow variants — size = blur radius
glowRect(x, y, x2, y2, color, size)
glowCircle(x, y, r, color, size)
glowLine(x0, y0, x1, y1, color, size)

// Print variants
print(text, x, y, color)
printBold(text, x, y, color)
printTight(text, x, y, color)
printCentered(text, y, color)              // centers on screen width
printCentered(text, cx, y, color)          // centers on explicit cx
printFlash(x, y, text, color, phase, speed)
printOutlineTight(text, x, y, fg, outline)

// Progress / health bars
drawProgressBar(x, y, w, h, t, fgColor, bgColor, borderColor)
drawHealthBar(x, y, w, h, current, max, opts)

// Pixel / lines
hline(x, y, len, color)
vline(x, y, len, color)
pset(x, y, color)

// Project a 3D world point to 2D screen coords:
const {x, y} = project3DToScreen(wx, wy, wz)
```

## Common Gotchas

- **Never `cls(0x000000)` in a 3D cart** — use `cls3D()` or the canvas goes black.
- **Always sync dist/** — missing copy = stale cart.
- **Create meshes in `init()`, not `update()` or `draw()`** — creating in loops leaks memory.
- **Destroy old meshes before reinit** — call `destroyMesh(handle)` before `init()` recreates the scene.
- **`setCamera` vs `setCameraPosition`** — both work; `setCamera([pos],[target])` is one call.
- **`btnp` not `btn` for single-action triggers** — `btn` fires every frame; `btnp` fires once per press.
- **No bare globals — always destructure from `nova64.*` namespaces.** Cart modules are ES modules loaded via dynamic `import()`. The ONLY thing on `globalThis` is `nova64`. Calling `clearSkybox()`, `createSpaceSkybox()`, or any other function as a bare name throws `ReferenceError`. Always destructure: `const { clearSkybox, createSpaceSkybox, enableSkyboxAutoAnimate } = nova64.light;`
- **`nova64.post` shim covers the common post-processing API** — `setBloom`, `setChromatic`, `setVignette`, `setGlitch`, `disable`. If you need a function not in the shim, use `nova64.fx.*` directly. Calling `nova64.post.xyz` where xyz is not in the shim returns `undefined` — don't call `undefined` as a function.
- **When `init()` throws, `update()` still runs.** The cart runner catches `init()` errors and keeps calling `update()`/`draw()`. This causes "mesh with id undefined" floods when init never created the meshes. **Always look for the `❌ Cart init() threw:` line FIRST** in the browser console — it reveals the real crash upstream.
- **`rgba8()` returns a JavaScript BigInt, not a Number.** This is fine inside cart code, but be aware: (1) BigInt colors passed directly to `printCentered` 4-arg form will crash (`Cannot mix BigInt and other types`) — use the 3-arg form `printCentered(text, y, color)` for centered text; (2) BigInt colors passed to 3D mesh create functions (`createSphere`, `createCube`, etc.) are safe — the runtime normalizes them at the material boundary. If you see `JSON.stringify BigInt` or `mesh id undefined` errors, a BigInt color has leaked past the normalization boundary — file a runtime bug.

Read `references/api-extras.md` for instancing, 2D particle emitters, and the wave system.
