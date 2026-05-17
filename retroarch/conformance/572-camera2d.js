// Conformance cart 572: createCamera2D, cam2DFollow, cam2DShake, updateCamera2D.

let errors = [];
let cam;

export function init() {
   const needed = ['createCamera2D', 'cam2DFollow', 'cam2DShake', 'updateCamera2D'];
   for (const f of needed) {
      if (typeof globalThis[f] !== 'function') errors.push(f + '-missing');
   }
   if (errors.length > 0) return;

   // createCamera2D
   cam = createCamera2D({ x: 100, y: 200, zoom: 2, rotation: 0.5 });
   if (cam.x !== 100) errors.push('cam-x');
   if (cam.y !== 200) errors.push('cam-y');
   if (cam.zoom !== 2) errors.push('cam-zoom');
   if (Math.abs(cam.rotation - 0.5) > 0.001) errors.push('cam-rotation');
   if (cam._shakeX !== 0) errors.push('cam-shakeX');
   if (cam._targetX !== null) errors.push('cam-targetX-not-null');

   // cam2DFollow — sets target
   cam2DFollow(cam, 300, 400, 0.016, 0.2);
   if (cam._targetX !== 300) errors.push('follow-targetX');
   if (cam._targetY !== 400) errors.push('follow-targetY');
   if (cam._lerpFactor !== 0.2) errors.push('follow-lerpFactor');

   // updateCamera2D — lerp moves toward target
   const startX = cam.x;
   updateCamera2D(cam, 0.016);
   if (cam.x <= startX) errors.push('update-lerp-x');

   // cam2DShake — sets shake fields
   cam2DShake(cam, 10, 0.5);
   if (cam._shakeMag !== 10) errors.push('shake-mag');
   if (Math.abs(cam._shakeDur - 0.5) > 0.001) errors.push('shake-dur');
   if (Math.abs(cam._shakeTime - 0.5) > 0.001) errors.push('shake-time');

   // updateCamera2D with shake active — _shakeX/_shakeY set
   updateCamera2D(cam, 0.1);
   if (cam._shakeTime <= 0) errors.push('shake-time-dec');
}

export function update(dt) {}

export function draw() {
   cls(rgba8(6, 8, 22, 255));
   print('572 CAMERA 2D', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Draw camera state
   const c2 = createCamera2D({ x: 320, y: 180, zoom: 1 });
   cam2DFollow(c2, 340, 200, 0.016, 0.15);
   for (let i = 0; i < 30; i++) {
      updateCamera2D(c2, 0.016);
      const bx = Math.floor(c2.x);
      const by = Math.floor(c2.y);
      pset(bx, by, rgba8(80, 200, 255, 200));
   }

   // Shake visualizer
   const sc = createCamera2D({});
   cam2DShake(sc, 15, 1.0);
   for (let i = 0; i < 20; i++) {
      updateCamera2D(sc, 0.05);
      const ox = 320 + Math.floor(sc._shakeX);
      const oy = 240 + Math.floor(sc._shakeY);
      rectfill(ox - 2, oy - 2, ox + 2, oy + 2, rgba8(255, 100, 60, 200));
   }

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
