// Conformance cart 537: drawFloatingTexts, ftsSpawn, ftsUpdate.

let errors = [];
let sys;
let t = 0;

export function init() {
   const needed = ['drawFloatingTexts', 'ftsSpawn', 'ftsUpdate'];
   for (const f of needed) {
      if (typeof globalThis[f] !== 'function') errors.push(f + '-missing');
   }
   if (errors.length > 0) return;

   sys = { _texts: [] };
   ftsSpawn(sys, '+100', 200, 200, { duration: 2.0, riseSpeed: 40, color: rgba8(80, 255, 80, 255) });
   ftsSpawn(sys, 'OUCH!', 350, 150, { duration: 1.5, riseSpeed: 30, color: rgba8(255, 80, 80, 255) });
   ftsSpawn(sys, '+COMBO', 450, 220, { duration: 2.5, riseSpeed: 25, color: rgba8(255, 220, 60, 255) });

   if (!sys._texts || sys._texts.length !== 3) errors.push('spawn-count');
}

export function update(dt) {
   if (errors.length > 0) return;
   t += dt;
   ftsUpdate(sys, dt);
}

export function draw() {
   cls(rgba8(6, 10, 24, 255));
   print('537 FLOATING TXT', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Background
   rectfill(20, 100, 600, 200, rgba8(15, 18, 40, 255));

   // Draw floating texts
   drawFloatingTexts(sys);

   print('count: ' + sys._texts.length, 20, 310, rgba8(180, 180, 255, 255));
   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
