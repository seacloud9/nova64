// Conformance cart 148: bitmask ops — bitAnd/Or/Xor/Not/ShL/ShR/Test/Set/Clear/Toggle.

let errors = [];

export function init() {
   if (typeof bitAnd !== 'function') { errors.push('bitAnd-missing'); return; }

   if (bitAnd(0b1100, 0b1010) !== 0b1000) errors.push('bitAnd');
   if (bitOr (0b1100, 0b1010) !== 0b1110) errors.push('bitOr');
   if (bitXor(0b1100, 0b1010) !== 0b0110) errors.push('bitXor');
   if (bitNot(0) !== -1) errors.push('bitNot-0');
   if (bitShL(1, 3) !== 8)  errors.push('bitShL');
   if (bitShR(8, 3) !== 1)  errors.push('bitShR');
   if (!bitTest(7, 0))      errors.push('bitTest-0');
   if (!bitTest(7, 1))      errors.push('bitTest-1');
   if ( bitTest(4, 1))      errors.push('bitTest-not-set');
   if (bitSet(0, 3) !== 8)  errors.push('bitSet');
   if (bitClear(7, 1) !== 5) errors.push('bitClear');
   if (bitToggle(7, 1) !== 5) errors.push('bitToggle-on');
   if (bitToggle(5, 1) !== 7) errors.push('bitToggle-off');
}

export function update(dt) {}

export function draw() {
   cls(rgba8(8, 10, 18, 255));
   print('148 BIT OPS', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   const bits = [1, 1, 0, 0, 1, 0, 1, 0];
   for (let i = 0; i < 8; i++) {
      const c = bits[i] ? rgba8(80, 220, 80, 255) : rgba8(60, 60, 80, 255);
      rectfill(60 + i * 24, 80, 82 + i * 24, 102, c);
      printCentered(bits[i].toString(), 71 + i * 24, 87, rgba8(240, 240, 240, 255));
   }
   printCentered('0b11001010', 160, 112, rgba8(180, 200, 255, 255));
   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
