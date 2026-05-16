// Conformance cart 285: drawBrickPattern, fillWaveShape, drawFlame, fillFlame.

let errors = [];

export function init() {
   if (typeof drawBrickPattern !== 'function') { errors.push('drawBrickPattern-missing'); return; }
   if (typeof fillWaveShape    !== 'function') { errors.push('fillWaveShape-missing');    return; }
   if (typeof drawFlame        !== 'function') { errors.push('drawFlame-missing');        return; }
   if (typeof fillFlame        !== 'function') { errors.push('fillFlame-missing');        return; }
}

export function update(dt) {}

export function draw() {
   cls(rgba8(8, 10, 20, 255));
   print('285 BRICK WAVE FLAME', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Brick wall
   rectfill(20, 40, 280, 200, rgba8(140, 80, 50, 255));
   drawBrickPattern(20, 40, 260, 160, 40, 16, rgba8(80, 40, 20, 255));

   // Wave shapes as water/terrain
   fillWaveShape(320, 120, 300, 80,  15, 2.0, rgba8(30, 80, 180, 200));
   fillWaveShape(320, 150, 300, 50,  10, 3.0, rgba8(20, 120, 200, 180));

   // Flame cluster
   fillFlame(100, 340, 80, rgba8(255, 80, 10, 240));
   fillFlame(100, 340, 60, rgba8(255, 180, 20, 220));
   fillFlame(100, 340, 35, rgba8(255, 240, 100, 200));
   drawFlame(100, 340, 82, rgba8(200, 60, 10, 180));

   // More flames
   for (let i = 0; i < 5; i++) {
      fillFlame(280+i*60, 340, 50+i*5, colorFromHSL(i*12, 1.0, 0.5));
      fillFlame(280+i*60, 340, 30+i*4, colorFromHSL(i*12+30, 0.9, 0.7));
   }

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
