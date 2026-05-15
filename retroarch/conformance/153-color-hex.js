// Conformance cart 153: colorToHex / hexToColor — hex string I/O.

let errors = [];

export function init() {
   if (typeof colorToHex !== 'function') { errors.push('colorToHex-missing'); return; }
   if (typeof hexToColor !== 'function') { errors.push('hexToColor-missing'); return; }

   const red = rgba8(255, 0, 0, 255);
   const hex = colorToHex(red);
   if (hex !== '#ff0000') errors.push('colorToHex-red: ' + hex);

   const white = hexToColor('#ffffff');
   if (colorR(white) !== 255) errors.push('hexToColor-R');
   if (colorG(white) !== 255) errors.push('hexToColor-G');
   if (colorB(white) !== 255) errors.push('hexToColor-B');

   // Round-trip
   const orig = rgba8(18, 200, 100, 255);
   const rt = hexToColor(colorToHex(orig));
   if (colorR(rt) !== 18)  errors.push('rt-R');
   if (colorG(rt) !== 200) errors.push('rt-G');
   if (colorB(rt) !== 100) errors.push('rt-B');
}

export function update(dt) {}

export function draw() {
   cls(rgba8(8, 10, 18, 255));
   print('153 COLOR HEX', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   const swatches = ['#ff0000','#00ff00','#0000ff','#ffff00','#ff00ff','#00ffff','#ffffff'];
   for (let i = 0; i < swatches.length; i++) {
      const c = hexToColor(swatches[i]);
      rectfill(30 + i * 38, 60, 66 + i * 38, 100, c);
      print(swatches[i].slice(1, 3), 32 + i * 38, 104, rgba8(200, 200, 200, 255));
   }
   print('colorToHex(rgba8(255,0,0,255)) = ' + colorToHex(rgba8(255, 0, 0, 255)), 8, 124, rgba8(180, 220, 255, 255));
   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
