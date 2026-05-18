// Conformance cart 788: camera path API
// Verifies createCameraPath / playCameraPath / stopCameraPath /
// pauseCameraPath / resumeCameraPath / setCameraPathLoop /
// updateCameraPaths / isCameraPathDone / getCameraPathProgress /
// destroyCameraPath.

let path1, path2;
let frame = 0;

export function init() {
   setCamera([0, 3, 10], [0, 0, 0]);
   setLightDirection(0.5, 1, 0.7);
   createSphere(0.6, rgba8(80, 200, 255, 255), [0, 0, 0]);

   // Create a 3-waypoint path over 3 seconds
   path1 = createCameraPath(
      [0, 3, 10,   5, 5, 5,   0, 8, -5],
      [0, 0,  0,   0, 0, 0,   0, 0,  0],
      3.0
   );
   if (!path1) throw new Error('createCameraPath returned 0');

   // Verify initial state
   if (getCameraPathProgress(path1) !== 0) throw new Error('progress should be 0 before play');
   if (isCameraPathDone(path1)) throw new Error('should not be done before play');

   playCameraPath(path1);

   // Advance a small amount — progress should be > 0 now
   updateCameraPaths(0.5);
   const p1 = getCameraPathProgress(path1);
   if (p1 <= 0 || p1 > 1) throw new Error('progress should be in (0,1] after 0.5s of 3s path, got ' + p1);

   // Pause and verify progress doesn't change
   pauseCameraPath(path1);
   const p2 = getCameraPathProgress(path1);
   updateCameraPaths(0.5);
   const p3 = getCameraPathProgress(path1);
   if (Math.abs(p3 - p2) > 0.001) throw new Error('progress should not advance while paused');

   // Resume and advance to end
   resumeCameraPath(path1);
   updateCameraPaths(3.0);
   if (!isCameraPathDone(path1)) throw new Error('should be done after advancing past duration');
   const pEnd = getCameraPathProgress(path1);
   if (Math.abs(pEnd - 1.0) > 0.001) throw new Error('progress should be 1.0 at end, got ' + pEnd);

   // Stop resets progress to 0
   stopCameraPath(path1);
   if (Math.abs(getCameraPathProgress(path1)) > 0.001) throw new Error('stop should reset progress to 0');
   if (isCameraPathDone(path1)) throw new Error('stopped path should not be done');

   // Test looping path
   path2 = createCameraPath(
      [-4, 2, 8,   4, 2, 8],
      [0, 0, 0,    0, 0, 0],
      2.0
   );
   setCameraPathLoop(path2, true);
   playCameraPath(path2);
   updateCameraPaths(2.5); // past one full loop
   if (isCameraPathDone(path2)) throw new Error('looping path should never be done');
   const pLoop = getCameraPathProgress(path2);
   if (pLoop < 0 || pLoop > 1) throw new Error('looping path progress out of [0,1]: ' + pLoop);

   // Destroy path1
   destroyCameraPath(path1);
}

export function update(dt) {
   frame++;
   updateCameraPaths(dt);
}

export function draw() {
   cls(rgba8(10, 12, 22, 255));
   print('788 CAMERA PATH', 4, 4, rgba8(200, 220, 255, 255));
   const p = getCameraPathProgress(path2);
   print('loop progress: ' + p.toFixed(2), 4, 14, rgba8(80, 255, 120, 255));
   print('frame: ' + frame, 4, 24, rgba8(160, 180, 255, 200));
}
