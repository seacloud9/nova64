// Conformance cart 319: batch 22 APIs combined showcase.

let errors = [];

export function init() {
   const needed = ['distanceXY', 'lineIntersect', 'drawPentagram', 'fillPentagram',
                   'drawCrescent', 'fillCrescent', 'screenBloom', 'colorComplement',
                   'bitCount', 'nextPow2', 'formatBytes', 'stagger'];
   for (const f of needed) {
      if (typeof globalThis[f] !== 'function') errors.push(f + '-missing');
   }
}

export function update(dt) {}

export function draw() {
   cls(rgba8(4, 4, 12, 255));
   printBold('319 BATCH 22', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Star field
   for (let i = 0; i < 60; i++) {
      const sx = (i * 211) % 620 + 10;
      const sy = (i * 137) % 340 + 10;
      pset(sx, sy, rgba8(200, 220, 255, (i % 3 === 0) ? 255 : 100));
   }

   // Crescent moons
   fillCrescent(80,  180, 55, 18, rgba8(230, 220, 140, 255));
   fillCrescent(200, 180, 45, 14, rgba8(180, 200, 255, 255));
   drawCrescent(80,  180, 55, 18, rgba8(255, 240, 180, 160));
   drawCrescent(200, 180, 45, 14, rgba8(140, 170, 255, 160));

   // Pentagrams with complement colors
   const pc = rgba8(220, 60, 60, 255);
   fillPentagram(330, 180, 55, 0, pc);
   drawPentagram(330, 180, 55, 0, colorComplement(pc));
   fillPentagram(440, 180, 45, Math.PI / 5, rgba8(60, 120, 220, 255));
   drawPentagram(440, 180, 45, Math.PI / 5, rgba8(255, 200, 80, 200));

   // Distance ring
   const dcx = 560, dcy = 180;
   for (let r2 = 20; r2 <= 60; r2 += 20) {
      for (let ang = 0; ang < 360; ang += 5) {
         const a2 = ang * Math.PI / 180;
         const px = dcx + Math.cos(a2) * r2;
         const py = dcy + Math.sin(a2) * r2;
         const dv = distanceXY(dcx, dcy, px, py);
         pset(px, py, colorFromHSL(dv * 3, 0.8, 0.6));
      }
   }

   // Line intersect demo
   const lns = [[350, 290, 500, 350], [350, 350, 500, 290], [360, 300, 490, 340]];
   const lcols = [rgba8(100, 200, 255, 200), rgba8(255, 150, 80, 200), rgba8(100, 255, 150, 200)];
   for (let i = 0; i < lns.length; i++) line(lns[i][0], lns[i][1], lns[i][2], lns[i][3], lcols[i]);
   for (let i = 0; i < lns.length; i++) {
      for (let j = i + 1; j < lns.length; j++) {
         const res = lineIntersect(lns[i][0], lns[i][1], lns[i][2], lns[i][3],
                                   lns[j][0], lns[j][1], lns[j][2], lns[j][3]);
         if (res[2]) circfill(res[0], res[1], 3, rgba8(255, 255, 80, 255));
      }
   }

   // bitCount bar (mini)
   for (let n = 0; n < 64; n++) {
      const bc = bitCount(n);
      rectfill(20 + n * 4, 350 - bc * 5, 23 + n * 4, 350, colorFromHSL(n * 2.8, 0.7, 0.5));
   }

   // Bloom on left pentagrams area
   setClip(20, 130, 250, 100);
   screenBloom(4, 0.55, 0.6);
   clearClip();

   // formatBytes + nextPow2 text strip
   const szs = [1024, 524288, 1073741824];
   for (let i = 0; i < szs.length; i++) {
      print(formatBytes(szs[i]), 560, 280 + i * 12, rgba8(180, 255, 180, 200));
   }
   print('np2(100)=' + nextPow2(100), 560, 320, rgba8(100, 200, 255, 200));

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
