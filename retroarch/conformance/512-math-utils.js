// Conformance cart 512: dist, dist3d, remap, deg2rad, rad2deg, pulse.

let errors = [];

export function init() {
   const needed = ['dist', 'dist3d', 'remap', 'deg2rad', 'rad2deg', 'pulse'];
   for (const f of needed) {
      if (typeof globalThis[f] !== 'function') errors.push(f + '-missing');
   }
}

export function update(dt) {}

export function draw() {
   cls(rgba8(6, 6, 20, 255));
   print('512 MATH UTILS', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // dist — verify against known values
   const d1 = dist(0, 0, 3, 4);              // 5.0
   const d2 = dist(10, 10, 10, 10);          // 0.0
   const distOk = Math.abs(d1 - 5.0) < 0.01 && Math.abs(d2) < 0.01;
   rectfill(20, 30, 80, 50, distOk ? rgba8(80, 255, 80, 255) : rgba8(255, 60, 60, 255));

   // dist3d — 3D pythagorean
   const d3 = dist3d(0, 0, 0, 1, 2, 2);     // 3.0
   const dist3Ok = Math.abs(d3 - 3.0) < 0.01;
   rectfill(90, 30, 150, 50, dist3Ok ? rgba8(80, 255, 80, 255) : rgba8(255, 60, 60, 255));

   // remap — map 0.5 in [0,1] to [0,100] = 50
   const r1 = remap(0.5, 0, 1, 0, 100);
   const r2 = remap(5, 0, 10, -1, 1);       // 0.0
   const remapOk = Math.abs(r1 - 50) < 0.01 && Math.abs(r2) < 0.01;
   rectfill(160, 30, 220, 50, remapOk ? rgba8(80, 255, 80, 255) : rgba8(255, 60, 60, 255));

   // deg2rad / rad2deg
   const rad = deg2rad(180);
   const deg = rad2deg(Math.PI);
   const angOk = Math.abs(rad - Math.PI) < 0.001 && Math.abs(deg - 180) < 0.01;
   rectfill(230, 30, 290, 50, angOk ? rgba8(80, 255, 80, 255) : rgba8(255, 60, 60, 255));

   // pulse — oscillates between 0 and 1
   const p1 = pulse(0, 1);        // sin(0) → 0.5
   const p2 = pulse(0.25, 1);     // sin(PI/2) → 1.0
   const pulseOk = Math.abs(p1 - 0.5) < 0.01 && Math.abs(p2 - 1.0) < 0.01;
   rectfill(300, 30, 360, 50, pulseOk ? rgba8(80, 255, 80, 255) : rgba8(255, 60, 60, 255));

   // Visual: distance field (gradient based on dist from centre)
   const cx = 480, cy = 100;
   for (let dy = -60; dy <= 60; dy += 2) {
      for (let dx = -80; dx <= 80; dx += 2) {
         const d = dist(0, 0, dx, dy);
         const t = Math.min(d / 80, 1);
         pset(cx + dx, cy + dy, lerpColor(rgba8(255, 200, 60, 255), rgba8(20, 20, 80, 255), t));
      }
   }

   // Pulse wave strip
   for (let xi = 0; xi < 560; xi++) {
      const t = xi / 560;
      const v = pulse(t, 4);
      pset(20 + xi, 180, hsb(remap(v, 0, 1, 180, 360), 0.9, 0.9, 255));
   }

   // remap used to drive color hue strip
   for (let xi = 0; xi < 560; xi++) {
      const hue = remap(xi, 0, 560, 0, 360);
      pset(20 + xi, 195, hsb(hue, 0.8, 0.8, 255));
   }

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
