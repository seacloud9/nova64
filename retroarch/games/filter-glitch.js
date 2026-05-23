// Nova64 Game Cart: FILTER GLITCH (RetroArch port of examples/filter-glitch)
// Plasma background that auto-cycles through CRT, VHS, hyper-sat, sepia,
// and pixelate post effects every 3 seconds.

const W = 640;
const H = 360;
const MODES = ['NORMAL', 'CRT GLITCH', 'VHS SCANLINES', 'HYPER-SAT', 'SEPIA', 'PIXELATE'];

let time = 0;
let mode = 0;
let modeTime = 0;

function drawPlasma(t) {
   for (let y = 0; y < H; y += 2) {
      for (let x = 0; x < W; x += 2) {
         const v =
            Math.sin(x * 0.03 + t) +
            Math.sin(y * 0.04 + t * 0.7) +
            Math.sin((x + y) * 0.025 + t * 1.3) +
            Math.sin(Math.sqrt(x * x + y * y) * 0.02 + t);
         const r = Math.floor(((v + 4) / 8) * 180 + 30);
         const g = Math.floor(((Math.sin(v * 1.2 + 1) + 1) / 2) * 120 + 10);
         const b = Math.floor(((Math.cos(v * 0.8 - 0.5) + 1) / 2) * 200 + 55);
         rectfill(x, y, 2, 2, rgba8(r, g, b, 255));
      }
   }
}

export function init() {
   time = 0;
   mode = 0;
   modeTime = 0;
}

export function update(dt) {
   time += dt;
   modeTime += dt;
   if (modeTime > 3) {
      modeTime = 0;
      mode = (mode + 1) % MODES.length;
   }
}

export function draw() {
   cls(rgba8(0, 0, 0, 255));
   drawPlasma(time);

   if (mode === 1) {
      screenGlitch(4 + Math.floor(Math.abs(Math.sin(time * 20)) * 8));
      screenChromaticAberration(3);
      for (let y = 0; y < H; y += 2) rectfill(0, y, W, 1, rgba8(0, 0, 0, 64));
   } else if (mode === 2) {
      screenGrayscale();
      for (let y = 0; y < H; y += 3) rectfill(0, y, W, 1, rgba8(0, 0, 0, 102));
      for (let i = 0; i < 120; i++) {
         const nx = (Math.random() * W) | 0;
         const ny = (Math.random() * H) | 0;
         pset(nx, ny, Math.random() > 0.5 ? rgba8(255,255,255,255) : rgba8(0,0,0,255));
      }
   } else if (mode === 3) {
      screenHsv(0, 1.8, 1.0);
   } else if (mode === 4) {
      screenSepia2(1.0);
   } else if (mode === 5) {
      screenPixelate(6);
   }

   const barH = 20;
   rectfill(0, 0,         W, barH, rgba8(0, 0, 0, 170));
   rectfill(0, H - barH,  W, barH, rgba8(0, 0, 0, 170));
   print('FILTER GLITCH', 4, 4, rgba8(255, 255, 255, 255));
   print('MODE: ' + MODES[mode], 4, 10, rgba8(0x44, 0xaa, 0xff, 255));
   print('Auto-cycles every 3s', 4, H - barH + 4, rgba8(0x77, 0x88, 0x99, 255));
   const progress = Math.floor((modeTime / 3) * (W - 8));
   rectfill(4, H - 5, progress, 2, rgba8(0x44, 0xaa, 0xff, 255));
}
