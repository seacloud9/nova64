// Nova64 Game Cart: HUD DEMO (RetroArch port)
// Port of examples/hud-demo. The web version uses parseCanvasUI / XML;
// here we draw the same panel layout with primitive calls so it renders
// identically across web and core.

let cubes = [];
let t = 0;
let health = 80, mana = 55, xp = 1340, score = 0, ammo = 24, wave = 3;
let bossActive = false;

const CUBE_COLS = [
   rgba8(0x33, 0x99, 0xff, 255),
   rgba8(0xff, 0x66, 0x44, 255),
   rgba8(0x44, 0xff, 0x88, 255),
   rgba8(0xff, 0x33, 0xcc, 255),
   rgba8(0xff, 0xcc, 0x00, 255),
   rgba8(0x00, 0xdd, 0xff, 255),
];

export function init() {
   cubes = [];
   for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const r = 6;
      const m = createCube(1.2, 1.2, 1.2, CUBE_COLS[i]);
      setMeshEmissive(m, CUBE_COLS[i], 0.4);
      setPosition(m, Math.cos(a) * r, 0, Math.sin(a) * r - 8);
      cubes.push({ mesh: m, angle: a });
   }

   setCameraPosition(0, 8, 4);
   setCameraTarget(0, 0, -6);
   setAmbientLight(rgba8(34, 51, 68, 255), 0.8);
   setFog(rgba8(10, 10, 26, 255), 12, 40);
   setSkyColor(rgba8(20, 22, 48, 255), rgba8(4, 4, 18, 255));

   nova64.post.setBloom(1.0);
   nova64.post.setVignette(0.14, 0.78);
   nova64.post.setCRT(true);
}

export function update(dt) {
   t += dt;
   for (const obj of cubes) {
      rotateMesh(obj.mesh, dt * 0.7, dt * 1.1, 0);
   }
   health = 50 + Math.sin(t * 0.3) * 30;
   mana   = 30 + Math.sin(t * 0.5 + 1) * 25;
   xp     = 800 + Math.sin(t * 0.2) * 700;
   score  = Math.floor(t * 130);
   ammo   = Math.max(0, 24 - (Math.floor(t * 0.8) % 25));
   bossActive = Math.sin(t * 0.15) > 0.7;
}

function bar(x, y, w, h, value, max, fillCol, bgCol) {
   rectfill(x, y, w, h, bgCol);
   const fillW = Math.max(0, Math.min(w, Math.floor((value / max) * w)));
   if (fillW > 0) rectfill(x, y, fillW, h, fillCol);
}

function star(cx, cy, r, fillCol) {
   const N = 5;
   const rIn = r * 0.4;
   for (let i = 0; i < N * 2; i++) {
      const a1 = (i / (N * 2)) * Math.PI * 2 - Math.PI / 2;
      const a2 = ((i + 1) / (N * 2)) * Math.PI * 2 - Math.PI / 2;
      const r1 = (i & 1) ? rIn : r;
      const r2 = ((i + 1) & 1) ? rIn : r;
      line(cx + Math.cos(a1) * r1, cy + Math.sin(a1) * r1,
           cx + Math.cos(a2) * r2, cy + Math.sin(a2) * r2,
           fillCol);
   }
}

export function draw() {
   // ── Health / Mana / XP bars (top-left) ─────────────────────────
   const colHP   = rgba8(0xe7, 0x4c, 0x3c, 255);
   const bgHP    = rgba8(0x3a, 0x00, 0x00, 255);
   const colMP   = rgba8(0x34, 0x98, 0xdb, 255);
   const bgMP    = rgba8(0x00, 0x11, 0x33, 255);
   const colXP   = rgba8(0xf3, 0x9c, 0x12, 255);
   const bgXP    = rgba8(0x1a, 0x10, 0x00, 255);
   const labelHP = rgba8(0xff, 0x55, 0x55, 255);
   const labelMP = rgba8(0x55, 0x99, 0xff, 255);
   const labelXP = rgba8(0xff, 0xcc, 0x00, 255);

   printBold('HP', 10, 10, labelHP);
   bar(36, 10, 174, 12, health, 100, colHP, bgHP);
   printBold('MP', 10, 28, labelMP);
   bar(36, 28, 174, 12, mana, 100, colMP, bgMP);
   printBold('XP', 10, 46, labelXP);
   bar(36, 46, 174, 12, xp, 2000, colXP, bgXP);

   // ── Score (top-right) ──────────────────────────────────────────
   printBold('SCORE', 590, 10, rgba8(255, 255, 255, 255));
   const scoreStr = String(score).padStart(8, '0');
   printBold(scoreStr, 540, 24, rgba8(255, 221, 68, 255));

   // ── Ammo (bottom-right) ────────────────────────────────────────
   print('AMMO', 580, 310, rgba8(170, 170, 170, 255));
   const ammoStr = String(ammo).padStart(3, ' ');
   printBold(ammoStr, 588, 322, rgba8(255, 255, 255, 255));

   // ── Star rating (top center) ───────────────────────────────────
   const onCol  = rgba8(0xff, 0xcc, 0x00, 255);
   const offCol = rgba8(0x33, 0x33, 0x33, 255);
   const stars = Math.ceil((health / 100) * 5);
   for (let i = 0; i < 5; i++) {
      star(284 + i * 20, 18, 9, stars > i ? onCol : offCol);
   }

   // ── Radar (bottom-right) ───────────────────────────────────────
   const radarCol = rgba8(0, 255, 204, 170);
   const radarBg  = rgba8(0, 0, 34, 136);
   circfill(574, 300, 44, radarBg);
   circ(574, 300, 44, radarCol);
   circ(574, 300, 30, rgba8(0, 255, 204, 68));
   line(530, 300, 618, 300, rgba8(0, 255, 204, 51));
   line(574, 256, 574, 344, rgba8(0, 255, 204, 51));
   const sweepA = t * 1.4;
   line(574, 300, 574 + Math.cos(sweepA) * 40, 300 + Math.sin(sweepA) * 40, radarCol);
   circfill(574, 300, 3, rgba8(0, 255, 255, 255));
   circfill(574 + Math.cos(t * 0.6) * 28, 300 + Math.sin(t * 0.6) * 28, 3, rgba8(255, 68, 68, 255));
   circfill(574 + Math.cos(t * 0.9 + 2.1) * 20, 300 + Math.sin(t * 0.9 + 2.1) * 20, 3, rgba8(255, 68, 68, 255));

   // ── Wave / Level indicator (bottom-left) ───────────────────────
   rectfill(10, 340, 120, 16, rgba8(255, 255, 255, 24));
   print('WAVE ' + wave, 18, 343, rgba8(204, 204, 204, 255));

   // ── Boss warning ───────────────────────────────────────────────
   if (bossActive) {
      printBold('!! BOSS INCOMING !!', 244, 343, rgba8(255, 51, 51, 255));
   }
}
