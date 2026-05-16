// Conformance cart 199: colorMatrix(c, m9).

let errors = [];

export function init() {
   if (typeof colorMatrix !== 'function') { errors.push('colorMatrix-missing'); return; }

   const red = rgba8(255, 0, 0, 255);

   // Identity matrix
   const ident = [1,0,0, 0,1,0, 0,0,1];
   const same = colorMatrix(red, ident);
   if (typeof same !== 'number') errors.push('colorMatrix-not-number');
   if (colorR(same) !== 255 || colorG(same) > 5) errors.push('identity-R: ' + colorR(same));

   // Swap R↔G: [0,1,0, 1,0,0, 0,0,1]
   const swapRG = colorMatrix(red, [0,1,0, 1,0,0, 0,0,1]);
   if (colorR(swapRG) > 5 || colorG(swapRG) < 250) errors.push('swap-RG: R=' + colorR(swapRG) + ' G=' + colorG(swapRG));
}

export function update(dt) {}

export function draw() {
   cls(rgba8(8, 10, 18, 255));
   print('199 COLOR MATRIX', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   const colors = [
      rgba8(200,  60,  60, 255), rgba8( 60, 200,  60, 255),
      rgba8( 60,  60, 200, 255), rgba8(200, 180,  40, 255),
   ];
   const matrices = [
      [1,0,0, 0,1,0, 0,0,1],         // identity
      [0,1,0, 1,0,0, 0,0,1],         // swap R/G
      [0,0,1, 0,1,0, 1,0,0],         // swap R/B
      [0.299,0.587,0.114, 0.299,0.587,0.114, 0.299,0.587,0.114], // grayscale
   ];
   const labels = ['ident', 'swpRG', 'swpRB', 'gray'];

   for (let ri = 0; ri < matrices.length; ri++) {
      for (let ci = 0; ci < colors.length; ci++) {
         const c = colorMatrix(colors[ci], matrices[ri]);
         const x = 20 + ci * 72, y = 50 + ri * 32;
         rectfill(x, y, x + 60, y + 24, c);
      }
      print(labels[ri], 318, 56 + ri * 32, rgba8(140, 180, 220, 255));
   }
   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
