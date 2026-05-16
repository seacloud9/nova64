// Conformance cart 244: drawCloud(cx,cy,r,color).

let errors = [];

export function init() {
   if (typeof drawCloud !== 'function') { errors.push('drawCloud-missing'); return; }
}

export function update(dt) {}

export function draw() {
   cls(rgba8(60, 100, 180, 255));
   print('244 DRAW CLOUD', 4, 4, rgba8(200, 240, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Sky background
   clsGradient(rgba8(80, 130, 220, 255), rgba8(160, 200, 255, 255), 1);

   // Clouds at different sizes
   drawCloud(160, 100, 50, rgba8(240, 245, 255, 255));
   drawCloud(380, 80,  40, rgba8(230, 240, 255, 220));
   drawCloud(530, 120, 30, rgba8(240, 245, 255, 200));
   drawCloud(80,  160, 35, rgba8(220, 235, 255, 180));

   // Dark storm clouds
   drawCloud(200, 250, 55, rgba8(120, 130, 150, 255));
   drawCloud(420, 260, 45, rgba8(100, 110, 130, 255));

   // Tiny clouds
   for (let i = 0; i < 5; i++) {
      drawCloud(50 + i * 116, 320, 18, rgba8(200, 220, 255, 150));
   }

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
