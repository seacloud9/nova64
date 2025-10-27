# Super Plumber 64 - Test Checklist

## Date: October 26, 2025

## Issues Identified and Fixed

### 1. ✅ Key Input Format Fixed
**Problem**: Using both uppercase and lowercase versions (`'a'` and `'A'`) which is redundant
**Solution**: Nova64's input system automatically handles case conversion - just use lowercase

**Changes Made**:
```javascript
// BEFORE (redundant):
if (isKeyDown('a') || isKeyDown('A')) moveX = -1;

// AFTER (correct):
if (isKeyDown('a')) moveX = -1;
```

### 2. ✅ Start Screen Input Fixed
**Problem**: Using `isKeyPressed()` for keys that should use `isKeyDown()`
**Solution**: Changed to use `isKeyDown()` for consistent behavior

```javascript
// BEFORE:
if (isKeyPressed('Enter') || isKeyPressed('Space'))

// AFTER:
if (isKeyDown('Enter') || isKeyDown('Space'))
```

### 3. ✅ Simplified All Key Checks
- Removed duplicate uppercase/lowercase checks
- Use lowercase only (system handles conversion)
- Consistent use of `isKeyDown()` vs `isKeyPressed()`

## Testing Steps

### Test 1: Start Screen
1. ☐ Open http://localhost:5174/
2. ☐ Select "🍄 Super Plumber 64" from dropdown
3. ☐ Verify start screen appears with:
   - Red "SUPER PLUMBER 64" title
   - Yellow subtitle
   - Pulsing "PRESS SPACE TO START"
   - Controls list on right
   - Features list on left
4. ☐ Press Space to start
5. ☐ Verify game transitions to gameplay

### Test 2: Movement Controls
**Arrow Keys**:
- ☐ Up Arrow - Move forward
- ☐ Down Arrow - Move backward
- ☐ Left Arrow - Move left  
- ☐ Right Arrow - Move right

**WASD Keys**:
- ☐ W - Move forward
- ☐ S - Move backward
- ☐ A - Move left
- ☐ D - Move right

### Test 3: Jump Mechanics
**Normal Jump**:
- ☐ Space - Jump (height ~12 units)
- ☐ Z key - Jump (should work same as Space)

**Double Jump**:
- ☐ Jump twice quickly (within 0.5s)
- ☐ Second jump should be higher (~14 units)

**Triple Jump**:
- ☐ Jump three times quickly (within 0.5s)
- ☐ Third jump should be highest (~18 units)
- ☐ HUD should show "TRIPLE!!!" indicator

### Test 4: Ground Pound
- ☐ Jump in air
- ☐ Hold Down Arrow or S key
- ☐ Press Space or Z
- ☐ Player should slam downward fast
- ☐ HUD should show "GROUND POUND!" indicator
- ☐ Small bounce on landing

### Test 5: Camera Controls
- ☐ Q key - Rotate camera left
- ☐ E key - Rotate camera right
- ☐ Camera should smoothly follow player
- ☐ Camera height should adjust with player

### Test 6: Collectibles
**Coins** (Yellow spinning cubes):
- ☐ Walk near a coin
- ☐ Coin disappears
- ☐ Score increases by 10
- ☐ "COINS: X" counter updates in HUD
- ☐ Test collecting all 15 coins

**Stars** (Orange bobbing cubes):
- ☐ Walk near a star
- ☐ Star disappears
- ☐ Score increases by 100
- ☐ "STARS: X/3" counter updates in HUD
- ☐ Collect all 3 stars

### Test 7: Win Condition
- ☐ Collect all 3 stars
- ☐ Verify "ALL STARS COLLECTED!" message appears
- ☐ Verify "YOU WIN!" message appears
- ☐ Game should still be playable after winning

### Test 8: Respawn System
- ☐ Walk/jump off edge of platform
- ☐ Fall below Y = -10
- ☐ Player should respawn at starting position (0, 10, 0)
- ☐ Velocity should reset to zero

### Test 9: Visual Features
- ☐ Space skybox with stars visible in background
- ☐ Blue fog in distance
- ☐ Bloom effect on coins and stars (glowing)
- ☐ Smooth FXAA anti-aliasing
- ☐ Player model (red cube) visible
- ☐ All 11 platforms visible with different colors

### Test 10: Gamepad (if available)
- ☐ Left stick - Movement
- ☐ A button - Jump
- ☐ Down + A in air - Ground Pound
- ☐ L/R shoulder buttons - Camera rotation
- ☐ Right stick - Camera control

## Expected Performance

- **Frame Rate**: 60 FPS
- **Resolution**: 640×360
- **Load Time**: < 2 seconds
- **No console errors**: Check browser console

## Common Issues and Solutions

### Issue: Game doesn't load
**Solution**: Make sure dev server is running on port 5174
```bash
pnpm dev
```

### Issue: Start screen doesn't show
**Solution**: Check browser console for errors, verify code.js loaded

### Issue: Keys don't respond
**Solution**: 
1. Click on canvas to focus it
2. Check browser console for errors
3. Try both Arrow keys and WASD

### Issue: Jump doesn't work
**Solution**: Make sure player is on ground (green platform)

### Issue: Can't see anything
**Solution**: 
1. Camera might be in wrong position - press R to reload
2. Check if skybox/lighting initialized

## Debug Console Commands

Open browser console (F12) and check for:
```
🎮 SUPER PLUMBER 64 - Starting!
✨ Space skybox created with 500 stars
```

If you see errors, report them!

## Test Results

Date: __________
Tester: __________

| Test | Pass | Fail | Notes |
|------|------|------|-------|
| Start Screen | ☐ | ☐ | |
| Movement (Arrows) | ☐ | ☐ | |
| Movement (WASD) | ☐ | ☐ | |
| Jump (Space) | ☐ | ☐ | |
| Jump (Z) | ☐ | ☐ | |
| Triple Jump | ☐ | ☐ | |
| Ground Pound | ☐ | ☐ | |
| Camera Q/E | ☐ | ☐ | |
| Coin Collection | ☐ | ☐ | |
| Star Collection | ☐ | ☐ | |
| Win Condition | ☐ | ☐ | |
| Respawn | ☐ | ☐ | |
| Visuals | ☐ | ☐ | |
| Gamepad | ☐ | ☐ | |

## Final Status

- ☐ All tests passed - Game is working!
- ☐ Some tests failed - See notes above
- ☐ Game doesn't run - Check console errors

---

## Quick Test (30 seconds)

1. Load game
2. Press Space to start
3. Move with WASD or Arrows
4. Jump with Space
5. Collect a coin
6. Rotate camera with Q/E

If all of these work, game is functional! ✅
