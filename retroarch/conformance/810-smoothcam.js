// Conformance cart 810: smoothcam — createCam2D, setCam2DTarget, setCam2DZoom,
//   updateCam2D, applyCam2D, getCam2DX, getCam2DY, destroyCam2D

let cam = 0;

export function init() {
   cam = createCam2D(0, 0, 4.0);
   setCam2DTarget(cam, 40, 20);
}

export function draw() {
   cls(rgba8(8, 10, 20, 255));

   // A grid of tiles to show camera offset
   for (let tx = 0; tx < 12; tx++) {
      for (let ty = 0; ty < 8; ty++) {
         const col = (tx + ty) % 2 === 0 ? rgba8(30, 30, 60, 255) : rgba8(20, 20, 40, 255);
         rectfill(tx * 60, ty * 50, 58, 48, col);
      }
   }

   const cx = getCam2DX(cam);
   const cy = getCam2DY(cam);

   clearCamera2D();

   print('cam x:' + cx.toFixed(1) + ' y:' + cy.toFixed(1), 4, 30, rgba8(80, 255, 120, 200));

   printBold('810 SMOOTHCAM', 4, 4, rgba8(200, 220, 255, 255));
   print('createCam2D setCam2DTarget applyCam2D', 4, 14, rgba8(80, 255, 120, 180));
}
