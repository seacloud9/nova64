// Conformance cart 34: analog stick and trigger input
// Expects harness --analog-lx 16383 --analog-ly -8192 --trigger-l 16383

let errors = [];

export function init() {
   if (typeof axis    !== 'function') throw new Error('axis missing');
   if (typeof trigger !== 'function') throw new Error('trigger missing');
}

export function update() {
   const lx = axis('left',  'x');
   const ly = axis('left',  'y');
   const rx = axis('right', 'x');
   const ry = axis('right', 'y');
   const tl = trigger('left');
   const tr = trigger('right');

   if (typeof lx !== 'number') { errors.push('lx not number'); return; }

   // With --analog-lx 16383: lx ≈ 0.5 (16383/32767)
   if (lx < 0.49 || lx > 0.51) errors.push('lx out of range:' + lx.toFixed(3));
   // With --analog-ly -8192: ly ≈ -0.25
   if (ly < -0.26 || ly > -0.24) errors.push('ly out of range:' + ly.toFixed(3));
   // rx, ry should be 0
   if (Math.abs(rx) > 0.01) errors.push('rx not zero:' + rx);
   if (Math.abs(ry) > 0.01) errors.push('ry not zero:' + ry);
   // With --trigger-l 16383: tl ≈ 0.5
   if (tl < 0.49 || tl > 0.51) errors.push('tl out of range:' + tl.toFixed(3));
   // tr should be 0
   if (Math.abs(tr) > 0.01) errors.push('tr not zero:' + tr);
}

export function draw() {
   cls(rgba8(10, 14, 24, 255));
   if (errors.length === 0) {
      print('34 ANALOG ok', 4, 4, rgba8(80, 255, 120, 255));
   } else {
      print('34 ANALOG FAIL', 4, 4, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 14, rgba8(255, 120, 120, 255));
   }
}
