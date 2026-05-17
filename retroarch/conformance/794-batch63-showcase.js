// Conformance cart 794: Batch 63 showcase — 2D physics bodies.

let t = 0;
let balls = [];
const NUM = 6;
const SW = 640, SH = 360;

export function init() {
   for (let i = 0; i < NUM; i++) {
      const bx = 80 + i * 80;
      const by = 40 + (i % 3) * 25;
      const b = createBody(bx, by, 14, 14, 1.0);
      setBodyGravity(b, 0, 280);
      setBodyVel(b, (i - 2.5) * 35, -100 - i * 18);
      setBodyRestitution(b, 0.65);
      balls.push(b);
   }
}

export function update(dt) {
   t += dt;
   updateBodies(dt);
   for (const b of balls) {
      const p = getBodyPos(b);
      const v = getBodyVel(b);
      if (p[1] > SH - 18) {
         setBodyPos(b, p[0], SH - 18);
         setBodyVel(b, v[0] * 0.88, -Math.abs(v[1]) * 0.65);
      }
      if (p[0] < 10) { setBodyPos(b, 10, p[1]); setBodyVel(b, Math.abs(v[0]), v[1]); }
      if (p[0] > SW - 10) { setBodyPos(b, SW - 10, p[1]); setBodyVel(b, -Math.abs(v[0]), v[1]); }
   }
   for (let i = 0; i < balls.length; i++)
      for (let j = i + 1; j < balls.length; j++)
         if (bodiesCollide(balls[i], balls[j]))
            resolveBodyCollision(balls[i], balls[j]);
}

export function draw() {
   cls(rgba8(4, 5, 14, 255));
   printBold('794 BATCH 63', 4, 4, rgba8(200, 220, 255, 255));
   print('2D physics', 4, 14, rgba8(80, 255, 120, 255));
   hline(0, SH - 18, SW, rgba8(60, 80, 200, 180));
   const cols = [
      rgba8(255, 80,  80,  220), rgba8(80,  200, 255, 220),
      rgba8(255, 220, 50,  220), rgba8(150, 255, 80,  220),
      rgba8(200, 80,  255, 220), rgba8(255, 140, 40,  220)
   ];
   for (let i = 0; i < balls.length; i++) {
      const p = getBodyPos(balls[i]);
      circfill(p[0], p[1], 7, cols[i % cols.length]);
   }
}
