# 🐛 Bug Fix: Circle Function Collision

## Issue
The collision detection system's `circle()` function was overwriting the 2D drawing API's `circle()` function, causing a BigInt type error.

## Root Cause
In `/src/main.js`, the collision functions were being exposed to the global scope AFTER the drawing API:

```javascript
api.exposeTo(g);              // Exposes circle() for drawing
Object.assign(g, { circle }); // OVERWRITES with collision circle()
```

This caused the game to call the collision detection `circle(ax, ay, ar, bx, by, br)` instead of the drawing `circle(x, y, radius, color, filled)`.

## Solution
Renamed the collision circle function to `circleCollision` to avoid naming conflict:

```javascript
// src/main.js
import { aabb, circle as circleCollision, raycastTilemap } from '../runtime/collision.js';
Object.assign(g, { aabb, circleCollision, raycastTilemap });
```

## API Reference

### Drawing API
```javascript
circle(x, y, radius, color, filled)
// Example: Draw crosshair
circle(320, 180, 15, rgba8(0, 255, 0, 100), false);
```

### Collision Detection API
```javascript
circleCollision(ax, ay, ar, bx, by, br)
// Example: Check if two circles collide
if (circleCollision(player.x, player.y, 5, enemy.x, enemy.y, 5)) {
  // Collision detected!
}
```

## Fixed Files
- `/src/main.js` - Renamed collision circle import to `circleCollision`

## Status
✅ Fixed - Drawing circle() now works correctly
✅ Game renders crosshair and HUD elements properly
✅ Collision detection still available as `circleCollision()`
