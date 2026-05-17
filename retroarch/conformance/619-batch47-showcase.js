// Conformance cart 619: batch 47 combined showcase.
// beginCamera2D, endCamera2D, cam2DWorldToScreen, cam2DScreenToWorld,
// cam2DGetBounds, hypeRegister, hypeUpdate, hypeReset, Ease.

let errors = [];
let t = 0;
let osc = null;
let cam = {x: 0, y: 0};

export function init() {
   const needed = ['beginCamera2D', 'endCamera2D',
                   'cam2DWorldToScreen', 'cam2DScreenToWorld', 'cam2DGetBounds',
                   'hypeRegister', 'hypeUnregister', 'hypeUpdate', 'hypeReset'];
   for (const f of needed) {
      if (typeof globalThis[f] !== 'function') errors.push(f + '-missing');
   }
   if (typeof globalThis['Ease'] !== 'object' || !globalThis['Ease'])
      errors.push('Ease-missing');
   if (errors.length > 0) return;

   osc = createOscillator(0, 1, 2.0);
   hypeRegister(osc);
}

export function update(dt) {
   t += dt;
   if (errors.length > 0) return;
   hypeUpdate(dt);
   // animate camera x using Ease.outSine over a 3s cycle
   const tc = frac(t / 3.0);
   cam.x = Math.floor(Ease.outSine(tc < 0.5 ? tc * 2 : (1 - tc) * 2) * 80) - 40;
}

export function draw() {
   cls(rgba8(4, 6, 18, 255));
   printBold('619 BATCH 47', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // animated camera offset — draw a grid
   beginCamera2D(cam);
   for (let x = 0; x <= 640; x += 40) {
      line(x, 40, x, 200, rgba8(40, 60, 100, 180));
   }
   for (let y = 40; y <= 200; y += 40) {
      line(0, y, 640, y, rgba8(40, 60, 100, 180));
   }
   circle(320, 120, 12, rgba8(80, 200, 255, 255), true);
   endCamera2D();

   // show bounds
   const b = cam2DGetBounds(cam);
   print('L:' + Math.floor(b.left), 4, 210, rgba8(180, 220, 180, 200));

   // Ease curve strip
   for (let i = 0; i < 50; i++) {
      const tv = i / 49;
      const yv = Math.floor(Ease.inOutSine ? Ease.inOutSine(tv) * 60 : Ease.outSine(tv) * 60);
      pset(20 + i * 5, 290 - yv, hslColor(i * 5, 0.8, 0.5, 255));
   }
   print('ease curve', 20, 300, rgba8(200, 200, 255, 200));

   // hype oscillator bar
   if (osc) {
      const v = (osc.value !== undefined) ? osc.value : 0;
      const w = Math.floor((v + 1) * 0.5 * 200);
      rectfill(380, 280, 380 + w, 296, rgba8(255, 160, 60, 255));
   }
   print('osc bar', 380, 300, rgba8(200, 180, 100, 200));

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
