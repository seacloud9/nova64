// Conformance cart 248: reflectVector and rotateVector.

let errors = [];

export function init() {
   if (typeof reflectVector !== 'function') { errors.push('reflectVector-missing'); return; }
   if (typeof rotateVector  !== 'function') { errors.push('rotateVector-missing');  return; }

   // reflectVector: v=(1,0) off normal (0,1) → should be (1,0) unchanged (reflects about x-axis)
   // Actually: reflect v off normal n: r = v - 2(v·n)n
   // v=(1,-1), n=(0,1): r = (1,-1) - 2*(0-1)*(0,1) = (1,-1)+(0,2) = (1,1)
   const r1 = reflectVector(1, -1, 0, 1);
   if (Math.abs(r1.x - 1) > 0.01) errors.push('reflect-x: ' + r1.x);
   if (Math.abs(r1.y - 1) > 0.01) errors.push('reflect-y: ' + r1.y);

   // rotateVector: (1,0) by 90° → (0,1)
   const r2 = rotateVector(1, 0, 90);
   if (Math.abs(r2.x) > 0.01)      errors.push('rot-x: ' + r2.x);
   if (Math.abs(r2.y - 1) > 0.01)  errors.push('rot-y: ' + r2.y);
}

export function update(dt) {}

export function draw() {
   cls(rgba8(8, 10, 18, 255));
   print('248 REFLECT ROTATE', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Bounce simulation: ball hitting a tilted wall
   const cx = 320, cy = 200;
   // Draw wall (line)
   const wx1 = 200, wy1 = 100, wx2 = 440, wy2 = 300;
   line(wx1, wy1, wx2, wy2, rgba8(80, 120, 200, 255));

   // Wall normal: perpendicular to (dx,dy)
   const wdx = wx2-wx1, wdy = wy2-wy1;
   const wlen = Math.sqrt(wdx*wdx+wdy*wdy);
   const nx = -wdy/wlen, ny = wdx/wlen;

   // Incoming velocity
   const vx = 2, vy = 3;
   const r = reflectVector(vx, vy, nx, ny);

   // Draw incoming arrow
   drawArrow(cx, cy, cx + vx*30, cy + vy*30, rgba8(255, 180, 60, 255));
   // Draw reflected arrow
   drawArrow(cx, cy, cx + r.x*30, cy + r.y*30, rgba8(80, 220, 140, 255));
   // Draw normal
   line(cx, cy, cx + nx*40, cy + ny*40, rgba8(180, 100, 255, 255));

   // Rotation fan
   for (let i = 0; i < 12; i++) {
      const ang = i * 30;
      const rv = rotateVector(50, 0, ang);
      const c = rgba8(100 + i*12, 200, 80 + i*14, 255);
      line(480, 180, 480 + rv.x, 180 + rv.y, c);
   }

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
