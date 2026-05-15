# Nova64 RetroArch — Cart Migration Guide

Step-by-step guide for porting a browser or Godot Nova64 cart to a `.nova`
package that runs in the native RetroArch core.

---

## Overview

The native core runs the same JavaScript API as the browser and Godot runtimes,
but without browser globals (`window`, `document`, `THREE`, `BABYLON`). Any cart
that uses only the Nova64 API surface should port with minimal changes.

---

## Step 1 — Audit your cart for browser-only globals

Search for these and replace with Nova64 equivalents:

| Browser / Godot shim | Nova64 equivalent |
|---|---|
| `window.innerWidth` / `canvas.width` | `screenWidth()` |
| `window.innerHeight` / `canvas.height` | `screenHeight()` |
| `requestAnimationFrame` | handled by the runtime loop — remove it |
| `setTimeout` / `setInterval` | use `nova64.frame()` or `nova64.time()` to count frames |
| `THREE.*` | `createCube/Sphere/Plane`, `setPosition`, etc. |
| `BABYLON.*` | same as THREE |
| `localStorage` | `saveJSON(key, val)` / `loadJSON(key, default)` |
| `fetch()` / `XMLHttpRequest` | not available; bundle data as package assets |
| `Audio` / `AudioContext` | `playSound(path)` / `sfx(freq, dur)` |
| `console.log` | `print(text, x, y, color)` for on-screen; harness prints to stderr |
| `import` from npm / CDN | bundle as ES modules inside the `.nova` package |

---

## Step 2 — Convert to ES module format

The runtime expects ES module exports:

```js
export function init()   { /* called once on load */ }
export function update(dt) { /* called every frame, dt in seconds */ }
export function draw()   { /* called every frame after update */ }
```

Remove any IIFE wrappers, script loaders, or framework bootstrap code.

---

## Step 3 — Bundle as a `.nova` package

A `.nova` file is a ZIP archive with a `manifest.json` at the root:

```json
{
  "name": "my-cart",
  "title": "My Cart",
  "author": "Your Name",
  "version": "1.0.0",
  "main": "src/main.js",
  "assets": [
    "sprites/player.rgba",
    "sounds/jump.pcm",
    "data/levels.json"
  ]
}
```

Rules:
- `main` — path inside the ZIP to the entry-point JS file (default: `code.js`)
- `assets` — listed files are staged in memory and available via `readAssetText`,
  `readAssetJSON`, `readAssetBytes`, `spr`, `playSound`, `createTexture`, etc.
- Asset paths are relative to the ZIP root.
- Helper modules imported with `import './lib/foo.js'` must appear in `assets`.

Build the package (Python):

```python
from zipfile import ZipFile, ZIP_DEFLATED
with ZipFile("my-cart.nova", "w", ZIP_DEFLATED) as z:
    z.write("src/main.js",        "src/main.js")
    z.write("sprites/player.rgba","sprites/player.rgba")
    z.writestr("manifest.json", open("manifest.json").read())
```

---

## Step 4 — Replace asset formats

| Browser format | Native format |
|---|---|
| PNG (any) | Raw RGBA: `width × height × 4` bytes, top-left, no header |
| OGG / MP3 | `.ogg` (decoded by stb_vorbis) or raw int16 LE mono 44100Hz `.pcm` |
| WAV | Standard PCM WAV is auto-detected and resampled |
| JSON data files | Keep as `.json` — `readAssetJSON(path)` returns a parsed object |
| Binary blobs | Keep as-is — `readAssetBytes(path)` returns a `Uint8Array` |

Convert PNG sprites with ImageMagick:

```bash
convert sprite.png -depth 8 RGBA:sprite.rgba
```

---

## Step 5 — Replace 3D scene code

| Browser / Three.js call | Nova64 equivalent |
|---|---|
| `new THREE.BoxGeometry` | `createCube(size, color, [x,y,z])` |
| `new THREE.SphereGeometry` | `createSphere(radius, color, [x,y,z])` |
| `new THREE.PlaneGeometry` | `createPlane(width, depth, color)` |
| `mesh.position.set(x,y,z)` | `setPosition(handle, x, y, z)` |
| `mesh.rotation.set(x,y,z)` | `setRotation(handle, x, y, z)` |
| `mesh.scale.set(x,y,z)` | `setScale(handle, x, y, z)` |
| `mesh.material.color.set` | `setMeshColor(handle, color)` |
| `mesh.material.opacity` | `setMeshAlpha(handle, alpha)` |
| `mesh.material.emissive` | `setMeshEmissive(handle, color, intensity)` |
| `scene.remove(mesh)` | `removeMesh(handle)` |
| `camera.position.set` | `setCameraPosition(x, y, z)` |
| `camera.lookAt` | `setCameraTarget(x, y, z)` |
| `scene.fog = new THREE.Fog` | `setFog(color, near, far)` / `enableFog(true)` |

---

## Step 6 — Replace 2D / HUD draw calls

| Browser canvas call | Nova64 equivalent |
|---|---|
| `ctx.fillRect` | `rectfill(x, y, w, h, color)` |
| `ctx.strokeRect` | `rect(x, y, w, h, color)` |
| `ctx.fillText` | `print(text, x, y, color [, align])` |
| `ctx.drawImage` (sprite) | `spr(path, dx, dy [, imgW, imgH [, sx, sy [, bw, bh]]])` |
| `ctx.clearRect` | `cls(color)` |
| `ctx.fillStyle = gradient` | `clsGradient(topColor, bottomColor)` |
| `ctx.arc` (circle) | `circ(cx, cy, r, color)` / `circfill(cx, cy, r, color)` |
| `ctx.moveTo/lineTo` | `line(x0, y0, x1, y1, color)` |
| `ctx.save/restore` | `pushClip()` / `popClip()` or `pushCamera2D()` / `popCamera2D()` |
| Camera pan | `setCamera2D(x, y)` / `clearCamera2D()` |

---

## Step 7 — Replace input handling

| Browser event | Nova64 equivalent |
|---|---|
| `keydown` / `keyup` | `key(name)` (held), `keyp(name)` (pressed this frame) |
| `mousedown` / `mousemove` | `mouseX()`, `mouseY()`, `mouseBtn(name)`, `mouseBtnp(name)` |
| `touchstart` / `touchmove` | `touchX()`, `touchY()`, `touchCount()` |
| Gamepad API | `btn(name [, port])`, `btnp(name [, port])` |
| Analog sticks | `axis('left'|'right', 'x'|'y' [, port])` → −1..1 |
| Triggers | `trigger('left'|'right' [, port])` → 0..1 |

---

## Step 8 — Replace storage

| Browser API | Nova64 equivalent |
|---|---|
| `localStorage.setItem(k, v)` | `saveJSON(k, v)` |
| `localStorage.getItem(k)` | `loadJSON(k, defaultVal)` |
| `localStorage.removeItem(k)` | `deleteData(k)` |
| `localStorage.clear()` | `storageClear()` |
| `localStorage.key(i)` | `storageKeys()` (returns array of all keys) |
| Schema versioning | `storageVersion()` / `storageSetVersion(n)` |
| Isolated namespace | `nova64.storage.open('myns')` → sub-store |

---

## Step 9 — Replace audio

| Browser Web Audio | Nova64 equivalent |
|---|---|
| `AudioContext.createOscillator` | `sfx(freq, duration [, vol [, wave]])` |
| `AudioContext.decodeAudioData` | bundle as `.pcm`/`.ogg`/`.wav`, call `playSound(path)` |
| Background music loop | `playMusic(path [, vol [, loop]])` |
| `gainNode.gain.value` | `setVolume(vol)` |
| Mute all | `stopAllSounds()` |

---

## Step 10 — Test with the harness

```bash
# Quick sanity check (3 frames, print checksum)
retroarch/build/harness retroarch/nova64_libretro.so my-cart.nova

# With key injection and screenshot
retroarch/build/harness retroarch/nova64_libretro.so my-cart.nova \
  --key space --capture /tmp/my-cart.ppm

# Verbose logging (prints NOVA64_VERBOSE logs)
retroarch/build/harness retroarch/nova64_libretro.so my-cart.nova --verbose
```

---

## Known gaps

These browser / Godot features have no native equivalent yet:

- **Networking / WebSocket** — not available; use storage for local persistence
- **QuickJS heap serialization** — save states restore only native host state
  (camera, lights, meshes, framebuffer). JS object state resets; re-derive it
  from persistent storage or deterministic init logic.
- **Vulkan renderer** — staged but not yet functional; the core falls back to GLES.
- **Skybox / render targets in software mode** — require a GLES 3.1 context;
  `caps.skybox` and `caps.renderTargets` are false in headless/software runs.

## All other M1–M8 features are implemented

PNG sprites and textures, scene hierarchy (`setParent`/`clearParent`),
3D raycast, 2D AABB physics, controller rumble, custom mesh geometry,
multi-channel audio, OGG Vorbis, music streaming, hot reload, developer
console, RetroAchievements RAM, instanced mesh, equirectangular skybox,
offscreen render targets, PBR materials, normal maps, shadow maps,
orthographic camera, UV transforms, mesh blend modes, and compressed
storage are all implemented and conformance-tested.

See `README_RETROARCH.md` for the full API reference.
