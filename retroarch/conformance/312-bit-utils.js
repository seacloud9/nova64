// Conformance cart 312: bitCount, nextPow2, formatBytes, stagger.

let errors = [];

export function init() {
   if (typeof bitCount    !== 'function') { errors.push('bitCount-missing');    return; }
   if (typeof nextPow2    !== 'function') { errors.push('nextPow2-missing');    return; }
   if (typeof formatBytes !== 'function') { errors.push('formatBytes-missing'); return; }
   if (typeof stagger     !== 'function') { errors.push('stagger-missing');     return; }

   // bitCount
   if (bitCount(0)   !== 0) errors.push('bitCount(0):' + bitCount(0));
   if (bitCount(7)   !== 3) errors.push('bitCount(7):' + bitCount(7));
   if (bitCount(255) !== 8) errors.push('bitCount(255):' + bitCount(255));

   // nextPow2
   if (nextPow2(1) !== 1)   errors.push('nextPow2(1):' + nextPow2(1));
   if (nextPow2(5) !== 8)   errors.push('nextPow2(5):' + nextPow2(5));
   if (nextPow2(8) !== 8)   errors.push('nextPow2(8):' + nextPow2(8));
   if (nextPow2(9) !== 16)  errors.push('nextPow2(9):' + nextPow2(9));

   // formatBytes
   const fb = formatBytes(1536);
   if (fb.indexOf('KB') < 0) errors.push('formatBytes-kb:' + fb);
   const fmb = formatBytes(2097152);
   if (fmb.indexOf('MB') < 0) errors.push('formatBytes-mb:' + fmb);

   // stagger: index 0 should start earlier than index 4
   const s0 = stagger(0, 5, 0.5, 0.4);
   const s4 = stagger(4, 5, 0.5, 0.4);
   if (s0 <= s4) errors.push('stagger-order');
}

export function update(dt) {}

export function draw() {
   cls(rgba8(6, 8, 14, 255));
   print('312 BIT UTILS', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // bitCount visual — 0..255 bar chart
   for (let n = 0; n < 256; n++) {
      const bc = bitCount(n);
      const xv = 20 + n * 2;
      const hh = bc * 10;
      rectfill(xv, 200 - hh, xv + 1, 200, colorFromHSL(n * 1.4, 0.7, 0.5));
   }
   print('bitCount 0-255', 20, 205, rgba8(160, 160, 200, 200));

   // nextPow2 table
   const vals = [1, 2, 3, 5, 8, 9, 17, 33, 100];
   for (let i = 0; i < vals.length; i++) {
      const np = nextPow2(vals[i]);
      print(vals[i] + '->' + np, 20 + i * 68, 225, rgba8(100, 220, 255, 255));
   }

   // formatBytes display
   const sizes = [512, 2048, 1048576, 536870912];
   for (let i = 0; i < sizes.length; i++) {
      print(formatBytes(sizes[i]), 20, 245 + i * 12, rgba8(180, 255, 180, 255));
   }

   // stagger animation bar (fixed t=0.7 for determinism)
   const t = 0.7;
   for (let i = 0; i < 12; i++) {
      const sv = stagger(i, 12, t, 0.5);
      const hh = (sv * 60) | 0;
      rectfill(400 + i * 16, 300 - hh, 413 + i * 16, 300, colorFromHSL(i * 30, 0.8, 0.55));
   }
   print('stagger', 400, 305, rgba8(160, 160, 200, 200));

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
