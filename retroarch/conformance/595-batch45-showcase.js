// Conformance cart 595: batch 45 combined showcase.

let errors = [];
let h;
let t = 0;
const entities = [];

export function init() {
   const needed = ['aabb', 'circleOverlap', 'drawRect', 'rngRandom', 'rngFloat',
                   'rngPick', 'rngShuffle', 'createSeedFromHash',
                   'getSeed', 'setSeed', 'perpVec2'];
   for (const f of needed) {
      if (typeof globalThis[f] !== 'function') errors.push(f + '-missing');
   }
   if (typeof globalThis['n64Palette'] !== 'object' || globalThis['n64Palette'] === null)
      errors.push('n64Palette-missing');
   if (errors.length > 0) return;

   setSeed(createSeedFromHash('nova64-batch45'));
   h = createRNG(getSeed());

   const palKeys = ['red','green','blue','yellow','cyan','magenta','orange','teal'];
   for (let i = 0; i < 20; i++) {
      entities.push({
         x: rngFloat(h, 20, 600),
         y: rngFloat(h, 40, 300),
         r: rngFloat(h, 8, 20),
         vx: rngFloat(h, -40, 40),
         vy: rngFloat(h, -40, 40),
         color: n64Palette[rngPick(h, palKeys)],
      });
   }
}

export function update(dt) {
   t += dt;
   if (errors.length > 0) return;
   for (const e of entities) {
      e.x += e.vx * dt;
      e.y += e.vy * dt;
      if (e.x < 10 || e.x > 630) { e.vx *= -1; e.x = Math.max(10, Math.min(630, e.x)); }
      if (e.y < 30 || e.y > 340) { e.vy *= -1; e.y = Math.max(30, Math.min(340, e.y)); }
   }
}

export function draw() {
   cls(rgba8(4, 6, 18, 255));
   printBold('595 BATCH 45', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Draw entities with n64Palette colors; highlight collisions via circleOverlap
   for (let i = 0; i < entities.length; i++) {
      let hit = false;
      for (let j = i + 1; j < entities.length; j++) {
         if (circleOverlap(entities[i].x, entities[i].y, entities[i].r,
                           entities[j].x, entities[j].y, entities[j].r)) {
            hit = true;
            break;
         }
      }
      circ(Math.floor(entities[i].x), Math.floor(entities[i].y),
           Math.floor(entities[i].r),
           hit ? rgba8(255, 255, 80, 255) : entities[i].color);
   }

   // drawRect band showing n64Palette
   const palKeys2 = ['red','green','blue','yellow','cyan','magenta','orange','teal','gold','silver'];
   for (let i = 0; i < palKeys2.length; i++) {
      drawRect(20 + i * 58, 320, 53, 18, n64Palette[palKeys2[i]]);
   }

   // aabb detection zone
   const zone = {x: 260, y: 150, w: 120, h: 80};
   rectfill(zone.x, zone.y, zone.x + zone.w, zone.y + zone.h, rgba8(30, 50, 80, 80));
   let inZone = 0;
   for (const e of entities) {
      const er = Math.floor(e.r);
      if (aabb(e.x - er, e.y - er, er*2, er*2, zone.x, zone.y, zone.w, zone.h)) inZone++;
   }
   print('in zone:' + inZone, zone.x + 2, zone.y + 2, rgba8(200, 255, 80, 255));

   // perpVec2 for velocity arrow
   const e0 = entities[0];
   if (e0) {
      const speed = Math.sqrt(e0.vx * e0.vx + e0.vy * e0.vy);
      if (speed > 0) {
         const nx = e0.vx / speed, ny = e0.vy / speed;
         const p = perpVec2(nx, ny);
         const px = Math.floor(e0.x), py = Math.floor(e0.y);
         line(px, py, px + Math.floor(nx * 20), py + Math.floor(ny * 20), rgba8(255, 255, 80, 255));
         line(px, py, px + Math.floor(p.x * 12), py + Math.floor(p.y * 12), rgba8(80, 255, 200, 200));
      }
   }

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
