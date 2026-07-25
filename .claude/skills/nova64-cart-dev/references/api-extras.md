# Nova64 API Extras

Extended reference for APIs not in `CHEATSHEET.md`.

## Instancing (many identical objects efficiently)

```js
// Create an instanced mesh with N slots
const im = createInstancedMesh(count, 'cube', color)

// Set transform for instance i:
setInstanceTransforms(im, i, x, y, z, rx, ry, rz, sx, sy, sz)

// Override per-instance color:
setInstanceColor(im, i, color)

// Cleanup:
destroyMesh(im)
```

## 2D Particle Emitter (nova64.fx)

```js
const { BM, createEmitter2D, burstEmitter2D, updateEmitter2D, drawEmitter2D } = nova64.fx

const em = createEmitter2D({
  blendMode:    BM.ADD,         // BM.ADD for glow, BM.NORMAL for opaque
  x: 320, y: 180,               // spawn point (canvas coords)
  emitRate:     0,              // 0 = burst only
  maxParticles: 80,
  life:         [0.5, 1.2],     // [min, max] seconds
  speed:        [20, 80],       // [min, max] pixels/s
  angle:        [-Math.PI, Math.PI],
  gravity:      60,             // downward pixels/s²
  scale:        [0.3, 1.0],
  alpha:        [0.7, 1.0],
  fadeOut:      true,
  scaleDown:    true,
  tint:         0xff8800,       // hex color
})

burstEmitter2D(em, 80)          // emit 80 particles now

// In update(dt):
updateEmitter2D(em, dt)

// In draw():
drawEmitter2D(em)
```

## Burst Particles (simple 3D-positioned 2D sparks)

```js
const burst = createBurst(x, y, count, speed)  // screen coords
setBurstColors(burst, [color1, color2, ...])
updateBurst(burst, dt)          // in update()
drawBurst(burst)                // in draw()
if (isBurstDone(burst)) destroyBurst(burst)
```

## Wave System

```js
const wm = createWaveManager({
  waves: [
    { count: 5, speed: 1.2 },
    { count: 8, speed: 1.5, boss: true },
  ]
})

startWave(wm)                   // start next wave
enemyDefeated(wm)               // call when each enemy dies
isWaveActive(wm)                // → bool
getWaveNumber(wm)               // → current wave index
getRemainingEnemies(wm)         // → count left
```

## Skybox

```js
createSpaceSkybox({ starCount: 1500, starSize: 1, nebulae: true })
createGradientSkybox(topColor, bottomColor)   // 0xRRGGBB
createSolidSkybox(color)
setSkyColor(topColor, bottomColor)            // undocumented but works
clearSkybox()
enableSkyboxAutoAnimate(speed)
setSkyboxSpeed(multiplier)
```

## Lighting

```js
setAmbientLight(color, intensity)             // e.g. rgba8(120,160,220,255), 0.85
setLightDirection(x, y, z)                    // directional light dir
setLightColor(color)
createPointLight(color, intensity, dist, x, y, z)  // → light handle
setFog(color, near, far)
clearFog()
```

## Useful Globals

```js
rngRandom()                     // repeatable pseudo-random 0–1
project3DToScreen(wx, wy, wz)   // world → { x, y } canvas coords
nova64.draw.screenWidth()       // canvas width (usually 640)
nova64.draw.screenHeight()      // canvas height (usually 360)
```

## Full 2D Draw Reference

```js
// Solid shapes
rectfill(x, y, w, h, color)
rect(x, y, w, h, color)
circfill(x, y, r, color)
circ(x, y, r, color)
line(x0, y0, x1, y1, color)
hline(x, y, len, color)
vline(x, y, len, color)
pset(x, y, color)
cls(color)
cls3D()   // transparent clear — use in ALL 3D carts

// Glow
glowRect(x, y, x2, y2, color, radius)
glowCircle(x, y, r, color, radius)
glowLine(x0, y0, x1, y1, color, radius)

// Text
print(text, x, y, color)
printBold(text, x, y, color)
printTight(text, x, y, color)
printCentered(text, y, color)
printCentered(text, cx, y, color)
printFlash(x, y, text, color, phase, speed)
printOutlineTight(text, x, y, fgColor, outlineColor)
setFont('small' | 'normal' | 'large')

// HUD helpers
drawProgressBar(x, y, w, h, t, fgColor, bgColor, borderColor)  // t = 0–1
drawHealthBar(x, y, w, h, current, max, opts)
drawCrosshair(cx, cy, size, color, style)
drawPanel(x, y, w, h, opts)

// Color
rgba8(r, g, b, a)   // 0–255 each channel
```
