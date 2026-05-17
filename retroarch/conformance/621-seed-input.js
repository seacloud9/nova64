// Conformance cart 621: createSeedRNG, getSeedRNG, seedToTraits,
//                        exportSeedMetadata, mouseDown, mousePressed,
//                        gamepadAxis, gamepadConnected, rightStickX.

let errors = [];

export function init() {
   const needed = ['createSeedRNG', 'getSeedRNG', 'seedToTraits', 'exportSeedMetadata',
                   'mouseDown', 'mousePressed',
                   'gamepadAxis', 'gamepadConnected', 'rightStickX'];
   for (const f of needed) {
      if (typeof globalThis[f] !== 'function') errors.push(f + '-missing');
   }
   if (errors.length > 0) return;

   // createSeedRNG
   const rng = createSeedRNG(12345);
   if (!rng || typeof rng !== 'object') errors.push('createSeedRNG-null');

   // getSeedRNG — must return an object
   const rng2 = getSeedRNG();
   if (!rng2 || typeof rng2 !== 'object') errors.push('getSeedRNG-null');

   // seedToTraits — basic schema
   const schema = {color: ['red','green','blue'], size: ['small','big']};
   const traits = seedToTraits(99, schema);
   if (!traits || typeof traits !== 'object') errors.push('seedToTraits-null');
   if (!('color' in traits)) errors.push('seedToTraits-color');
   if (!('size'  in traits)) errors.push('seedToTraits-size');

   // exportSeedMetadata
   const meta = exportSeedMetadata(42, schema, {name: 'TestNFT'});
   if (!meta || typeof meta !== 'object') errors.push('exportSeedMetadata-null');
   if (meta.seed !== 42) errors.push('exportSeedMetadata-seed');
   if (!Array.isArray(meta.attributes)) errors.push('exportSeedMetadata-attributes');

   // input functions — just check they return the right type (no controller)
   const md = mouseDown();
   if (typeof md !== 'boolean') errors.push('mouseDown-type');
   const mp = mousePressed();
   if (typeof mp !== 'boolean') errors.push('mousePressed-type');
   const rx = rightStickX();
   if (typeof rx !== 'number') errors.push('rightStickX-type');
   const gc = gamepadConnected();
   if (typeof gc !== 'boolean') errors.push('gamepadConnected-type');
   const ax = gamepadAxis('leftX');
   if (typeof ax !== 'number') errors.push('gamepadAxis-leftX-type');
}

export function update(dt) {}

export function draw() {
   cls(rgba8(5, 8, 22, 255));
   print('621 SEED INPUT', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // seed RNG demo — scatter dots
   const rng = createSeedRNG(777);
   for (let i = 0; i < 60; i++) {
      const x = rng.next() * 500 + 20;
      const y = rng.next() * 200 + 50;
      pset(Math.floor(x), Math.floor(y), hslColor(i * 6, 0.8, 0.5, 220));
   }

   // traits display
   const schema = {rarity: ['common','rare','epic'], bg: ['dark','light']};
   const t = seedToTraits(12345, schema);
   print('rarity: ' + t.rarity, 20, 280, rgba8(200, 200, 255, 200));
   print('bg: ' + t.bg, 20, 292, rgba8(200, 200, 255, 200));

   // input state readout
   const md = mouseDown();
   const gaxis = gamepadAxis('rightX');
   print('mouse: ' + (md ? 'DOWN' : 'up'), 20, 310, rgba8(180, 220, 180, 200));
   print('rStickX: ' + gaxis.toFixed(2), 20, 322, rgba8(180, 220, 180, 200));
   print('pad: ' + (gamepadConnected() ? 'yes' : 'no'), 200, 310, rgba8(180, 220, 180, 200));

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
