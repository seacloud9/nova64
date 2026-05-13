// Showcase cart 30: multi-API demonstration
// Uses 3D scene, 2D overlay HUD, keyboard, mouse, audio, assets, storage,
// post-processing, and runtime utilities together — demonstrating cart parity
// with the browser Nova64 runtime.

let cube, sphere, plane;
let score = 0;
let angle = 0;
let prevSpace = false;
let postActive = false;

export function init() {
   setAmbientLight(rgba8(30, 40, 60, 255), 0.6);
   setLightDirection(-0.5, -1, -0.4);
   setCameraPosition(0, 1.5, 5);
   setCameraTarget(0, 0, 0);

   cube   = createCube(1, rgba8(80, 120, 220, 255), [-1.5, 0, 0]);
   sphere = createSphere(0.7, rgba8(220, 80, 80, 255), [0, 0, 0]);
   plane  = createPlane(6, 4, rgba8(50, 70, 50, 255));
   setPosition(plane, 0, -1.2, 0);

   // Try to load a saved high score
   const saved = nova64.storage.loadJSON('highscore', null);
   if (saved && typeof saved.score === 'number')
      score = saved.score;

   nova64.post.setVignette(0.3);
}

export function update(dt) {
   angle += dt * 0.8;
   rotateMesh(cube, 0, dt * 1.2, 0);
   rotateMesh(sphere, dt * 0.7, 0, dt * 0.5);

   // Space bar: toggle post effect + play a synth beep + bump score
   const spaceNow = key('space');
   if (spaceNow && !prevSpace) {
      score++;
      postActive = !postActive;
      nova64.post.setCRT(postActive ? 0.6 : 0);
      sfx({ wave: 'square', freq: 440 + score * 80, dur: 0.08, vol: 0.3 });
      if (score > 0)
         nova64.storage.saveJSON('highscore', { score });
   }
   prevSpace = spaceNow;

   // Mouse movement pans the cube slightly
   const mx = mouseX();
   moveMesh(cube, mx * 0.001, 0, 0);

   // Camera orbit
   setCameraPosition(Math.sin(angle * 0.3) * 5, 1.5, Math.cos(angle * 0.3) * 5);
   setCameraTarget(0, 0, 0);
}

export function draw() {
   cls(rgba8(8, 10, 18, 255));
   draw3d();

   // HUD overlay
   const hw = 640, hh = 20;
   rect(0, 0, hw, hh, rgba8(0, 0, 0, 200), true);
   print('30 SHOWCASE', 4, 4, rgba8(255, 220, 80, 255));
   print('SCORE ' + score, 320, 4, rgba8(80, 255, 120, 255), 'center');
   print('SPACE=toggle-fx  F=' + nova64.frame(), hw - 4, 4, rgba8(160, 160, 160, 255), 'right');

   // Mini circle indicator
   const c = postActive ? rgba8(255, 120, 60, 255) : rgba8(60, 120, 255, 255);
   circfill(620, 10, 5, c);
}
