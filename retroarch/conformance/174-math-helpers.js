// Conformance cart 174: mapRange / inverseLerp / pingPong.

let errors = [];

export function init() {
   if (typeof mapRange    !== 'function') { errors.push('mapRange-missing');    return; }
   if (typeof inverseLerp !== 'function') { errors.push('inverseLerp-missing'); return; }
   if (typeof pingPong    !== 'function') { errors.push('pingPong-missing');    return; }

   // mapRange
   const v1 = mapRange(5, 0, 10, 0, 100);
   if (Math.abs(v1 - 50) > 1e-6) errors.push('mapRange-mid: ' + v1);
   const v2 = mapRange(0, 0, 10, 20, 40);
   if (Math.abs(v2 - 20) > 1e-6) errors.push('mapRange-lo: ' + v2);

   // inverseLerp
   const il = inverseLerp(0, 10, 5);
   if (Math.abs(il - 0.5) > 1e-6) errors.push('inverseLerp-mid: ' + il);
   const il2 = inverseLerp(0, 10, 0);
   if (Math.abs(il2 - 0.0) > 1e-6) errors.push('inverseLerp-lo: ' + il2);

   // pingPong
   const pp1 = pingPong(0.5, 1.0);
   if (Math.abs(pp1 - 0.5) > 1e-6) errors.push('pingPong-0.5: ' + pp1);
   const pp2 = pingPong(1.5, 1.0);
   if (Math.abs(pp2 - 0.5) > 1e-6) errors.push('pingPong-1.5: ' + pp2);
   const pp3 = pingPong(2.0, 1.0);
   if (Math.abs(pp3 - 0.0) > 1e-6) errors.push('pingPong-2.0: ' + pp3);
}

export function update(dt) {}

export function draw() {
   cls(rgba8(8, 10, 18, 255));
   print('174 MATH HELPERS', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   const c = rgba8(180, 220, 255, 255);
   print('mapRange(5,0,10,0,100)=' + mapRange(5,0,10,0,100).toFixed(1), 8, 40, c);
   print('inverseLerp(0,10,5)=' + inverseLerp(0,10,5).toFixed(2), 8, 52, c);

   // Animate pingPong
   const t = nova64.time();
   for (let i = 0; i < 40; i++) {
      const x = 10 + i * 7;
      const yBase = 130;
      const h = pingPong(t * 2 + i * 0.15, 40);
      rectfill(x, yBase - h, x + 5, yBase, rgba8(100, 180, 255, 255));
   }
   print('pingPong wave', 8, 145, c);
   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
