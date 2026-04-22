# Babylon.js Backend Testing Plan

## Current Issues Reported

1. **Text does not render on start screen** (Space Harrier)
2. **Player controls do not work like Three.js version**
3. **Camera does not work like Three.js version**

## Critical Tests Required

### A. Text Rendering Tests

| Test | Three.js | Babylon.js | Status |
|------|----------|------------|--------|
| Simple print() on HUD | ✅ | ❓ | TODO |
| drawText() from ui module | ✅ | ❓ | TODO |
| drawGlowTextCentered() | ✅ | ❓ | TODO |
| Text with different fonts (setFont) | ✅ | ❓ | TODO |
| Text alignment (center/left/right) | ✅ | ❓ | TODO |
| Text on start screen (Space Harrier) | ✅ | ❌ | FAIL |
| Text during gameplay | ✅ | ❓ | TODO |

### B. Player Controls Tests (Space Harrier)

| Test | Three.js | Babylon.js | Status |
|------|----------|------------|--------|
| Move left (A/←) | ✅ | ❓ | TODO |
| Move right (D/→) | ✅ | ❓ | TODO |
| Move up (W/↑) | ✅ | ❓ | TODO |
| Move down (S/↓) | ✅ | ❓ | TODO |
| Player stays within bounds X (-22 to 22) | ✅ | ❓ | TODO |
| Player stays within bounds Y (0 to 18) | ✅ | ❓ | TODO |
| Shoot (Space) | ✅ | ❓ | TODO |

### C. Camera Tests

| Test | Three.js | Babylon.js | Status |
|------|----------|------------|--------|
| Camera position matches | ✅ | ❓ | TODO |
| Camera looks at correct target | ✅ | ❓ | TODO |
| Camera FOV correct (75°) | ✅ | ❓ | TODO |
| Perspective projection correct | ✅ | ❓ | TODO |
| Near/far clipping planes | ✅ | ❓ | TODO |

### D. Cart Compatibility Tests

#### Space Harrier 3D
- [ ] Start screen renders (text, gradients, buttons)
- [ ] Player spawns at correct position
- [ ] Player controls work correctly
- [ ] Enemies spawn and move correctly
- [ ] Collision detection works
- [ ] Shooting works
- [ ] HUD displays score/wave/lives
- [ ] Game over screen works

#### Crystal Cathedral 3D
- [ ] Loads without errors
- [ ] createAdvancedSphere() works
- [ ] Holographic materials render
- [ ] Pixelation effect works
- [ ] Camera movement smooth

#### F-Zero Nova 3D
- [ ] Skybox renders (scene.add compatibility)
- [ ] Track geometry displays
- [ ] Ship controls work
- [ ] Speed effect works

#### WAD Demo
- [ ] Loads DOOM WAD files
- [ ] setDirectionalLight() works
- [ ] Level geometry renders
- [ ] Camera/player movement works

### E. 3D Rendering Comparison

| Feature | Three.js | Babylon.js | Status |
|---------|----------|------------|--------|
| Basic cube rendering | ✅ | ❓ | TODO |
| Sphere rendering | ✅ | ❓ | TODO |
| Materials (basic) | ✅ | ❓ | TODO |
| Materials (holographic) | ✅ | ❓ | TODO |
| Materials (PBR) | ✅ | ❓ | TODO |
| Lighting (ambient) | ✅ | ❓ | TODO |
| Lighting (directional) | ✅ | ❓ | TODO |
| Lighting (point) | ✅ | ❓ | TODO |
| Fog rendering | ✅ | ❓ | TODO |
| Mesh transforms (position) | ✅ | ❓ | TODO |
| Mesh transforms (rotation) | ✅ | ❓ | TODO |
| Mesh transforms (scale) | ✅ | ❓ | TODO |

### F. Coordinate System Tests

| Test | Three.js | Babylon.js | Status |
|------|----------|------------|--------|
| +X is right | ✅ | ✅ | PASS (right-handed mode) |
| +Y is up | ✅ | ✅ | PASS |
| +Z is forward (toward camera) | ✅ | ✅ | PASS (right-handed mode) |
| -Z is backward (away from camera) | ✅ | ✅ | PASS (right-handed mode) |

## Testing Methodology

### 1. Visual Comparison
- Open `console.html` (Three.js) and `babylon_console.html` (Babylon.js) side-by-side
- Load same cart in both
- Compare visual output frame-by-frame
- Document differences

### 2. Console Logging
- Add debug logging to:
  - Player position updates
  - Camera position/target
  - Input handling
  - Text rendering calls
- Compare logs between backends

### 3. Manual Testing
- Play each cart for 30 seconds minimum
- Test all controls
- Look for visual artifacts
- Check performance (FPS)

### 4. Automated Checks
- Verify no console errors
- Check framebuffer content (non-zero pixels)
- Verify HUD canvas has content

## Known Differences (Documented)

### Babylon.js Limitations
1. Post-processing effects (bloom, vignette) not supported - handled gracefully
2. Dithering effect not supported - logs warning
3. XR/VR has different API - compatibility shims added

### Architecture Differences
1. **Coordinate System**: Babylon uses left-handed by default (fixed with `useRightHandedSystem`)
2. **Mesh Creation**: Babylon auto-adds meshes to scene (added `scene.add()` shim)
3. **Vector3 API**: Babylon uses `copyFromFloats()` instead of `.set()`

## Success Criteria

A cart passes backend parity when:
- ✅ No console errors
- ✅ Visual output matches Three.js (within 95% similarity)
- ✅ Controls respond identically
- ✅ Performance within 20% of Three.js
- ✅ All core gameplay features work

## Next Steps

1. **Debug text rendering** - Add console logging to see if `print()` is being called
2. **Test player controls** - Log input events and position updates
3. **Verify camera** - Compare camera matrices between backends
4. **Side-by-side testing** - Run both versions and compare
5. **Document findings** - Update this plan with test results
