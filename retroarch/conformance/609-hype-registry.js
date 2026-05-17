// Conformance cart 609: hypeRegister, hypeUnregister, hypeUpdate, hypeReset.

let errors = [];
let osc = null;
let fired = 0;

export function init() {
   const needed = ['hypeRegister', 'hypeUnregister', 'hypeUpdate', 'hypeReset'];
   for (const f of needed) {
      if (typeof globalThis[f] !== 'function') errors.push(f + '-missing');
   }
   if (errors.length > 0) return;

   // createTimeTrigger / createOscillator must exist (Batch 44/45)
   if (typeof globalThis['createTimeTrigger'] !== 'function') errors.push('createTimeTrigger-missing');
   if (typeof globalThis['createOscillator']  !== 'function') errors.push('createOscillator-missing');
   if (errors.length > 0) return;

   // register an oscillator and a timer
   osc = createOscillator(0, 1, 1.0);
   hypeRegister(osc);
   const timer = createTimeTrigger(0.1);
   hypeRegister(timer);

   // hypeUpdate advances both by 0.05s — no crash is enough
   hypeUpdate(0.05);
   hypeUpdate(0.05);

   // hypeUnregister removes the timer
   hypeUnregister(timer);

   // hypeReset clears everything without crash
   hypeReset();

   // re-register osc after reset
   osc = createOscillator(0, 1, 1.0);
   hypeRegister(osc);
}

export function update(dt) {
   if (errors.length > 0) return;
   hypeUpdate(dt);
   if (osc) {
      const v = osc.value;
      if (typeof v === 'number') fired++;
   }
}

export function draw() {
   cls(rgba8(5, 8, 22, 255));
   print('609 HYPE REGISTRY', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // draw oscillator value as bar
   if (osc) {
      const v = (osc.value !== undefined) ? osc.value : 0;
      const w = Math.floor((v + 1) * 0.5 * 300);
      rectfill(20, 80, 20 + w, 100, rgba8(80, 200, 255, 255));
      rectfill(20, 80, 320, 100, rgba8(0, 0, 0, 0));
      rectfill(20, 80, 20 + w, 100, rgba8(80, 200, 255, 255));
      print('osc value', 20, 105, rgba8(180, 180, 220, 200));
   }

   print('fired frames: ' + fired, 20, 130, rgba8(200, 200, 100, 200));
   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
