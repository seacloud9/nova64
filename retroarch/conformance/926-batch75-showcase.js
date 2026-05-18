// Conformance cart 926: Batch 75 showcase — animated numeric counters.

let t = 0;

// Score, level, combo, health counters
const COUNTERS_CFG = [
   { label: 'SCORE',  x: 60,  y: 90,  speed: 800,  col: [220, 220, 80 ], target: 0 },
   { label: 'LEVEL',  x: 60,  y: 160, speed: 2,    col: [80,  200, 80 ], target: 0 },
   { label: 'COMBO',  x: 60,  y: 230, speed: 20,   col: [200, 80,  80 ], target: 0 },
   { label: 'PING',   x: 400, y: 90,  speed: 300,  col: [80,  180, 255], target: 0 },
   { label: 'KILLS',  x: 400, y: 160, speed: 5,    col: [220, 100, 60 ], target: 0 },
   { label: 'COINS',  x: 400, y: 230, speed: 150,  col: [255, 210, 60 ], target: 0 },
];
let counters  = [];
let nextEvent = 0;

function randomTarget(i) {
   const bases = [100000, 99, 999, 999, 100, 9999];
   return Math.floor(Math.sin(t * (i + 1) * 0.7) * bases[i] * 0.5 + bases[i] * 0.5);
}

export function init() {
   for (let i = 0; i < COUNTERS_CFG.length; i++) {
      const cfg = COUNTERS_CFG[i];
      const h = createCounter(cfg.x + 80, cfg.y, rgba8(cfg.col[0], cfg.col[1], cfg.col[2], 255), cfg.speed);
      counters.push(h);
   }
}

export function update(dt) {
   t += dt;
   nextEvent -= dt;
   if (nextEvent <= 0) {
      nextEvent = 0.6;
      for (let i = 0; i < counters.length; i++)
         setCounterTarget(counters[i], randomTarget(i));
   }
   for (let i = 0; i < counters.length; i++)
      updateCounter(counters[i], dt);
}

export function draw() {
   cls(rgba8(4, 5, 14, 255));
   for (let i = 0; i < COUNTERS_CFG.length; i++) {
      const cfg = COUNTERS_CFG[i];
      const col = rgba8(cfg.col[0], cfg.col[1], cfg.col[2], 180);
      print(cfg.label, cfg.x, cfg.y, col);
      drawCounter(counters[i]);
      if (!isCounterAtTarget(counters[i]))
         rectfill(cfg.x + 78, cfg.y + 2, 4, 4, rgba8(255, 80, 80, 200));
   }
   printBold('926 BATCH 75', 4, 4, rgba8(200, 220, 255, 255));
   print('counters', 4, 14, rgba8(80, 255, 120, 255));
}
