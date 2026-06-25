// Nova64 Game Cart: NEON SNAKE
// Grid-based snake with a tilted 3D camera, neon trail, and bloomed food orbs.
// Arrows turn, Z starts / restarts, X pauses.
// Showcases: instanced cubes for the trail, emissive sphere food, post bloom.

const COLS = 22;
const ROWS = 14;
const CELL = 1.6;
const STEP_TIME = 0.12;

const COL_HEAD = rgba8(80, 255, 230, 255);
const COL_BODY_A = rgba8(0, 220, 255, 255);
const COL_BODY_B = rgba8(120, 80, 255, 255);
const COL_FOOD = rgba8(255, 220, 80, 255);
const COL_WALL = rgba8(160, 40, 220, 255);
const COL_FLOOR = rgba8(10, 8, 26, 255);

let snake = [];
let dir = { x: 1, y: 0 };
let pendingDir = { x: 1, y: 0 };
let food = { x: 0, y: 0 };
let stepAcc = 0;
let score = 0;
let best = 0;
let time = 0;
let state = 'start';
let startT = 0;
let paused = false;

let segMesh = null;
let foodMesh = null;
let floorMesh = null;
let wallMeshes = [];

function cellToWorld(cx, cy) {
   const x = (cx - (COLS - 1) / 2) * CELL;
   const z = (cy - (ROWS - 1) / 2) * CELL;
   return { x, z };
}

function placeFood() {
   const occupied = new Set(snake.map(s => s.y * COLS + s.x));
   const candidates = [];
   for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
         if (!occupied.has(y * COLS + x)) candidates.push({ x, y });
      }
   }
   if (candidates.length === 0) return;
   food = candidates[Math.floor(Math.random() * candidates.length)];
}

function resetSnake() {
   snake = [];
   const cx = Math.floor(COLS / 2);
   const cy = Math.floor(ROWS / 2);
   for (let i = 3; i >= 0; i--) snake.push({ x: cx - i, y: cy });
   dir = { x: 1, y: 0 };
   pendingDir = { x: 1, y: 0 };
   stepAcc = 0;
   score = 0;
   time = 0;
   placeFood();
}

function buildScene() {
   if (segMesh) { destroyMesh(segMesh); segMesh = null; }
   if (foodMesh) { destroyMesh(foodMesh); foodMesh = null; }
   if (floorMesh) { destroyMesh(floorMesh); floorMesh = null; }
   for (const w of wallMeshes) destroyMesh(w);
   wallMeshes = [];

   const maxSegs = COLS * ROWS;
   segMesh = createInstancedMesh('cube', maxSegs);
   setMeshColor(segMesh, COL_BODY_A);
   setMeshEmissive(segMesh, COL_BODY_A, 1.1);
   const hidden = new Array(maxSegs * 16).fill(0);
   for (let i = 0; i < maxSegs; i++) hidden[i * 16 + 15] = 1;
   setInstanceTransforms(segMesh, 0, hidden);

   foodMesh = createSphere(0.5, COL_FOOD);
   setMeshEmissive(foodMesh, COL_FOOD, 1.8);

   const floorW = COLS * CELL + CELL * 2;
   const floorD = ROWS * CELL + CELL * 2;
   floorMesh = createCube(floorW, 0.2, floorD, COL_FLOOR);
   setMeshEmissive(floorMesh, rgba8(28, 16, 50, 255), 0.18);
   setPosition(floorMesh, 0, -0.55, 0);

   const railH = 0.6;
   const railT = 0.25;
   const sides = [
      { w: floorW, h: railH, d: railT, x: 0, z: -floorD / 2 + railT / 2 },
      { w: floorW, h: railH, d: railT, x: 0, z:  floorD / 2 - railT / 2 },
      { w: railT, h: railH, d: floorD, x: -floorW / 2 + railT / 2, z: 0 },
      { w: railT, h: railH, d: floorD, x:  floorW / 2 - railT / 2, z: 0 },
   ];
   for (const s of sides) {
      const m = createCube(s.w, s.h, s.d, COL_WALL);
      setMeshEmissive(m, COL_WALL, 1.4);
      setPosition(m, s.x, railH / 2 - 0.45, s.z);
      wallMeshes.push(m);
   }
}

function uploadSegments() {
   const data = new Array(snake.length * 16);
   for (let i = 0; i < snake.length; i++) {
      const { x, z } = cellToWorld(snake[i].x, snake[i].y);
      const off = i * 16;
      const s = (i === snake.length - 1) ? 0.95 : 0.78;
      data[off + 0] = s;  data[off + 1] = 0;  data[off + 2] = 0;  data[off + 3] = 0;
      data[off + 4] = 0;  data[off + 5] = s;  data[off + 6] = 0;  data[off + 7] = 0;
      data[off + 8] = 0;  data[off + 9] = 0;  data[off +10] = s;  data[off +11] = 0;
      data[off +12] = x;  data[off +13] = 0.2;data[off +14] = z;  data[off +15] = 1;

      const isHead = i === snake.length - 1;
      const col = isHead ? COL_HEAD : (i % 2 === 0 ? COL_BODY_A : COL_BODY_B);
      setInstanceColor(segMesh, i, col);
   }
   setInstanceTransforms(segMesh, 0, data);
}

export function init() {
   state = 'start';
   startT = 0;
   paused = false;
   best = best || 0;

   setCameraPosition(0, 18, 14);
   setCameraTarget(0, 0, -1);
   setCameraFOV(58);
   setAmbientLight(rgba8(180, 200, 240, 255), 0.95);
   setLightDirection(-0.3, -1, -0.2);
   setFog(rgba8(8, 6, 22, 255), 24, 70);

   nova64.post.setBloom(2.1);
   nova64.post.setChromatic(0.004);
   nova64.post.setVignette(0.18, 0.78);
   nova64.post.setCRT(true);
   setSkyColor(rgba8(18, 8, 40, 255), rgba8(4, 2, 12, 255));

   buildScene();
   resetSnake();
}

function readInput() {
   if (btnp('up')    && dir.y !==  1) pendingDir = { x:  0, y: -1 };
   if (btnp('down')  && dir.y !== -1) pendingDir = { x:  0, y:  1 };
   if (btnp('left')  && dir.x !==  1) pendingDir = { x: -1, y:  0 };
   if (btnp('right') && dir.x !== -1) pendingDir = { x:  1, y:  0 };
}

function step() {
   dir = pendingDir;
   const head = snake[snake.length - 1];
   const nx = head.x + dir.x;
   const ny = head.y + dir.y;

   if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) { state = 'over'; return; }
   for (let i = 0; i < snake.length - 1; i++) {
      if (snake[i].x === nx && snake[i].y === ny) { state = 'over'; return; }
   }

   const grew = (nx === food.x && ny === food.y);
   snake.push({ x: nx, y: ny });
   if (grew) { score += 10; placeFood(); }
   else { snake.shift(); }

   if (score > best) best = score;
}

export function update(dt) {
   if (state === 'start') {
      startT += dt;
      if (btnp('z') || btnp('x')) { state = 'playing'; resetSnake(); }
      return;
   }
   if (state === 'over') {
      if (btnp('z') || btnp('x')) { state = 'playing'; resetSnake(); }
      return;
   }

   if (btnp('x')) paused = !paused;
   if (paused) return;

   readInput();
   time += dt;
   stepAcc += dt;
   while (stepAcc >= STEP_TIME && state === 'playing') {
      stepAcc -= STEP_TIME;
      step();
   }

   uploadSegments();
   const { x: fx, z: fz } = cellToWorld(food.x, food.y);
   const fb = 0.5 + Math.sin(time * 6) * 0.12;
   setPosition(foodMesh, fx, 0.4 + Math.sin(time * 3) * 0.15, fz);
   setScale(foodMesh, fb, fb, fb);
}

function drawHud() {
   printOutlineTight('NEON SNAKE', 8, 6, rgba8(80, 255, 230, 255), rgba8(0, 0, 0, 220));
   printTight('SCORE ' + score, 8, 22, rgba8(255, 220, 80, 255));
   printTight('BEST  ' + best, 8, 34, rgba8(255, 140, 220, 255));
   printTight('LEN   ' + snake.length, 8, 46, rgba8(120, 200, 255, 255));
   printTight('T ' + time.toFixed(1) + 's', 560, 6, rgba8(160, 180, 240, 220));
}

export function draw() {
   cls(rgba8(2, 2, 10, 255));

   if (state === 'start') {
      rectfill(120, 96, 520, 184, rgba8(6, 6, 22, 232));
      glowRect(120, 96, 520, 184, rgba8(80, 255, 230, 220), 6);
      printBold('NEON SNAKE', 230, 110, rgba8(80, 255, 230, 255));
      printTight('Eat the glowing orbs.', 196, 134, rgba8(200, 220, 255, 220));
      printTight('Arrows turn.  X pauses.', 196, 148, rgba8(200, 220, 255, 220));
      printTight('Wall or tail = death.', 196, 162, rgba8(200, 220, 255, 220));
      printFlash(252, 180, 'Z to start', rgba8(255, 220, 80, 255), -startT, 1.6);
      return;
   }

   drawHud();

   if (paused) {
      rectfill(240, 158, 400, 198, rgba8(6, 6, 22, 232));
      glowRect(240, 158, 400, 198, rgba8(80, 255, 230, 220), 5);
      printBold('PAUSED', 286, 172, rgba8(80, 255, 230, 255));
      printTight('X to resume', 280, 188, rgba8(200, 220, 255, 220));
   }

   if (state === 'over') {
      rectfill(180, 134, 460, 220, rgba8(8, 4, 18, 240));
      glowRect(180, 134, 460, 220, rgba8(255, 80, 160, 230), 6);
      printBold('GAME OVER', 250, 148, rgba8(255, 80, 160, 255));
      printTight('Score: ' + score, 268, 170, rgba8(255, 220, 80, 255));
      printTight('Best:  ' + best, 268, 184, rgba8(120, 200, 255, 255));
      printFlash(248, 202, 'Z to retry', rgba8(255, 220, 80, 255), -time, 1.6);
   }
}
