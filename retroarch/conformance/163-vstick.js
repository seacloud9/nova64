// Conformance cart 163: vstickX / vstickY / vstickAngle / vstickLength.

let errors = [];

export function init() {
   if (typeof vstickX      !== 'function') { errors.push('vstickX-missing');      return; }
   if (typeof vstickY      !== 'function') { errors.push('vstickY-missing');      return; }
   if (typeof vstickAngle  !== 'function') { errors.push('vstickAngle-missing');  return; }
   if (typeof vstickLength !== 'function') { errors.push('vstickLength-missing'); return; }

   const x = vstickX();
   const y = vstickY();
   const a = vstickAngle();
   const l = vstickLength();

   if (typeof x !== 'number') errors.push('vstickX-not-number');
   if (typeof y !== 'number') errors.push('vstickY-not-number');
   if (typeof a !== 'number') errors.push('vstickAngle-not-number');
   if (typeof l !== 'number') errors.push('vstickLength-not-number');
   if (l < 0 || l > 1.42) errors.push('vstickLength-range: ' + l);
}

export function update(dt) {}

export function draw() {
   cls(rgba8(8, 10, 18, 255));
   print('163 VSTICK', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   const cx = 160, cy = 140, r = 50;
   circ(cx, cy, r, rgba8(60, 80, 140, 255));

   const vx = vstickX();
   const vy = vstickY();
   const dl = vstickLength();
   const knobX = cx + Math.round(vx * r);
   const knobY = cy + Math.round(vy * r);
   line(cx, cy, knobX, knobY, rgba8(100, 200, 255, 255));
   circfill(knobX, knobY, 6, rgba8(200, 230, 255, 255));

   print('x=' + vx.toFixed(2) + ' y=' + vy.toFixed(2), 8, 50, rgba8(180, 220, 255, 255));
   print('angle=' + vstickAngle().toFixed(1) + ' len=' + dl.toFixed(2), 8, 62, rgba8(180, 220, 255, 255));
   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
