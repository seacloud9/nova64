// Conformance cart 209: fillCapsule(x1,y1,x2,y2,r,color).

let errors = [];

export function init() {
   if (typeof fillCapsule !== 'function') { errors.push('fillCapsule-missing'); return; }
   fillCapsule(0, 0, 0, 0, 5, rgba8(100,100,100,255));
}

export function update(dt) {}

export function draw() {
   cls(rgba8(8, 10, 18, 255));
   print('209 FILL CAPSULE', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Horizontal filled capsule
   fillCapsule(60, 80, 240, 80, 20, rgba8(60, 140, 220, 255));
   drawCapsule(60, 80, 240, 80, 20, rgba8(200, 240, 255, 255));
   print('h r=20', 60, 106, rgba8(140, 180, 220, 255));

   // Vertical
   fillCapsule(340, 50, 340, 150, 18, rgba8(200, 120, 40, 255));
   drawCapsule(340, 50, 340, 150, 18, rgba8(255, 220, 140, 255));
   print('v r=18', 360, 90, rgba8(140, 180, 220, 255));

   // Diagonal
   fillCapsule(420, 60, 540, 150, 14, rgba8(120, 200, 60, 255));
   drawCapsule(420, 60, 540, 150, 14, rgba8(200, 255, 120, 255));
   print('diag r=14', 430, 170, rgba8(140, 180, 220, 255));

   // Health bar style
   fillCapsule(40, 210, 200, 210, 8, rgba8(40, 80, 40, 255));
   fillCapsule(40, 210, 140, 210, 8, rgba8(60, 220, 80, 255));
   print('health bar', 40, 224, rgba8(140, 180, 220, 255));

   // Button style
   fillCapsule(260, 205, 400, 225, 10, rgba8(80, 100, 200, 255));
   print('button', 295, 209, rgba8(220, 240, 255, 255));

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
