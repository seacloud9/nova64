# Strider Demo Runtime Error Fix

## Problem
The Shadow Ninja 3D (Strider) platformer demo was failing to start with multiple errors:

1. **Missing `vec3()` function:**
```
ReferenceError: vec3 is not defined at Object.init (code.js:70:10)
```

2. **Undefined `comboTime` variable:**
```
ReferenceError: comboTime is not defined at Object.init (code.js:100:13)
```

3. **Invalid mesh references:**
```
api-3d.js:249 setPosition: mesh with id 1 not found
api-3d.js:327 rotateMesh: mesh with id 2 not found
```

4. **Player object not persisting:**
```
api-3d.js:249 setPosition: mesh with id 1 not found
api-3d.js:327 rotateMesh: mesh with id 2 not found (repeating every frame)
```

## Root Causes

### 1. Missing `vec3()` Helper Function
The game code was using `vec3(x, y, z)` to create 3D vector objects, but this helper function was never defined. This is not part of the Nova64 API - it's a custom helper that needs to be in the game code.

**Location:** `examples/strider-demo-3d/code.js` line 70-71
```javascript
player = {
  pos: vec3(0, 5, 0),  // ❌ vec3 not defined!
  vel: vec3(0, 0, 0),  // ❌ vec3 not defined!
  // ...
}
```

### 2. Variable Name Typo: `comboTime` vs `comboTimer`
The variable was declared as `comboTimer` but code was trying to use `comboTime` (without the 'r'), causing a reference error during initialization.

**Location:** Multiple locations
```javascript
let comboTimer = 0;  // ✅ Declared at top

// But used wrong name:
comboTime = 0;        // ❌ Line 100 - wrong name
if (comboTime > 0)    // ❌ Line 172 - wrong name
```

### 3. Invalid Mesh References in Particle System
When the scene is cleared and reloaded, old particle objects still have references to destroyed mesh IDs. The `updateParticles()` function was trying to call `getPosition()`, `setPosition()`, and `setRotation()` on meshes that no longer exist, causing repeated console errors.

**Location:** `examples/strider-demo-3d/code.js` line 839-869

### 4. Missing Player Object Assignment (CRITICAL)
The `init()` function was calling `createNinjaPlayer()` but NOT storing the return value. This meant the `playerKnight` variable stayed `null`, and all mesh references were immediately lost. When the game transitioned from 'start' to 'playing' state and tried to update the player, it attempted to use null mesh references, causing "mesh with id X not found" errors every frame.

**Location:** `examples/strider-demo-3d/code.js` line 115

The `createNinjaPlayer()` function creates multiple meshes (body, head, eyes, katana, scarf) and returns an object with references to all of them:
```javascript
function createNinjaPlayer() {
  const body = createCube(...);
  const head = createCube(...);
  const eyes = createCube(...);
  const katana = createCube(...);
  const scarf = createCube(...);
  
  return { body, head, eyes, katana, scarf };  // ✅ Returns mesh references
}
```

But `init()` was calling it without storing the result:
```javascript
createNinjaPlayer();  // ❌ Return value discarded!
```

This is the root cause of the persistent mesh errors - the player object meshes were created but immediately became orphaned with no references, so when `updatePlayerMeshes()` tried to use `playerKnight.body`, `playerKnight.head`, etc., they were all null.

## Solutions

### Fix 1: Add `vec3()` Helper Function
Added a simple vector helper at the top of the file:

```javascript
// Helper function for 3D vectors
function vec3(x, y, z) {
  return { x: x, y: y, z: z };
}
```

**Location:** After line 4 in `code.js`

### Fix 2: Fix Variable Name Typo
Changed all `comboTime` references to `comboTimer` to match the declared variable name:

```javascript
// Line 100 in init()
comboTimer = 0  // ✅ Fixed

// Lines 172-174 in update()
if (comboTimer > 0) {     // ✅ Fixed
  comboTimer -= dt;        // ✅ Fixed
  if (comboTimer <= 0) {   // ✅ Fixed
    combo = 0;
  }
}
```

**Changes:**
- Line 100: `comboTime = 0` → `comboTimer = 0`
- Line 172: `if (comboTime > 0)` → `if (comboTimer > 0)`
- Line 173: `comboTime -= dt` → `comboTimer -= dt`
- Line 174: `if (comboTime <= 0)` → `if (comboTimer <= 0)`

### Fix 3: Made Particle System Robust
Added null checks and validation to handle invalid mesh references gracefully:

```javascript
function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const particle = particles[i];
    
    // ✅ Check if particle or mesh is invalid
    if (!particle || !particle.mesh) {
      particles.splice(i, 1);
      continue;
    }
    
    particle.life -= dt;
    
    const pos = getPosition(particle.mesh);
    
    // ✅ Check if mesh still exists
    if (!pos) {
      // Mesh doesn't exist anymore, remove particle
      particles.splice(i, 1);
      continue;
    }
    
    // ... rest of update logic
  }
}
```

**Changes:**
- Added `if (!particle || !particle.mesh)` check before processing
- Added `if (!pos)` check after `getPosition()` to detect invalid meshes
- Automatically removes invalid particles from the array
- Prevents console spam from API errors

### Fix 4: Store Player Object References (CRITICAL FIX #1)
Changed the `init()` function to actually store the return value from `createNinjaPlayer()`:

```javascript
export function init() {
  // Clear all arrays to prevent mesh errors
  enemies = []
  coins = []
  particles = []
  platforms = []
  environment = []
  
  // ... more setup ...
  
  // Create game objects and store references
  playerKnight = createNinjaPlayer()  // ✅ NOW STORES RETURN VALUE!
  createNinjaWorld()
  createPlatforms()
  createGrapplePoints()
  spawnEnemies()
  spawnCoins()
  
  console.log('🥷 Shadow Ninja 3D initialized!');
}
```

**Changes:**
- **Line 117**: Changed `createNinjaPlayer()` to `playerKnight = createNinjaPlayer()`
- Added comment: `// Create game objects and store references`
- Added confirmation log: `console.log('🥷 Shadow Ninja 3D initialized!');`

This ensures that when the game transitions to 'playing' state and calls `updatePlayerMeshes()`, the `playerKnight` object contains valid mesh references that can be updated every frame.

### Fix 5: Prevent Update Before Initialization (CRITICAL FIX #2)
Added a safety check at the start of `update()` to prevent game logic from running before `init()` completes:

```javascript
export function update() {
  const dt = 1/60;
  
  // Safety check: Don't update if game objects aren't initialized yet
  if (playerKnight === null) {
    // Game not initialized yet, skip this frame
    return;
  }
  
  // Handle start screen
  if (gameState === 'start') {
    // ... rest of update logic
  }
}
```

**Changes:**
- **Lines 136-139**: Added null check for `playerKnight` with early return
- This prevents update from running before init() is called

**Why This Was Critical:**
- When switching between games (e.g., Hello 3D → Strider), there's a brief moment when:
  1. The old game's scene is cleared (meshes deleted)
  2. The new game's module loads (variables initialized to null)
  3. `update()` might be called BEFORE `init()` runs!
- Without this check:
  - `update()` would call `updatePlayer()`, `updateEnemies()`, etc.
  - These functions would try to access `playerKnight.body`, etc.
  - Since `playerKnight` is still `null`, it would throw errors
  - Or worse, stale mesh IDs from the previous game would be referenced
- With this check:
  - `update()` safely exits if game isn't initialized yet
  - Once `init()` runs and assigns `playerKnight`, updates proceed normally
  - No more "mesh with id X not found" errors during game transitions!

## Testing
After these fixes:
- ✅ Game initializes without `vec3 is not defined` error
- ✅ Game initializes without `comboTime is not defined` error
- ✅ No more "mesh with id X not found" console errors
- ✅ Particle system handles scene transitions gracefully
- ✅ Game can be loaded and reloaded without crashes
- ✅ Game can be switched from other demos without errors
- ✅ Start screen works (press ENTER, SPACE, or any button to start)
- ✅ Game state properly transitions from 'start' to 'playing'
- ✅ Player object meshes persist throughout the game
- ✅ `updatePlayerMeshes()` can successfully manipulate player mesh references
- ✅ Player animation (walking, dashing, attacking) works correctly
- ✅ Update loop safely handles pre-initialization state

## Impact
- **Files Modified:** 1 (`examples/strider-demo-3d/code.js`)
- **Lines Changed:** 28 total
  - 4 lines: Added `vec3()` helper function
  - 4 lines: Fixed `comboTime` → `comboTimer` variable name
  - 8 lines: Added null checks in `updateParticles()`
  - 6 lines: Fixed `playerKnight` assignment + added logging + debug logging
  - 6 lines: Added safety check in `update()` to prevent pre-init execution
- **Breaking Changes:** None
- **API Changes:** None
- **Performance Impact:** Negligible (one extra null check per frame)

## Notes
The `vec3()` helper function is a common pattern in 3D games but is not part of the core Nova64 API. Other demos use simple object literals `{ x, y, z }` directly or use arrays `[x, y, z]` for the Nova64 API functions. This helper makes the Strider demo code more readable.
