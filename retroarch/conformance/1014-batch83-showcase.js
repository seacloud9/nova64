// Conformance cart 1014: Batch 83 showcase — animated progress bars (loading screen).

let t = 0;
let bars = [];
let labels = [];
let speeds = [];

const TASKS = [
   { label: 'LOADING ASSETS',    color: [80,  180, 255], target: 1.0, speed: 0.6 },
   { label: 'COMPILING SHADERS', color: [255, 160, 60 ], target: 0.9, speed: 0.45 },
   { label: 'BUILDING WORLD',    color: [80,  220, 80 ], target: 0.75, speed: 0.35 },
   { label: 'SPAWNING ENTITIES', color: [220, 80,  160], target: 0.5, speed: 0.55 },
   { label: 'CALIBRATING AI',    color: [140, 80,  255], target: 0.65, speed: 0.40 },
   { label: 'READY',             color: [220, 220, 80 ], target: 0.3, speed: 0.50 },
];

const BAR_X = 120;
const BAR_W = 400;
const BAR_H = 10;
const START_Y = 100;
const ROW_H = 36;

export function init() {
   for (let i = 0; i < TASKS.length; i++) {
      const tk = TASKS[i];
      const h = createBar(BAR_X, START_Y + i * ROW_H, BAR_W, BAR_H, 0.0);
      setBarColors(h,
         rgba8(18, 20, 34, 220),
         rgba8(tk.color[0], tk.color[1], tk.color[2], 255),
         rgba8(50, 60, 100, 200));
      setBarTarget(h, tk.target);
      bars.push(h);
   }
}

export function update(dt) {
   t += dt;
   for (let i = 0; i < bars.length; i++) {
      // Custom per-bar speed via update with scaled dt
      const tk = TASKS[i];
      updateBar(bars[i], dt * tk.speed * 2.0);
   }
}

export function draw() {
   cls(rgba8(6, 8, 16, 255));

   // Header
   rectfill(0, 0, 640, 60, rgba8(10, 12, 24, 255));
   printBold('NOVA64 RUNTIME', 230, 18, rgba8(80, 180, 255, 255));
   print('INITIALIZING SYSTEMS...', 218, 34, rgba8(140, 160, 220, 180));

   // Background panel
   rectfill(80, 80, 480, TASKS.length * ROW_H + 40, rgba8(12, 14, 26, 200));

   for (let i = 0; i < bars.length; i++) {
      const tk = TASKS[i];
      const row_y = START_Y + i * ROW_H;
      const col = rgba8(tk.color[0], tk.color[1], tk.color[2], 180);

      print(tk.label, BAR_X, row_y - 10, col);

      const v = getBarValue(bars[i]);
      const pct = Math.floor(v * 100);
      print(pct + '%', BAR_X + BAR_W + 8, row_y, col);

      drawBar(bars[i]);
   }

   printBold('1014 BATCH 83', 4, 4, rgba8(200, 220, 255, 200));
}
