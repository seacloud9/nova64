# Babylon.js Debug Session Summary

## Issues Reported

1. **Text does not render on start screen** (Space Harrier)
2. **Player controls do not work like Three.js version**
3. **Camera does not work like Three.js version**

## Fixes Applied

### 1. Right-Handed Coordinate System (Commit `953d321`)

**Issue:** Babylon.js uses LEFT-HANDED coordinates by default, Three.js uses RIGHT-HANDED
**Fix:** Set `scene.useRightHandedSystem = true` in GpuBabylon constructor
**Impact:** Should fix player controls working backwards

### 2. Framebuffer Composite Mode (Commit `6419da4`)

**Issue:** Framebuffer drawn with `'destination-over'` (under HUD) instead of `'source-over'` (on top)
**Fix:** Changed composite mode to `'source-over'`
**Impact:** Should fix 2D content visibility on start screens

### 3. Debug Logging Added (Commit `5c12ea4`)

**What:** Added comprehensive logging to:

- Framebuffer composite (pixel count every 60 frames)
- print() calls (first 5 calls logged)
- Player movement (every 60 frames when moving)

**Purpose:** Enable data-driven debugging instead of guessing

## Testing Instructions

### To Test with Debug Logging:

1. **Open Babylon Console:**

   ```
   http://localhost:5173/babylon_console.html
   ```

2. **Open DevTools Console (F12)**

3. **Load Space Harrier** from cart selector

4. **Check for Debug Output:**
   - `[API] print() called: text="..."` - Confirms text rendering is being called
   - `[GpuBabylon] Framebuffer composite: X non-zero pixels` - Confirms framebuffer has content
   - `[Space Harrier] Player move: dx=..., dy=...` - Confirms controls are working

### Expected Debug Output (if working):

```
[API] print() called: text="SPACE", x=320, y=44, color=..., scale=2
[API] print() called: text="HARRIER", x=320, y=98, color=..., scale=2
[GpuBabylon] Framebuffer composite: 12500 non-zero pixels, hasContent: true
```

### If Text Still Not Showing:

Check console for:

1. Are print() calls happening? (If no → cart code issue)
2. Does framebuffer have pixels? (If no → BitmapFont issue)
3. Is composite happening? (If no → canvas visibility issue)

### Player Controls Test:

1. Press **Space** to start game
2. Use **WASD** or **Arrow Keys** to move
3. Watch console for:
   ```
   [Space Harrier] Player move: dx=1, dy=0, pos=(5.23, 0.00, -5.00)
   ```
4. **Expected Behavior:**
   - **A/←** should move LEFT (negative X)
   - **D/→** should move RIGHT (positive X)
   - **W/↑** should move UP (positive Y)
   - **S/↓** should move DOWN (negative Y)
   - Player should stay within bounds X: -22 to 22, Y: 0 to 18

## Side-by-Side Comparison

### To Compare Three.js vs Babylon.js:

1. **Open Three.js version:**

   ```
   http://localhost:5173/console.html
   ```

2. **Open Babylon.js version (different browser tab):**

   ```
   http://localhost:5173/babylon_console.html
   ```

3. **Load same cart in both**

4. **Compare:**
   - Visual appearance (screenshot both)
   - Console debug output
   - Player movement behavior
   - Text rendering

5. **Document differences** in BABYLON_TESTING_PLAN.md

## Next Steps Based on Test Results

### If Text Rendering Works:

✅ Mark test as PASS in BABYLON_TESTING_PLAN.md
✅ Remove debug logging (or reduce verbosity)

### If Text Rendering Fails:

❌ Check which part of pipeline is failing:

- If print() not called → Nova64.ui module not wired correctly
- If framebuffer empty → BitmapFont.draw() not writing pixels
- If framebuffer full but not visible → Canvas CSS/z-index issue

### If Player Controls Work:

✅ Mark test as PASS
✅ Remove debug logging

### If Player Controls Fail:

❌ Compare debug output between backends:

- Check dx/dy values (should be same)
- Check position values (should move same direction)
- Check boundaries (should clamp at same values)
- Look for coordinate system issues

## Files Modified (This Session)

- `runtime/gpu-babylon.js` - Right-handed coordinate system, composite mode fix, debug logging
- `runtime/api.js` - Debug logging for print()
- `examples/space-harrier-3d/code.js` - Debug logging for player movement
- `BABYLON_TESTING_PLAN.md` - Comprehensive test matrix (NEW)
- `BABYLON_DEBUG_SUMMARY.md` - This file (NEW)

## Commits

1. `8ffdf88` - Initial Babylon.js backend implementation with cart fixes
2. `953d321` - Right-handed coordinate system fix
3. `6419da4` - Framebuffer composite mode fix
4. `5c12ea4` - Debug logging and testing plan

## Success Criteria

Backend parity achieved when:

- ✅ No console errors
- ✅ Text renders identically
- ✅ Player controls respond same as Three.js
- ✅ Visual output matches (within 95%)
- ✅ All core features work
