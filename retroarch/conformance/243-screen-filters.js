// Conformance cart 243: screenEdgeDetect, screenEmboss, screenSharpen.

let errors = [];

export function init() {
   if (typeof screenEdgeDetect !== 'function') { errors.push('screenEdgeDetect-missing'); return; }
   if (typeof screenEmboss     !== 'function') { errors.push('screenEmboss-missing'); return; }
   if (typeof screenSharpen    !== 'function') { errors.push('screenSharpen-missing'); return; }
}

export function update(dt) {}

export function draw() {
   cls(rgba8(8, 10, 18, 255));
   print('243 SCREEN FILTERS', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Draw test content in three panels
   for (let panel = 0; panel < 3; panel++) {
      const px2 = 20 + panel * 204;
      rectfill(px2, 40, px2 + 180, 200, rgba8(30, 50, 100, 255));
      circfill(px2 + 90, 120, 50, rgba8(200, 100, 60, 255));
      circfill(px2 + 50, 80,  30, rgba8(60, 180, 220, 255));
      circfill(px2 + 130, 160, 25, rgba8(180, 220, 60, 255));
      print('NOVA64', px2 + 30, 110, rgba8(255, 255, 255, 255));
   }

   // Apply different filters to each panel
   // Panel 1: edge detect
   setClip(20, 40, 200, 160);
   screenEdgeDetect(1.5);
   clearClip();
   print('edge', 80, 208, rgba8(140, 180, 220, 255));

   // Panel 2: emboss
   setClip(224, 40, 200, 160);
   screenEmboss();
   clearClip();
   print('emboss', 268, 208, rgba8(140, 180, 220, 255));

   // Panel 3: sharpen
   setClip(428, 40, 180, 160);
   screenSharpen(2.0);
   clearClip();
   print('sharpen', 462, 208, rgba8(140, 180, 220, 255));

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
