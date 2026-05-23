// Nova64 Game Cart: TWEEN BOUNCE (RetroArch port of examples/tween-bounce)
// 6 balls bouncing on easeOutBounce, with shadows that scale with height.

const W = 640;
const H = 360;
const BALL_COUNT = 6;
const COLORS = [
   rgba8(0xff, 0x44, 0x66, 255),
   rgba8(0x44, 0xaa, 0xff, 255),
   rgba8(0xff, 0xcc, 0x00, 255),
   rgba8(0x44, 0xff, 0x88, 255),
   rgba8(0xff, 0x88, 0x44, 255),
   rgba8(0xaa, 0x44, 0xff, 255),
];

let balls = [];

function makeBall(radius, dur, delay, color, x) {
   return {
      x, radius, color, dur, delay,
      handle: 0,
      goingDown: true,
      paused: true,
      timer: 0,
   };
}

export function init() {
   balls = [];
   for (let i = 0; i < BALL_COUNT; i++) {
      const x = 30 + (i / (BALL_COUNT - 1)) * (W - 60);
      const radius = 12 + Math.random() * 8;
      const dur = 0.6 + Math.random() * 0.5;
      const delay = i * 0.12;
      balls.push(makeBall(radius, dur, delay, COLORS[i % COLORS.length], x));
   }
}

export function update(dt) {
   updateTweens(dt);
   for (const b of balls) {
      if (b.paused) {
         b.timer += dt;
         if (b.timer >= b.delay) {
            b.paused = false;
            b.handle = createTween(-b.radius, H - b.radius * 2 - 10, b.dur, 'easeOutBounce');
         }
         continue;
      }
      if (tweenDone(b.handle)) {
         destroyTween(b.handle);
         b.goingDown = !b.goingDown;
         if (b.goingDown) {
            b.handle = createTween(-b.radius, H - b.radius * 2 - 10, b.dur, 'easeOutBounce');
         } else {
            b.handle = createTween(H - b.radius * 2 - 10, -b.radius, b.dur, 'easeInBounce');
         }
      }
   }
}

export function draw() {
   cls(rgba8(0x0a, 0x0a, 0x1a, 255));
   rectfill(0, H - 10, W, 10, rgba8(0x22, 0x33, 0x44, 255));

   for (const b of balls) {
      const y = b.handle ? getTweenValue(b.handle) : -b.radius;
      const shadowScale = 0.3 + 0.7 * (y / (H - b.radius * 2 - 10));
      const sw = b.radius * 2 * shadowScale;
      ellipsefill(b.x, H - 8, sw, 6, rgba8(0, 0, 0, 136));
      ellipsefill(b.x, y + b.radius, b.radius * 2, b.radius * 2, b.color);
      ellipsefill(
         b.x - b.radius * 0.3,
         y + b.radius * 0.4,
         b.radius * 0.55,
         b.radius * 0.4,
         rgba8(255, 255, 255, 85),
      );
   }

   print('TWEEN BOUNCE', 4, 4, rgba8(255, 255, 255, 255));
   print('6 balls - easeOutBounce - pingpong', 4, 12, rgba8(0x77, 0x88, 0x99, 255));
}
