// Conformance cart 250: sinD, cosD, atan2D, degToRad, radToDeg.

let errors = [];

export function init() {
   if (typeof sinD     !== 'function') { errors.push('sinD-missing');     return; }
   if (typeof cosD     !== 'function') { errors.push('cosD-missing');     return; }
   if (typeof atan2D   !== 'function') { errors.push('atan2D-missing');   return; }
   if (typeof degToRad !== 'function') { errors.push('degToRad-missing'); return; }
   if (typeof radToDeg !== 'function') { errors.push('radToDeg-missing'); return; }

   if (Math.abs(sinD(90) - 1) > 0.001)        errors.push('sinD(90): ' + sinD(90));
   if (Math.abs(cosD(0)  - 1) > 0.001)        errors.push('cosD(0): '  + cosD(0));
   if (Math.abs(cosD(180) + 1) > 0.001)       errors.push('cosD(180): '+ cosD(180));
   if (Math.abs(atan2D(1,0) - 90) > 0.1)      errors.push('atan2D: '   + atan2D(1,0));
   if (Math.abs(degToRad(180) - Math.PI) > 0.001) errors.push('degToRad: ' + degToRad(180));
   if (Math.abs(radToDeg(Math.PI) - 180) > 0.1)  errors.push('radToDeg: ' + radToDeg(Math.PI));
}

export function update(dt) {}

export function draw() {
   cls(rgba8(8, 10, 18, 255));
   print('250 TRIG HELPERS', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // sinD/cosD circle
   const cx = 120, cy = 180, r = 80;
   for (let deg = 0; deg < 360; deg += 3) {
      const x = cx + cosD(deg)*r;
      const y = cy + sinD(deg)*r;
      pset(x|0, y|0, rgba8(100+cosD(deg)*100|0, 180, 100+sinD(deg)*100|0, 255));
   }
   // Spokes at cardinal degrees
   for (let deg = 0; deg < 360; deg += 45) {
      line(cx, cy,
               cx + (cosD(deg)*r*0.85)|0,
               cy + (sinD(deg)*r*0.85)|0,
               rgba8(200, 200, 60, 180));
   }

   // atan2D fan arrows labeled with angle
   const cx2 = 400, cy2 = 180;
   const pts = [[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1],[0,-1],[1,-1]];
   for (const [px,py] of pts) {
      const deg = atan2D(py, px);
      const col = rgba8(100+(deg/360*155)|0, 180, 220, 255);
      line(cx2, cy2, cx2+px*60, cy2+py*60, col);
   }

   // degToRad / radToDeg bar
   for (let i = 0; i < 10; i++) {
      const d = i * 36;
      const rr = degToRad(d);
      const back = radToDeg(rr);
      const ok = Math.abs(back - d) < 0.01;
      rectfill(20+i*58, 300, 72+i*58, 340, ok ? rgba8(40,160,80,255) : rgba8(200,40,40,255));
   }
   print('degToRad/radToDeg', 20, 346, rgba8(140,180,220,255));

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
