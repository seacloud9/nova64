// Conformance cart 215: fillPlus(cx,cy,armLen,armW,color).

let errors = [];

export function init() {
   if (typeof fillPlus !== 'function') { errors.push('fillPlus-missing'); return; }
}

export function update(dt) {}

export function draw() {
   cls(rgba8(8, 10, 18, 255));
   print('215 FILL PLUS', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Various sizes
   const specs = [
      { x: 70,  y: 100, arm: 30, w: 4  },
      { x: 180, y: 100, arm: 24, w: 8  },
      { x: 290, y: 100, arm: 20, w: 12 },
      { x: 400, y: 100, arm: 16, w: 16 },
      { x: 510, y: 100, arm: 12, w: 4  },
   ];
   const cols = [
      rgba8(100, 200, 255, 255),
      rgba8(255, 160, 60,  255),
      rgba8(180, 255, 100, 255),
      rgba8(255, 100, 180, 255),
      rgba8(200, 100, 255, 255),
   ];
   for (let i = 0; i < specs.length; i++) {
      const s = specs[i];
      fillPlus(s.x, s.y, s.arm, s.w, cols[i]);
      print('a' + s.arm + 'w' + s.w, s.x - 12, s.y + s.arm + 6, rgba8(140, 180, 220, 255));
   }

   // Cross-hair style
   fillPlus(100, 240, 20, 1, rgba8(255, 60, 60, 255));
   fillPlus(200, 240, 20, 2, rgba8(60, 220, 60, 255));
   fillPlus(300, 240, 20, 3, rgba8(60, 100, 255, 255));

   // First aid cross
   fillPlus(440, 240, 18, 10, rgba8(220, 40, 40, 255));
   rect(422, 222, 458, 258, rgba8(255, 255, 255, 200));
   print('first aid', 420, 264, rgba8(140, 180, 220, 255));

   print('plus/cross shapes', 8, 310, rgba8(160, 200, 240, 255));
   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
