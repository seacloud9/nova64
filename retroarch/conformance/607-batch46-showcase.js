// Conformance cart 607: batch 46 combined showcase.
// circle, setCamera, getCamera, createSphereLayout, createPathLayout,
// reflectVec2, projectVec2, createRandomTrigger, tickRandomTrigger,
// colorAlpha, colorScale, frac.

let errors = [];
let t = 0;
let balls = [];
let triggers = [];
const WALLS = {left:10, right:630, top:30, bottom:340};

export function init() {
   const needed = ['circle', 'setCamera', 'getCamera',
                   'createSphereLayout', 'createPathLayout',
                   'reflectVec2', 'projectVec2',
                   'createRandomTrigger', 'tickRandomTrigger',
                   'colorAlpha', 'colorScale', 'frac'];
   for (const f of needed) {
      if (typeof globalThis[f] !== 'function') errors.push(f + '-missing');
   }
   if (errors.length > 0) return;

   // bouncing balls with reflectVec2 off walls
   const cols = [rgba8(255,80,80,255), rgba8(80,255,120,255),
                 rgba8(80,160,255,255), rgba8(255,200,60,255)];
   for (let i = 0; i < 8; i++) {
      const spd = 60 + i * 15;
      const ang = (i / 8) * Math.PI * 2;
      balls.push({
         x: 200 + Math.cos(ang) * 80,
         y: 180 + Math.sin(ang) * 60,
         vx: Math.cos(ang) * spd,
         vy: Math.sin(ang) * spd,
         r: 8 + (i % 3) * 4,
         color: cols[i % cols.length],
      });
   }

   // random triggers at varying chances
   for (let i = 0; i < 10; i++) {
      triggers.push(createRandomTrigger((i + 1) / 11));
   }
}

export function update(dt) {
   t += dt;
   if (errors.length > 0) return;
   for (const b of balls) {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.x - b.r < WALLS.left) {
         const rv = reflectVec2(b.vx, b.vy, 1, 0);
         b.vx = rv.x; b.vy = rv.y;
         b.x = WALLS.left + b.r;
      }
      if (b.x + b.r > WALLS.right) {
         const rv = reflectVec2(b.vx, b.vy, -1, 0);
         b.vx = rv.x; b.vy = rv.y;
         b.x = WALLS.right - b.r;
      }
      if (b.y - b.r < WALLS.top) {
         const rv = reflectVec2(b.vx, b.vy, 0, 1);
         b.vx = rv.x; b.vy = rv.y;
         b.y = WALLS.top + b.r;
      }
      if (b.y + b.r > WALLS.bottom) {
         const rv = reflectVec2(b.vx, b.vy, 0, -1);
         b.vx = rv.x; b.vy = rv.y;
         b.y = WALLS.bottom - b.r;
      }
   }
}

export function draw() {
   cls(rgba8(4, 6, 18, 255));
   printBold('607 BATCH 46', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // bouncing balls (circle outline + fill)
   for (const b of balls) {
      const fade = colorAlpha(b.color, 80);
      circle(Math.floor(b.x), Math.floor(b.y), b.r, fade, true);
      circle(Math.floor(b.x), Math.floor(b.y), b.r, b.color, false);
   }

   // sphere layout — rotated via t
   const sph = createSphereLayout(32, 500, 180, 0, 55);
   for (let i = 0; i < sph.length; i++) {
      const xr = sph[i].x * Math.cos(t) - sph[i].z * Math.sin(t);
      const yr = sph[i].y;
      const zr = sph[i].x * Math.sin(t) + sph[i].z * Math.cos(t);
      const scale = colorScale(hslColor(i * 11, 0.8, 0.5, 255), 0.5 + (zr + 55) / 110);
      const sz = Math.max(1, Math.floor((zr + 55) / 35));
      circle(Math.floor(500 + xr), Math.floor(180 + yr), sz, scale, true);
   }

   // path layout — animated camera offset
   const wpts = [{x:30,y:320,z:0},{x:160,y:290,z:0},{x:290,y:330,z:0},{x:420,y:300,z:0}];
   const path = createPathLayout(wpts, 30);
   for (let i = 0; i + 1 < path.length; i++) {
      line(Math.floor(path[i].x), Math.floor(path[i].y),
           Math.floor(path[i+1].x), Math.floor(path[i+1].y),
           colorAlpha(rgba8(80, 200, 255, 255), 160));
   }
   // animate a dot along the path
   const idx = Math.floor(frac(t * 0.3) * path.length);
   if (path[idx]) {
      circle(Math.floor(path[idx].x), Math.floor(path[idx].y), 5,
             rgba8(255, 200, 60, 255), true);
   }

   // random trigger row
   for (let i = 0; i < triggers.length; i++) {
      const on = tickRandomTrigger(triggers[i]);
      rectfill(20 + i * 22, 360, 38 + i * 22, 374,
               on ? rgba8(255,255,80,255) : rgba8(40,40,80,255));
   }

   // colorScale bar
   for (let i = 0; i < 20; i++) {
      const f = i / 19;
      rectfill(240 + i * 11, 360, 251 + i * 11, 374,
               colorScale(rgba8(255, 100, 40, 255), f));
   }

   // setCamera/getCamera demo — draw a small marker shifted
   setCamera(-30, -10);
   circle(100, 60, 8, rgba8(255, 80, 200, 255), false);
   setCamera(0, 0);
   circle(100, 60, 8, rgba8(80, 80, 180, 120), true);

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
