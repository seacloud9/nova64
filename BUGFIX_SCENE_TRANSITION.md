# Scene Transition Bug Fix

## Problem
When switching between games/demos (e.g., Hello 3D → Strider Demo), the console would flood with errors:

```
api-3d.js:249 setPosition: mesh with id 1 not found
api-3d.js:327 rotateMesh: mesh with id 2 not found
```

These errors made it impossible to start the Strider (Knight Platformer) demo.

## Root Cause
When you switch from one game to another, there's a race condition:

1. User clicks to load new game
2. `console.js` calls `clearScene()` - deletes all meshes
3. **BUT the OLD game's `update()` function is still registered and continues running!**
4. Old game's update() tries to call `setPosition()` / `rotateMesh()` on deleted mesh IDs
5. Errors flood the console (60 times per second!)
6. New game loads and calls its `init()`
7. New game's `update()` starts running

The sequence looks like this:
```
Frame 1: User clicks "Strider Demo"
Frame 2: clearScene() runs → meshes 1-11 deleted
Frame 3: Hello-3D update() still runs → tries setPosition(mesh 1) → ERROR!
Frame 4: Hello-3D update() still runs → tries rotateMesh(mesh 2) → ERROR!
Frame 5: Strider module loads
Frame 6: Strider init() runs
Frame 7: Strider update() starts running (errors stop)
```

## Solution

### Fix 1: Add Safety Check to Hello 3D
In `examples/hello-3d/code.js`, added a guard at the start of `update()`:

```javascript
export function update(dt) {
  time += dt;
  
  // Safety check: Don't update if objects don't exist (during scene transitions)
  if (!cubes || cubes.length === 0) {
    return;
  }
  
  // ... rest of update logic
}
```

**Why This Works:**
- When scene is cleared, `cubes` array is empty
- Update function immediately returns instead of trying to access deleted meshes
- No more errors during transition!

### Fix 2: Add Safety Check to Strider Demo (Already Applied)
In `examples/strider-demo-3d/code.js`, added a guard at the start of `update()`:

```javascript
export function update() {
  const dt = 1/60;
  
  // Safety check: Don't update if game objects aren't initialized yet
  if (playerKnight === null) {
    // Game not initialized yet, skip this frame
    return;
  }
  
  // ... rest of update logic
}
```

**Why This Works:**
- When module first loads, `playerKnight` is `null`
- Update function immediately returns until `init()` has run
- Once `init()` assigns `playerKnight`, updates proceed normally

## Pattern for All Demos
**Every demo should add a safety check at the start of its `update()` function:**

```javascript
export function update(dt) {
  // Check if main game objects exist
  if (!myMainObject || myObjectsArray.length === 0) {
    return; // Scene is being cleared or not initialized yet
  }
  
  // ... normal update logic
}
```

## Testing
After these fixes:
- ✅ Can switch from Hello 3D → Strider with no errors
- ✅ Can switch from Strider → Hello 3D with no errors
- ✅ Strider demo start screen appears
- ✅ Can click/press key to start Strider demo
- ✅ No "mesh with id X not found" console spam

## Impact
- **Files Modified:** 2
  - `examples/hello-3d/code.js` - Added safety check
  - `examples/strider-demo-3d/code.js` - Already has safety check
- **Lines Changed:** 5 lines per demo
- **Breaking Changes:** None
- **Performance Impact:** Negligible (one array length check per frame)

## Recommendation
Apply this pattern to ALL demo games to prevent similar issues:
- `examples/f-zero-nova-3d/code.js`
- `examples/shooter-demo-3d/code.js`
- `examples/star-fox-nova-3d/code.js`
- `examples/cyberpunk-city-3d/code.js`
- `examples/crystal-cathedral-3d/code.js`
- `examples/mystical-realm-3d/code.js`
- All other demos

This will make scene transitions robust across the entire codebase.
