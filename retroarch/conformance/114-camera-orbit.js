// Conformance cart 114: Camera orbit helper.
// setCameraOrbit(tx, ty, tz, distance, azimuth_deg, elevation_deg)
// Verify camera reaches expected position and scene renders.

let errors = [];
let cube = 0;

export function init() {
   if (typeof setCameraOrbit !== 'function') {
      errors.push('setCameraOrbit-missing'); return;
   }

   cube = createCube(rgba8(80, 140, 220, 255));
   if (!cube) { errors.push('createCube failed'); return; }

   // Orbit at distance 5, directly in front (az=0, el=0)
   setCameraOrbit(0, 0, 0, 5, 0, 0);
   const pos0 = getCameraPosition();
   // At az=0, el=0 camera should be at (0, 0, 5) approximately
   if (!pos0) { errors.push('getCameraPosition returned null'); return; }
   if (Math.abs(pos0.z - 5) > 0.1)
      errors.push('orbit az=0 el=0: expected z≈5, got z=' + pos0.z.toFixed(3));

   // Orbit az=90 (camera moves to +X side)
   setCameraOrbit(0, 0, 0, 5, 90, 0);
   const pos1 = getCameraPosition();
   if (Math.abs(pos1.x - 5) > 0.1)
      errors.push('orbit az=90 el=0: expected x≈5, got x=' + pos1.x.toFixed(3));

   // Orbit el=90 (camera should be at top, y≈5)
   setCameraOrbit(0, 0, 0, 5, 0, 90);
   const pos2 = getCameraPosition();
   if (Math.abs(pos2.y - 5) > 0.1)
      errors.push('orbit az=0 el=90: expected y≈5, got y=' + pos2.y.toFixed(3));

   // Reset to a normal view angle for render
   setCameraOrbit(0, 0, 0, 6, 30, 25);
}

export function update(dt) {}

export function draw() {
   cls(rgba8(12, 14, 22, 255));
   print('114 CAMERA ORBIT', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   draw3d(rgba8(12, 14, 22, 255));
   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
