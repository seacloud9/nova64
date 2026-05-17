// Conformance cart 547: batch 41 combined showcase.

let errors = [];
let sys;
let t = 0;
let spawnTimer = 0;

export function init() {
   const needed = ['drawTriangle', 'drawGlowText', 'drawGlowTextCentered',
                   'drawPulsingText', 'tristrip', 'drawFloatingTexts',
                   'ftsSpawn', 'ftsUpdate'];
   for (const f of needed) {
      if (typeof globalThis[f] !== 'function') errors.push(f + '-missing');
   }
   if (errors.length > 0) return;

   sys = { _texts: [] };
   ftsSpawn(sys, 'NOVA64', 300, 180, { duration: 3.0, riseSpeed: 20, color: rgba8(255, 220, 60, 255) });
   ftsSpawn(sys, 'BATCH 41', 200, 220, { duration: 3.0, riseSpeed: 15, color: rgba8(80, 200, 255, 255) });
}

export function update(dt) {
   if (errors.length > 0) return;
   t += dt;
   spawnTimer += dt;
   ftsUpdate(sys, dt);
   if (spawnTimer >= 1.0) {
      spawnTimer = 0;
      const labels = ['+100', 'HIT!', 'COMBO', 'CRIT!', '+50'];
      const colors = [rgba8(80,255,80,255), rgba8(255,80,80,255), rgba8(255,220,60,255),
                      rgba8(255,100,255,255), rgba8(80,255,200,255)];
      const idx = Math.floor(t * 3) % 5;
      ftsSpawn(sys, labels[idx], 100 + Math.floor(t * 47) % 400, 200,
               { duration: 1.2, riseSpeed: 35, color: colors[idx] });
   }
}

export function draw() {
   cls(rgba8(4, 6, 18, 255));
   printBold('547 BATCH 41', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Triangle showcase — rotating fan
   for (let i = 0; i < 6; i++) {
      const a0 = deg2rad(i * 60 + t * 20);
      const a1 = deg2rad((i + 1) * 60 + t * 20);
      const r  = 50;
      const cx = 100, cy = 120;
      drawTriangle(cx, cy,
                   cx + Math.floor(r * Math.cos(a0)), cy + Math.floor(r * Math.sin(a0)),
                   cx + Math.floor(r * Math.cos(a1)), cy + Math.floor(r * Math.sin(a1)),
                   lerpColor(rgba8(80,200,255,180), rgba8(255,80,200,180), i/5), true);
   }

   // Tristrip — zigzag ribbon
   const pts = [];
   for (let i = 0; i <= 8; i++) {
      const rx = 200 + i * 40;
      const ry = 100 + (i % 2 === 0 ? 0 : 40);
      pts.push({x: rx, y: ry});
   }
   tristrip(pts, rgba8(80, 255, 120, 160));

   // Glow text row
   drawGlowText('GLOW', 20, 200, rgba8(255, 255, 255, 255), rgba8(100, 80, 255, 120));
   drawGlowTextCentered('CENTERED', 320, 200,
                        rgba8(255, 220, 60, 255), rgba8(200, 100, 0, 100));

   // Pulsing banner
   drawPulsingText('*** NOVA64 ***', 320, 240, rgba8(255, 200, 80, 255), t, 2, 60);

   // Floating text system
   drawFloatingTexts(sys);
   print('texts: ' + sys._texts.length, 4, 310, rgba8(160, 160, 220, 255));

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
