// Conformance cart 790: 2D trail API
// Verifies createTrail2D / addTrail2DPoint / setTrail2DColors /
// setTrail2DWidth / drawTrail2D / clearTrail2D / getTrail2DCount /
// destroyTrail2D.

let trail;

export function init() {
   // Create a trail with 8 max points
   trail = createTrail2D(8);
   if (!trail) throw new Error('createTrail2D returned 0');

   // Initially empty
   if (getTrail2DCount(trail) !== 0)
      throw new Error('new trail should have 0 points');

   // Add points and verify count
   addTrail2DPoint(trail, 100, 100);
   if (getTrail2DCount(trail) !== 1) throw new Error('count should be 1');
   addTrail2DPoint(trail, 120, 110);
   addTrail2DPoint(trail, 140, 100);
   if (getTrail2DCount(trail) !== 3) throw new Error('count should be 3');

   // Clear resets count
   clearTrail2D(trail);
   if (getTrail2DCount(trail) !== 0) throw new Error('clear should reset count to 0');

   // Fill to max to verify cap
   for (let i = 0; i < 12; i++) addTrail2DPoint(trail, i * 20, 180);
   if (getTrail2DCount(trail) !== 8) throw new Error('count should be capped at max=8, got ' + getTrail2DCount(trail));

   // Color and width setters should not crash
   setTrail2DColors(trail, rgba8(255, 100, 50, 255), rgba8(255, 100, 50, 0));
   setTrail2DWidth(trail, 4, 1);

   // Destroy frees the slot
   const ok = destroyTrail2D(trail);
   if (!ok) throw new Error('destroyTrail2D should return true');

   // Second destroy returns false
   const ok2 = destroyTrail2D(trail);
   if (ok2) throw new Error('double-destroy should return false');

   // Rebuild for draw
   trail = createTrail2D(16);
   setTrail2DColors(trail, rgba8(255, 200, 50, 255), rgba8(80, 160, 255, 0));
   for (let i = 0; i < 12; i++) {
      const x = 80 + i * 40;
      const y = 180 + Math.round(Math.sin(i * 0.7) * 30);
      addTrail2DPoint(trail, x, y);
   }
}

export function update(dt) {}

export function draw() {
   cls(rgba8(10, 12, 22, 255));
   print('790 TRAIL 2D', 4, 4, rgba8(200, 220, 255, 255));
   print('count: ' + getTrail2DCount(trail), 4, 14, rgba8(80, 255, 120, 255));
   drawTrail2D(trail);
}
