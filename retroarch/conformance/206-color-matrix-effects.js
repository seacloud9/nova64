// Conformance cart 206: colorMatrix effects showcase (sepia, invert, channel-swap).

let errors = [];

export function init() {
   if (typeof colorMatrix !== 'function') { errors.push('colorMatrix-missing'); return; }
}

export function update(dt) {}

export function draw() {
   cls(rgba8(8, 10, 18, 255));
   print('206 COLOR MATRIX EFFECTS', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Source colors
   const palette = [
      rgba8(220, 80, 60, 255), rgba8(80, 200, 80, 255), rgba8(60, 100, 240, 255),
      rgba8(220, 200, 60, 255), rgba8(180, 80, 220, 255), rgba8(60, 200, 220, 255),
   ];

   // Matrices to apply
   const mats = [
      { name: 'ident',   m: [1,0,0, 0,1,0, 0,0,1] },
      { name: 'sepia',   m: [0.393,0.769,0.189, 0.349,0.686,0.168, 0.272,0.534,0.131] },
      { name: 'cool',    m: [0.7,0.1,0.2, 0.0,0.9,0.1, 0.1,0.1,1.1] },
      { name: 'warm',    m: [1.2,0.1,0.0, 0.1,1.0,0.0, 0.0,0.1,0.8] },
      { name: 'invert',  m: [-1,0,0, 0,-1,0, 0,0,-1] },  // note: needs +255 offset; shows truncation
   ];

   for (let mi = 0; mi < mats.length; mi++) {
      for (let ci = 0; ci < palette.length; ci++) {
         const c = colorMatrix(palette[ci], mats[mi].m);
         const x = 20 + ci * 88, y = 50 + mi * 28;
         rectfill(x, y, x + 76, y + 20, c);
      }
      print(mats[mi].name, 552, 55 + mi * 28, rgba8(140, 180, 220, 255));
   }

   print('color matrices: ident/sepia/cool/warm/invert', 8, 200, rgba8(160, 200, 240, 255));
   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
