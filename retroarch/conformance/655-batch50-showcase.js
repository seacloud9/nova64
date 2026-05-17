// Conformance cart 655: batch 50 combined showcase.
// angleVec3, reflectVec3, projectVec3, clamp01, bilinear, smootherstep,
// addScreen, switchScreen, getCurrentScreen, isTransitioning, startScreens.

let errors = [];
let t = 0;
let screenTimer = 0;

const screens = {
   menu: {
      update(dt) { screenTimer += dt; },
      draw() {
         cls(rgba8(4, 6, 18, 255));
         printBold('655 BATCH 50', 4, 4, rgba8(200, 220, 255, 255));
         print('screen: menu', 20, 30, rgba8(80, 200, 255, 255));
         drawCommon();
         if (!errors.length) print('ok', 4, 14, rgba8(80, 255, 120, 255));
      }
   },
   demo: {
      update(dt) { screenTimer += dt; },
      draw() {
         cls(rgba8(6, 4, 18, 255));
         printBold('655 BATCH 50', 4, 4, rgba8(200, 220, 255, 255));
         print('screen: demo', 20, 30, rgba8(255, 160, 60, 255));
         drawCommon();
         if (!errors.length) print('ok', 4, 14, rgba8(80, 255, 120, 255));
      }
   }
};

function drawCommon() {
   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // smootherstep curve
   for (let i = 0; i < 60; i++) {
      const tv = i / 59;
      const sv = smootherstep(tv);
      pset(20 + i * 4, 180 - Math.floor(sv * 80), hslColor(Math.floor(tv * 240), 0.8, 0.5, 220));
   }
   print('smootherstep', 20, 190, rgba8(180, 180, 220, 180));

   // bilinear fade
   for (let xi = 0; xi < 30; xi++) {
      for (let yi = 0; yi < 20; yi++) {
         const bl = bilinear(20, 200, 200, 60, xi / 29, yi / 19);
         pset(320 + xi * 6, 60 + yi * 5, rgba8(clamp01(bl/255)*255|0, 80, 120, 200));
      }
   }
   print('bilinear', 320, 170, rgba8(180, 180, 220, 180));

   // reflectVec3 bouncing beam
   const bx = 120, by = 290;
   const ang = t * 1.2;
   let dx = Math.cos(ang), dy = -Math.sin(ang), dz = 0;
   let px = bx, py = by;
   for (let step = 0; step < 3; step++) {
      const ex = px + dx * 80;
      const ey = py + dy * 80;
      line(Math.floor(px), Math.floor(py), Math.floor(ex), Math.floor(ey),
           hslColor(step * 60, 0.8, 0.5, 200));
      const r = reflectVec3(dx, dy, dz, 0, 1, 0);
      dx = r.x; dy = r.y;
      px = ex; py = ey;
   }

   // angleVec3 display
   const aval = angleVec3(1, 0, 0, Math.cos(t), Math.sin(t), 0);
   print('angle: ' + aval.toFixed(2), 4, 310, rgba8(180, 200, 255, 200));
}

export function init() {
   const needed = ['angleVec3','reflectVec3','projectVec3','clamp01','bilinear','smootherstep',
                   'addScreen','switchScreen','getCurrentScreen','isTransitioning','startScreens'];
   for (const f of needed) {
      if (typeof globalThis[f] !== 'function') errors.push(f + '-missing');
   }
   if (errors.length > 0) return;

   addScreen('menu', screens.menu);
   addScreen('demo', screens.demo);
   startScreens('menu');
}

export function update(dt) {
   t += dt;
   if (errors.length > 0) return;
   // switch screens every 2s
   if (screenTimer > 2) {
      screenTimer = 0;
      const cur = getCurrentScreen();
      switchScreen(cur === 'menu' ? 'demo' : 'menu', 0);
   }
}

export function draw() {
   if (errors.length > 0) {
      cls(rgba8(4, 6, 18, 255));
      printBold('655 BATCH 50', 4, 4, rgba8(200, 220, 255, 255));
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
   }
   // screen draws itself via screen.draw()
}
