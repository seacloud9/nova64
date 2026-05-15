// Conformance cart 121: drawPoly / fillPoly from JS arrays.
// drawPoly(points, color [, closed]); fillPoly(points, color).

let errors = [];

export function init() {
   if (typeof drawPoly !== 'function') { errors.push('drawPoly-missing'); return; }
   if (typeof fillPoly !== 'function') { errors.push('fillPoly-missing'); return; }

   // fillPoly triangle — check center pixel
   fillPoly([160, 30, 200, 90, 120, 90], rgba8(200, 100, 50, 255));
   const px = pget(160, 70);
   const pr = (px >> 24) & 0xff;
   const pg = (px >> 16) & 0xff;
   if (pr !== 200 || pg !== 100)
      errors.push('fillPoly center pixel: got ' + pr + ',' + pg + ' exp 200,100');

   // Nested format: [[x,y],...]
   fillPoly([[260, 30], [300, 90], [220, 90]], rgba8(50, 200, 100, 255));
   const px2 = pget(260, 70);
   if (((px2 >> 24) & 0xff) !== 50)
      errors.push('nested fillPoly mismatch: ' + ((px2 >> 24) & 0xff));

   // drawPoly with too-few points should not crash
   drawPoly([10, 10], rgba8(255, 255, 255, 255));
}

export function update(dt) {}

export function draw() {
   cls(rgba8(8, 10, 18, 255));
   print('121 DRAW FILL POLY', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Filled hexagon
   const cx = 150, cy = 190, r = 50;
   const pts = [];
   for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 - Math.PI / 6;
      pts.push(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
   }
   fillPoly(pts, rgba8(60, 120, 220, 255));
   drawPoly(pts, rgba8(150, 200, 255, 255), true);

   // Star outline via drawPoly
   const star = [];
   for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
      const rad = i % 2 === 0 ? 45 : 20;
      star.push(330 + Math.cos(a) * rad, 190 + Math.sin(a) * rad);
   }
   drawPoly(star, rgba8(255, 200, 60, 255), true);

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
