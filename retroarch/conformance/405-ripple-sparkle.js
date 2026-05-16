// Conformance cart 405: drawRipple, fillRipple, drawSparkle, fillSparkle.

let errors = [];

export function init() {
   if (typeof drawRipple  !== 'function') { errors.push('drawRipple-missing');  return; }
   if (typeof fillRipple  !== 'function') { errors.push('fillRipple-missing');  return; }
   if (typeof drawSparkle !== 'function') { errors.push('drawSparkle-missing'); return; }
   if (typeof fillSparkle !== 'function') { errors.push('fillSparkle-missing'); return; }
}

export function update(dt) {}

export function draw() {
   cls(rgba8(8, 8, 20, 255));
   print('405 RIPPLE SPARKLE', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Ripple outlines
   drawRipple(130, 190, 90, 5, rgba8(80, 180, 255, 255));
   drawRipple(320, 190, 70, 3, rgba8(255, 160, 60, 220));

   // Filled ripple
   fillRipple(490, 190, 80, 4, rgba8(80, 200, 255, 200), rgba8(10, 30, 60, 200));

   // Sparkle outline
   drawSparkle(130, 310, 50, 8, rgba8(255, 220, 60, 255));
   drawSparkle(280, 310, 40, 12, rgba8(200, 100, 255, 220));

   // Filled sparkle
   fillSparkle(430, 310, 55, 8, rgba8(255, 180, 60, 240));
   fillSparkle(540, 310, 35, 6, rgba8(100, 220, 255, 220));

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
