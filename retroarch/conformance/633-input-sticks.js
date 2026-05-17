// Conformance cart 633: rightStickY, leftStickX, leftStickY.

let errors = [];

export function init() {
   const needed = ['rightStickY', 'leftStickX', 'leftStickY'];
   for (const f of needed) {
      if (typeof globalThis[f] !== 'function') errors.push(f + '-missing');
   }
   if (errors.length > 0) return;

   // All three must return numbers (0 when no controller)
   const rsy = rightStickY();
   if (typeof rsy !== 'number') errors.push('rightStickY-type');
   const lsx = leftStickX();
   if (typeof lsx !== 'number') errors.push('leftStickX-type');
   const lsy = leftStickY();
   if (typeof lsy !== 'number') errors.push('leftStickY-type');

   // Values must be in [-1, 1]
   if (rsy < -1 || rsy > 1) errors.push('rightStickY-range');
   if (lsx < -1 || lsx > 1) errors.push('leftStickX-range');
   if (lsy < -1 || lsy > 1) errors.push('leftStickY-range');
}

export function update(dt) {}

export function draw() {
   cls(rgba8(5, 8, 22, 255));
   print('633 INPUT STICKS', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   const lx = leftStickX(), ly = leftStickY();
   const rx = rightStickX(), ry = rightStickY();

   // left stick circle indicator
   const lox = 160, loy = 160, rad = 50;
   circle(lox, loy, rad, rgba8(60,80,130,200), false);
   const ldx = Math.floor(lx * rad), ldy = Math.floor(ly * rad);
   line(lox, loy, lox+ldx, loy+ldy, rgba8(80,200,255,200));
   circle(lox+ldx, loy+ldy, 5, rgba8(80,200,255,255), true);
   print('L stick', lox-20, loy+rad+8, rgba8(180,180,220,200));

   // right stick circle indicator
   const rox = 400, roy = 160;
   circle(rox, roy, rad, rgba8(60,80,130,200), false);
   const rdx = Math.floor(rx * rad), rdy = Math.floor(ry * rad);
   line(rox, roy, rox+rdx, roy+rdy, rgba8(255,160,60,200));
   circle(rox+rdx, roy+rdy, 5, rgba8(255,160,60,255), true);
   print('R stick', rox-20, roy+rad+8, rgba8(180,180,220,200));

   // numeric readout
   print('L(' + lx.toFixed(2) + ',' + ly.toFixed(2) + ')', 20, 250, rgba8(160,200,160,200));
   print('R(' + rx.toFixed(2) + ',' + ry.toFixed(2) + ')', 300, 250, rgba8(200,160,80,200));

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
