// Conformance cart 142: every(n), frameCount(), sinOsc(hz), cosOsc(hz).

let errors = [];

export function init() {
   if (typeof every      !== 'function') { errors.push('every-missing'); return; }
   if (typeof frameCount !== 'function') { errors.push('frameCount-missing'); return; }
   if (typeof sinOsc     !== 'function') { errors.push('sinOsc-missing'); return; }
   if (typeof cosOsc     !== 'function') { errors.push('cosOsc-missing'); return; }

   // frameCount returns a number
   const fc = frameCount();
   if (typeof fc !== 'number') errors.push('frameCount-not-number');

   // every(1) is always true
   if (!every(1)) errors.push('every-1-false');

   // sinOsc/cosOsc return numbers in [-1,1]
   const sv = sinOsc(1);
   const cv = cosOsc(1);
   if (typeof sv !== 'number') errors.push('sinOsc-not-number');
   if (typeof cv !== 'number') errors.push('cosOsc-not-number');
   if (sv < -1.01 || sv > 1.01) errors.push('sinOsc-range');
   if (cv < -1.01 || cv > 1.01) errors.push('cosOsc-range');
}

export function update(dt) {}

export function draw() {
   cls(rgba8(8, 10, 18, 255));
   print('142 FRAME UTILS', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Draw sin/cos bars
   const cx = 160, cy = 120, radius = 50;
   const sv = sinOsc(1), cv = cosOsc(1);
   circ(cx, cy, radius, rgba8(60, 80, 120, 255));
   // sin bar (vertical)
   const sh = (sv + 1) * 0.5 * radius;
   rectfill(cx - 12, cy - (int)(sh), cx - 4, cy + radius, rgba8(255, 100, 80, 255));
   // cos bar (horizontal)
   const cw = (cv + 1) * 0.5 * radius;
   rectfill(cx - radius, cy + 4, cx - radius + (int)(cw), cy + 12, rgba8(80, 180, 255, 255));
   printCentered('sin/cos oscillators', cx, 185, rgba8(180, 200, 255, 255));
   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}

function int(v) { return Math.floor(v); }
