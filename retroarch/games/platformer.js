// Nova64 Game Cart: PRISM JUMP
// A 3D platformer with a behind-the-player camera.
// Arrow keys to move, Z to jump. Reach the gold star!
//
// Showcases: createCube, createSphere, createTorus, setMeshPos, getMeshPos,
//             setCamera, cameraDistanceTo, setMeshColor, setMeshVisible,
//             getMeshBounds, setMeshLayer

// ──────────────────────────────────────────────────────────────────────────────
// World
const GRAVITY = -16;
const JUMP_SPEED = 7;
const MOVE_SPEED = 5;
const CAM_DIST = 6;
const CAM_HEIGHT = 3;

const PLATFORMS = [
   // {x, y, z, w, d, color}
   { x:  0, y: -1, z:  0, w: 6,  d: 4,  color: rgba8(60,  100, 180, 255) }, // start
   { x:  5, y:  0, z: -3, w: 3,  d: 2,  color: rgba8(80,  140, 200, 255) },
   { x:  9, y:  1, z: -2, w: 2,  d: 2,  color: rgba8(100, 160, 220, 255) },
   { x:  7, y:  2, z:  2, w: 2,  d: 3,  color: rgba8(120, 180, 230, 255) },
   { x:  3, y:  3, z:  4, w: 3,  d: 2,  color: rgba8(140, 200, 240, 255) },
   { x: -1, y:  4, z:  3, w: 2,  d: 2,  color: rgba8(160, 220, 255, 255) }, // goal platform
];

// ──────────────────────────────────────────────────────────────────────────────
let player;
let playerX, playerY, playerZ;
let velX, velY, velZ;
let grounded, jumpsLeft;
let platforms = [];
let goalMesh, goalAngle;
let t = 0;
let score = 0, won = false, dead = false;
let camYaw = 0;
let coinMeshes = [];
let coins = [];

// ──────────────────────────────────────────────────────────────────────────────
export function init() {
   // Build platforms
   platforms = [];
   for (const p of PLATFORMS) {
      const m = createCube(p.w, 0.5, rgba8(80, 80, 80, 255));
      setScale(m, p.w, 0.5, p.d);
      setPosition(m, p.x, p.y - 0.25, p.z);
      setMeshColor(m, p.color);
      platforms.push({ mesh: m, ...p });
   }

   // Player sphere
   player = createSphere(0.4, rgba8(255, 220, 80, 255));
   playerX = 0; playerY = 0.5; playerZ = 0;
   velX = 0; velY = 0; velZ = 0;
   grounded = false; jumpsLeft = 2;
   setPosition(player, playerX, playerY, playerZ);

   // Goal: spinning torus on last platform
   const goal = PLATFORMS[PLATFORMS.length - 1];
   goalMesh = createTorus(0.5, 0.12, rgba8(255, 220, 40, 255));
   setPosition(goalMesh, goal.x, goal.y + 1.2, goal.z);
   goalAngle = 0;

   // Coins on platforms (skipping first and last)
   coinMeshes = []; coins = [];
   for (let i = 1; i < PLATFORMS.length - 1; i++) {
      const p = PLATFORMS[i];
      const m = createSphere(0.18, rgba8(255, 200, 40, 255));
      setPosition(m, p.x, p.y + 0.8, p.z);
      coinMeshes.push(m);
      coins.push({ mesh: m, x: p.x, y: p.y + 0.8, z: p.z, collected: false });
   }

   score = 0; won = false; dead = false;
   setCamera([playerX, playerY + CAM_HEIGHT, playerZ + CAM_DIST],
             [playerX, playerY, playerZ]);
}

function isOnPlatform(px, py, pz) {
   for (const p of platforms) {
      if (Math.abs(px - p.x) <= p.w / 2 + 0.3 &&
          Math.abs(pz - p.z) <= p.d / 2 + 0.3 &&
          py >= p.y - 0.05 && py <= p.y + 0.7) {
         return p.y;
      }
   }
   return null;
}

// ──────────────────────────────────────────────────────────────────────────────
export function update(dt) {
   if (won || dead) {
      if (btnp(BUTTON_Z)) init();
      return;
   }
   t += dt;
   goalAngle += dt * 1.5;
   setRotation(goalMesh, goalAngle * 0.5, goalAngle, 0);

   // Camera yaw (if D-pad used while standing)
   const camX = playerX + Math.sin(camYaw) * CAM_DIST;
   const camZ = playerZ + Math.cos(camYaw) * CAM_DIST;
   setCamera([camX, playerY + CAM_HEIGHT, camZ], [playerX, playerY + 0.5, playerZ]);

   // Horizontal movement relative to camera yaw
   const fwdX = -Math.sin(camYaw), fwdZ = -Math.cos(camYaw);
   const rgtX =  Math.cos(camYaw), rgtZ = -Math.sin(camYaw);
   let moveX = 0, moveZ = 0;
   if (btn(BUTTON_UP))    { moveX += fwdX; moveZ += fwdZ; }
   if (btn(BUTTON_DOWN))  { moveX -= fwdX; moveZ -= fwdZ; }
   if (btn(BUTTON_LEFT))  { moveX -= rgtX; moveZ -= rgtZ; camYaw -= dt * 1.5; }
   if (btn(BUTTON_RIGHT)) { moveX += rgtX; moveZ += rgtZ; camYaw += dt * 1.5; }

   const mlen = Math.sqrt(moveX*moveX + moveZ*moveZ);
   if (mlen > 0.01) { moveX /= mlen; moveZ /= mlen; }
   velX = moveX * MOVE_SPEED;
   velZ = moveZ * MOVE_SPEED;

   // Jump
   if (btnp(BUTTON_Z) && jumpsLeft > 0) {
      velY = JUMP_SPEED;
      jumpsLeft--;
      grounded = false;
   }

   // Gravity
   velY += GRAVITY * dt;
   playerX += velX * dt;
   playerY += velY * dt;
   playerZ += velZ * dt;

   // Platform collision
   const landY = isOnPlatform(playerX, playerY, playerZ);
   if (landY !== null && velY <= 0) {
      playerY = landY + 0.4;
      velY = 0;
      grounded = true;
      jumpsLeft = 2;
   } else {
      grounded = false;
   }

   // Squash/stretch
   const squash = grounded ? 0.85 : 1.0 + Math.min(0.3, Math.abs(velY) * 0.03);
   setScale(player, 0.4 * (1 / squash), 0.4 * squash, 0.4 * (1 / squash));
   setPosition(player, playerX, playerY, playerZ);

   // Tilt toward movement
   if (mlen > 0.1) {
      setRotation(player, moveZ * 0.4, 0, -moveX * 0.4);
   }

   // Coins
   for (const c of coins) {
      if (c.collected) continue;
      const dx = playerX - c.x, dy = playerY - c.y, dz = playerZ - c.z;
      if (Math.sqrt(dx*dx + dy*dy + dz*dz) < 0.7) {
         c.collected = true;
         setMeshVisible(c.mesh, false);
         score += 50;
      }
   }

   // Goal
   const gp = PLATFORMS[PLATFORMS.length - 1];
   const gdx = playerX - gp.x, gdy = playerY - gp.y, gdz = playerZ - gp.z;
   if (Math.sqrt(gdx*gdx + gdy*gdy + gdz*gdz) < 1.5) {
      won = true;
   }

   // Fall death
   if (playerY < -8) {
      dead = true;
   }
}

// ──────────────────────────────────────────────────────────────────────────────
export function draw() {
   cls(rgba8(10, 14, 30, 255));

   if (won) {
      printBold('YOU WIN!', 226, 140, rgba8(255, 220, 40, 255));
      print('Score: ' + score, 254, 162, rgba8(200, 220, 255, 255));
      print('Z to play again', 222, 182, rgba8(160, 200, 255, 180));
      return;
   }
   if (dead) {
      printBold('FELL!', 272, 150, rgba8(255, 80, 80, 255));
      print('Z to retry', 248, 170, rgba8(200, 200, 255, 200));
      return;
   }

   // Coin bounce animation
   for (const c of coins) {
      if (!c.collected) {
         setPosition(c.mesh, c.x, c.y + Math.sin(t * 3) * 0.12, c.z);
      }
   }

   // HUD
   printBold('PRISM JUMP', 4, 4, rgba8(120, 200, 255, 255));
   print('Score: ' + score, 4, 18, rgba8(200, 220, 255, 220));
   print(grounded ? '  grounded' : '  airborne', 4, 28, rgba8(160, 200, 255, 150));

   const dist = cameraDistanceTo(playerX, playerY, playerZ);
   print('cam dist: ' + dist.toFixed(1), 4, 38, rgba8(120, 160, 200, 120));

   // Arrow: direction to goal
   const gp = PLATFORMS[PLATFORMS.length - 1];
   const gdx = gp.x - playerX, gdz = gp.z - playerZ;
   const gangle = Math.atan2(gdx, gdz) - camYaw;
   const ax = 580, ay = 30, ar = 12;
   line(ax, ay, ax + Math.floor(Math.sin(gangle) * ar), ay - Math.floor(Math.cos(gangle) * ar),
        rgba8(255, 220, 40, 200));
   print('GOAL', 564, 44, rgba8(200, 180, 60, 180));
}
