// Conformance cart 133: Off-screen canvas.
// createCanvas(w, h); canvasClear(h, color); canvasPset/canvasPget;
// canvasBlit(h, dx, dy [, sx, sy, sw, sh]); canvasWidth/canvasHeight;
// destroyCanvas(h).

let errors = [];
let cv = 0;

export function init() {
   if (typeof createCanvas  !== 'function') { errors.push('createCanvas-missing');  return; }
   if (typeof canvasClear   !== 'function') { errors.push('canvasClear-missing');   return; }
   if (typeof canvasPset    !== 'function') { errors.push('canvasPset-missing');    return; }
   if (typeof canvasPget    !== 'function') { errors.push('canvasPget-missing');    return; }
   if (typeof canvasBlit    !== 'function') { errors.push('canvasBlit-missing');    return; }
   if (typeof destroyCanvas !== 'function') { errors.push('destroyCanvas-missing'); return; }
   if (typeof canvasWidth   !== 'function') { errors.push('canvasWidth-missing');   return; }
   if (typeof canvasHeight  !== 'function') { errors.push('canvasHeight-missing');  return; }

   cv = createCanvas(32, 32);
   if (!cv) { errors.push('createCanvas returned 0'); return; }

   if (canvasWidth(cv)  !== 32) errors.push('canvasWidth: ' + canvasWidth(cv));
   if (canvasHeight(cv) !== 32) errors.push('canvasHeight: ' + canvasHeight(cv));

   // Clear to blue
   canvasClear(cv, rgba8(0, 0, 255, 255));

   // Pset/Pget round-trip
   canvasPset(cv, 5, 5, rgba8(200, 100, 50, 255));
   const px = canvasPget(cv, 5, 5);
   if (((px >> 24) & 0xff) !== 200)
      errors.push('canvasPget: expected 200, got ' + ((px >> 24) & 0xff));

   // OOB pset should not crash
   canvasPset(cv, 999, 999, rgba8(255, 0, 0, 255));

   // Destroy + check doesn't crash
   const cv2 = createCanvas(8, 8);
   destroyCanvas(cv2);
   if (canvasWidth(cv2) !== 0) errors.push('destroyed canvas width != 0');
}

export function update(dt) {}

export function draw() {
   cls(rgba8(8, 10, 18, 255));
   print('133 CANVAS', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Draw pattern into canvas
   for (let y = 0; y < 32; y++) {
      for (let x = 0; x < 32; x++) {
         canvasPset(cv, x, y, colorHSV((x + y) * 5, 200, 220));
      }
   }

   // Blit canvas at multiple positions
   for (let i = 0; i < 5; i++) {
      canvasBlit(cv, 40 + i * 50, 60);
   }

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
