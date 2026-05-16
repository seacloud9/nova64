// Conformance cart 271: batch 18 APIs combined showcase.

let errors = [];

export function init() {
   const needed = ['vecFromAngle', 'closestPointOnLine', 'distToLine',
                   'drawTrail', 'colorDodge', 'colorBurn',
                   'fillRadialGradient', 'screenCRTWarp', 'screenOilPaint',
                   'drawGear', 'fillGear', 'colorFromFloats'];
   for (const f of needed) {
      if (typeof globalThis[f] !== 'function') errors.push(f + '-missing');
   }
}

export function update(dt) {}

export function draw() {
   cls(rgba8(5, 7, 15, 255));
   printBold('271 BATCH 18', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Radial gradient sky
   fillRadialGradient(320, 100, 200, rgba8(40, 80, 160, 120), rgba8(5, 7, 15, 0));

   // vecFromAngle compass
   const cx = 80, cy = 160;
   for (let d = 0; d < 360; d += 30) {
      const v = vecFromAngle(d);
      const c = colorFromFloats(
         (Math.cos(d*Math.PI/180)*0.5+0.5),
         0.7,
         (Math.sin(d*Math.PI/180)*0.5+0.5),
         1.0
      );
      line(cx, cy, cx+v.x*55|0, cy+v.y*55|0, c);
   }

   // Trails
   drawTrail(580, 60, 200, 140, 1, 18, colorFromFloats(1.0, 0.8, 0.2, 0.9));
   drawTrail(580, 100, 220, 160, 1, 14, colorFromFloats(0.4, 0.9, 1.0, 0.8));

   // Gear machine
   fillGear(300, 160, 55, 12, 9, rgba8(80, 120, 200, 255));
   circfill(300, 160, 18, rgba8(5, 7, 15, 255));
   fillGear(400, 140, 35, 8,  7, rgba8(200, 120, 60, 255));
   circfill(400, 140, 10, rgba8(5, 7, 15, 255));
   fillGear(460, 190, 25, 6,  5, rgba8(100, 220, 80, 255));

   // Color dodge/burn swatches
   const b2 = rgba8(80, 140, 200, 255);
   for (let i = 0; i < 8; i++) {
      const t = i / 7;
      const blend = colorFromFloats(t, t*0.8, 0.3, 1.0);
      rectfill(20+i*36, 270, 50+i*36, 300, colorDodge(b2, blend));
      rectfill(20+i*36, 305, 50+i*36, 335, colorBurn(b2, blend));
   }

   // closestPointOnLine demo
   const lx1=200, ly1=260, lx2=560, ly2=340;
   line(lx1, ly1, lx2, ly2, rgba8(100, 140, 200, 180));
   for (let i = 0; i < 5; i++) {
      const px = 230+i*70, py = 360-i*15;
      const cp = closestPointOnLine(px, py, lx1, ly1, lx2, ly2);
      line(px, py, cp.x|0, cp.y|0, rgba8(80, 220, 120, 160));
      circfill(px, py, 3, rgba8(255, 180, 60, 255));
   }

   // Apply oil paint to gear region
   setClip(248, 100, 240, 120);
   screenOilPaint(2);
   clearClip();

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
