// Conformance cart 52: camera getter APIs.
// Tests getCameraPosition(), getCameraTarget(), getCameraFOV() round-trip
// after setCameraPosition(), setCameraTarget(), setCameraFOV().

let errors = [];
let cube = 0;

export function init() {
   const apis = ['getCameraPosition', 'getCameraTarget', 'getCameraFOV'];
   for (const name of apis) {
      if (typeof globalThis[name] !== 'function')
         errors.push(name + '-missing');
   }

   // nova64.camera namespace
   if (typeof nova64.camera.getCameraPosition !== 'function')
      errors.push('nova64.camera.getCameraPosition-missing');
   if (typeof nova64.camera.getCameraTarget !== 'function')
      errors.push('nova64.camera.getCameraTarget-missing');
   if (typeof nova64.camera.getCameraFOV !== 'function')
      errors.push('nova64.camera.getCameraFOV-missing');

   // Round-trip: position
   setCameraPosition(1, 2, 3);
   const pos = getCameraPosition();
   if (!Array.isArray(pos) || pos.length !== 3)
      errors.push('getCameraPosition-not-array');
   else {
      const eps = 0.001;
      if (Math.abs(pos[0] - 1) > eps) errors.push('pos[0]:' + pos[0]);
      if (Math.abs(pos[1] - 2) > eps) errors.push('pos[1]:' + pos[1]);
      if (Math.abs(pos[2] - 3) > eps) errors.push('pos[2]:' + pos[2]);
   }

   // Round-trip: target
   setCameraTarget(4, 5, 6);
   const tgt = getCameraTarget();
   if (!Array.isArray(tgt) || tgt.length !== 3)
      errors.push('getCameraTarget-not-array');
   else {
      const eps = 0.001;
      if (Math.abs(tgt[0] - 4) > eps) errors.push('tgt[0]:' + tgt[0]);
      if (Math.abs(tgt[1] - 5) > eps) errors.push('tgt[1]:' + tgt[1]);
      if (Math.abs(tgt[2] - 6) > eps) errors.push('tgt[2]:' + tgt[2]);
   }

   // Round-trip: FOV
   setCameraFOV(72);
   const fov = getCameraFOV();
   if (typeof fov !== 'number') errors.push('getCameraFOV-not-number');
   else if (Math.abs(fov - 72) > 0.001) errors.push('fov:' + fov);

   // Verify nova64.camera aliases also work
   setCameraPosition(0, 2, 7);
   const pos2 = nova64.camera.getCameraPosition();
   if (!Array.isArray(pos2) || Math.abs(pos2[2] - 7) > 0.001)
      errors.push('nova64.camera.getPosition-mismatch');

   cube = createCube(rgba8(180, 180, 220, 255), [0, 0, 0]);
   setAmbientLight(rgba8(50, 50, 70, 255));
   setLightDirection(-0.4, -0.8, -0.3);
}

export function update(dt) {}

export function draw() {
   cls(rgba8(8, 12, 20, 255));
   print('52 CAM GETTERS', 4, 4, rgba8(180, 220, 255, 255));
   if (errors.length === 0) {
      print('ok', 4, 14, rgba8(80, 255, 120, 255));
   } else {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
   }
}
