// Conformance cart 791: mesh hit flash API
// Verifies triggerMeshFlash / updateMeshFlashes / isMeshFlashing / cancelMeshFlash.

let cube;
const BASE_COLOR  = rgba8(60, 160, 255, 255);
const FLASH_COLOR = rgba8(255, 255, 255, 255);

export function init() {
   setCamera([0, 3, 8], [0, 0, 0]);
   setLightDirection(0.5, 1, 0.7);

   cube = createCube(1.0, BASE_COLOR);

   // Not flashing initially
   if (isMeshFlashing(cube)) throw new Error('mesh should not be flashing before trigger');

   // Trigger a flash
   triggerMeshFlash(cube, FLASH_COLOR, 0.5);
   if (!isMeshFlashing(cube)) throw new Error('mesh should be flashing after trigger');

   // Advance less than duration — still flashing
   updateMeshFlashes(0.2);
   if (!isMeshFlashing(cube)) throw new Error('should still be flashing at 0.2s of 0.5s');

   // Advance past duration — flash should expire
   updateMeshFlashes(0.4);
   if (isMeshFlashing(cube)) throw new Error('flash should have expired after 0.6s total');

   // Re-trigger and cancel early
   triggerMeshFlash(cube, FLASH_COLOR, 1.0);
   if (!isMeshFlashing(cube)) throw new Error('should be flashing again');
   const ok = cancelMeshFlash(cube);
   if (!ok) throw new Error('cancelMeshFlash should return true');
   if (isMeshFlashing(cube)) throw new Error('should not be flashing after cancel');

   // Cancelling a non-flashing mesh returns false
   const ok2 = cancelMeshFlash(cube);
   if (ok2) throw new Error('double-cancel should return false');

   // Re-trigger overwrites previous flash without leak
   triggerMeshFlash(cube, rgba8(255, 80, 80, 255), 2.0);
   triggerMeshFlash(cube, rgba8(80, 255, 80, 255), 0.1); // overwrites
   updateMeshFlashes(0.2); // expire the 0.1s flash
   if (isMeshFlashing(cube)) throw new Error('overwritten flash should expire correctly');

   // Leave a gentle flash active for the draw frame
   triggerMeshFlash(cube, rgba8(255, 240, 100, 255), 999.0);
}

export function update(dt) {
   updateMeshFlashes(dt);
}

export function draw() {
   cls(rgba8(10, 12, 22, 255));
   print('791 MESH FLASH', 4, 4, rgba8(200, 220, 255, 255));
   print('flashing: ' + isMeshFlashing(cube), 4, 14, rgba8(80, 255, 120, 255));
}
