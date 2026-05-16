// Conformance cart 172: polyline(points, color [,closed]).

let errors = [];

export function init() {
   if (typeof polyline !== 'function') { errors.push('polyline-missing'); return; }
   // Edge: fewer than 2 points must not crash
   polyline([], rgba8(255, 255, 255, 255));
   polyline([10, 10], rgba8(255, 255, 255, 255));
}

export function update(dt) {}

export function draw() {
   cls(rgba8(8, 10, 18, 255));
   print('172 POLYLINE', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Open polyline — a zigzag
   const zag = [];
   for (let i = 0; i < 10; i++) {
      zag.push(30 + i * 28);
      zag.push(i % 2 === 0 ? 80 : 130);
   }
   polyline(zag, rgba8(100, 200, 255, 255));

   // Closed polyline — a pentagon
   const sides = 5, cx = 160, cy = 185, r = 40;
   const pent = [];
   for (let i = 0; i < sides; i++) {
      const a = (i / sides) * Math.PI * 2 - Math.PI / 2;
      pent.push(cx + Math.round(Math.cos(a) * r));
      pent.push(cy + Math.round(Math.sin(a) * r));
   }
   polyline(pent, rgba8(255, 180, 60, 255), true);

   print('zigzag + closed pentagon', 8, 235, rgba8(180, 220, 255, 255));
   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
