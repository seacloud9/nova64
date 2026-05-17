// Conformance cart 549: createOscillator, tickOscillator, createTimeTrigger,
//                        tickTimeTrigger, lerpVec2, addVec2, TWO_PI, HALF_PI, QUARTER_PI.

let errors = [];
let osc, tt;
let t = 0;
let fired = 0;

export function init() {
   const needed = ['createOscillator', 'tickOscillator', 'createTimeTrigger',
                   'tickTimeTrigger', 'lerpVec2', 'addVec2'];
   for (const f of needed) {
      if (typeof globalThis[f] !== 'function') errors.push(f + '-missing');
   }
   if (typeof TWO_PI !== 'number') errors.push('TWO_PI-missing');
   if (typeof HALF_PI !== 'number') errors.push('HALF_PI-missing');
   if (typeof QUARTER_PI !== 'number') errors.push('QUARTER_PI-missing');
   if (errors.length > 0) return;

   // Verify constants
   if (Math.abs(TWO_PI - Math.PI * 2) > 0.0001) errors.push('TWO_PI-wrong');
   if (Math.abs(HALF_PI - Math.PI / 2) > 0.0001) errors.push('HALF_PI-wrong');

   osc = createOscillator({ speed: 2, min: 10, max: 90, waveform: 'sin' });
   if (!osc || typeof osc.value !== 'number') errors.push('osc-bad');

   tt = createTimeTrigger({ interval: 1.0, repeat: true });
   if (!tt || typeof tt.elapsed !== 'number') errors.push('tt-bad');

   // lerpVec2 smoke test
   const v = lerpVec2(0, 0, 100, 100, 0.5);
   if (Math.abs(v.x - 50) > 0.01 || Math.abs(v.y - 50) > 0.01) errors.push('lerpVec2-wrong');

   // addVec2 smoke test
   const w = addVec2(10, 20, 5, 8);
   if (w.x !== 15 || w.y !== 28) errors.push('addVec2-wrong');
}

export function update(dt) {
   if (errors.length > 0) return;
   t += dt;
   tickOscillator(osc, dt);
   if (tickTimeTrigger(tt, dt)) fired++;
}

export function draw() {
   cls(rgba8(6, 8, 22, 255));
   print('549 OSC TRIGGER VEC', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Constants bar
   const piBarW = Math.floor(remap(TWO_PI, 0, 7, 0, 200));
   rectfill(20, 30, 20 + piBarW, 42, rgba8(100, 180, 255, 200));
   print('TWO_PI=' + Math.floor(TWO_PI * 1000) / 1000, 230, 32, rgba8(180, 220, 255, 255));

   // Oscillator sine wave
   for (let xi = 0; xi < 400; xi++) {
      const phase = (xi / 400) * TWO_PI;
      const v = 50 + Math.sin(phase) * 40;
      pset(20 + xi, Math.floor(120 - v + 50), rgba8(80, 200, 255, 255));
   }
   // Current oscillator value marker
   const ov = osc.value;
   rectfill(20, 150, 20 + Math.floor(ov * 4), 162, rgba8(255, 220, 60, 255));
   print('osc: ' + Math.floor(ov), 440, 152, rgba8(200, 220, 255, 255));

   // TimeTrigger fire counter
   print('fired: ' + fired, 20, 180, rgba8(200, 80, 255, 255));

   // lerpVec2 animated interpolation
   const lv = lerpVec2(100, 220, 500, 220, pulse(t, 0.5));
   pset(Math.floor(lv.x), Math.floor(lv.y), rgba8(255, 80, 80, 255));
   rectfill(Math.floor(lv.x)-3, Math.floor(lv.y)-3, Math.floor(lv.x)+3, Math.floor(lv.y)+3,
            rgba8(255, 80, 80, 255));

   // addVec2
   const av = addVec2(200, 260, 40, 20);
   rectfill(Math.floor(av.x), Math.floor(av.y), Math.floor(av.x)+8, Math.floor(av.y)+8,
            rgba8(80, 255, 120, 255));

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
