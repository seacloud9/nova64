// Conformance cart 643: batch 49 combined showcase.
// addVec3, subVec3, scaleVec3, normVec3, dotVec3, magVec3,
// crossVec3, lerpVec3, rotateVec2, rightStickY, leftStickX, leftStickY.

let errors = [];
let t = 0;
let particles = [];

export function init() {
   const needed = ['addVec3','subVec3','scaleVec3','normVec3',
                   'dotVec3','magVec3','crossVec3','lerpVec3','rotateVec2',
                   'rightStickY','leftStickX','leftStickY'];
   for (const f of needed) {
      if (typeof globalThis[f] !== 'function') errors.push(f + '-missing');
   }
   if (errors.length > 0) return;

   // spawn particles in a sphere
   for (let i = 0; i < 40; i++) {
      const ang = (i / 40) * Math.PI * 2;
      const elev = ((i % 5) / 4 - 0.5) * Math.PI;
      const x = Math.cos(ang) * Math.cos(elev);
      const y = Math.sin(elev);
      const z = Math.sin(ang) * Math.cos(elev);
      particles.push({x, y, z, age: i / 40});
   }
}

export function update(dt) {
   t += dt;
   if (errors.length > 0) return;
   for (const p of particles) {
      p.age = (p.age + dt * 0.3) % 1.0;
   }
}

export function draw() {
   cls(rgba8(4, 6, 18, 255));
   printBold('643 BATCH 49', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // rotating sphere of dots using rotateVec2 + scaleVec3
   const cx = 200, cy = 180;
   for (const p of particles) {
      const rv = rotateVec2(p.x, p.z, t * 0.8);
      const sx = cx + Math.floor(rv.x * 80);
      const sy = cy + Math.floor(p.y * 60);
      const depth = 0.5 + (rv.y + 1) * 0.25;
      pset(sx, sy, hslColor(Math.floor(p.age * 360), 0.8, 0.4 + depth * 0.3, 220));
   }

   // lerpVec3 trail
   const start = {x: 350, y: 80, z: 0};
   const end   = {x: 600, y: 300, z: 0};
   for (let i = 0; i < 20; i++) {
      const tv = i / 19;
      const lv = lerpVec3(start.x, start.y, start.z, end.x, end.y, end.z, tv);
      const col = hslColor(Math.floor(tv * 200), 0.8, 0.5, 200);
      circle(Math.floor(lv.x), Math.floor(lv.y), 3, col, true);
   }

   // cross product indicator
   const cr = crossVec3(1, 0, 0, 0, 1, 0);
   print('X cross Y = Z:' + cr.z.toFixed(1), 4, 300, rgba8(180, 200, 255, 200));

   // stick readout
   const lx = leftStickX(), ly = leftStickY();
   const ry = rightStickY();
   print('L(' + lx.toFixed(1) + ',' + ly.toFixed(1) + ') RY:' + ry.toFixed(1),
         4, 318, rgba8(160, 200, 160, 180));

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
