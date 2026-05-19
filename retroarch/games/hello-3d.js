// Nova64 Game Cart: HELLO 3D WORLD
// Six spinning cubes + four bouncing spheres, orbiting camera.
// Press Z to start. Showcases: createCube, createSphere, setPosition,
// rotateMesh, setCameraPosition, setCameraFOV, setFog, setLightDirection.

const CUBE_COLORS = [
   rgba8(255,  45,  45, 255),
   rgba8( 45, 255,  70, 255),
   rgba8( 50, 110, 255, 255),
   rgba8(255, 240,  45, 255),
   rgba8(255,  45, 220, 255),
   rgba8( 45, 230, 255, 255),
];

let cubes = [], spheres = [], ground;
let time = 0, camAngle = 0;
let state = 'start', startTime = 0;

export function init() {
   state = 'start'; startTime = 0; time = 0; camAngle = 0;
   cubes = []; spheres = [];

   setCameraPosition(0, 8, 16);
   setCameraTarget(0, 0, 0);
   setCameraFOV(60);
   setLightDirection(-0.5, -1, -0.3);
   setFog(rgba8(12, 16, 40, 255), 18, 60);

   for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const x = Math.cos(a) * 8, z = Math.sin(a) * 8;
      const m = createCube(1.8, 1.8, 1.8, CUBE_COLORS[i]);
      setPosition(m, x, 0, z);
      cubes.push({ mesh: m, x, z, rotSpeed: 0.9 + i * 0.28, bobPhase: i * 1.05 });
   }

   for (let i = 0; i < 4; i++) {
      const sx = (i - 1.5) * 4.5;
      const m = createSphere(0.65, rgba8(120, 190, 255, 255));
      setPosition(m, sx, 1.5, 0);
      spheres.push({ mesh: m, x: sx, y: 1.5, z: 0, vy: -0.8 + i * 0.3 });
   }

   ground = createCube(32, 0.3, 32, rgba8(48, 52, 90, 255));
   setPosition(ground, 0, -2.15, 0);
}

export function update(dt) {
   if (state === 'start') {
      startTime += dt;
      if (btnp("z") || btnp("x")) state = 'playing';
   }
   time += dt;

   for (const c of cubes) {
      c.bobPhase += dt * 2;
      setPosition(c.mesh, c.x, Math.sin(c.bobPhase) * 1.6, c.z);
      rotateMesh(c.mesh, dt * c.rotSpeed, dt * c.rotSpeed * 0.7, 0);
   }

   if (state === 'playing') {
      for (const s of spheres) {
         s.vy -= 9.5 * dt;
         s.y  += s.vy * dt;
         if (s.y < -1.1) { s.y = -1.1; s.vy = Math.abs(s.vy) * 0.78; }
         setPosition(s.mesh, s.x, s.y, s.z);
      }
   }

   const orbitSpeed = state === 'start' ? 0.22 : 0.38;
   camAngle += dt * orbitSpeed;
   setCameraPosition(Math.cos(camAngle) * 17, 8, Math.sin(camAngle) * 17);
   setCameraTarget(0, 0, 0);
}

export function draw() {
   cls(rgba8(2, 4, 14, 255));

   if (state === 'start') {
      rectfill(130, 106, 380, 160, rgba8(6, 8, 26, 245));
      glowRect(130, 106, 380, 160, rgba8(40, 180, 255, 230), 7);
      printBold('HELLO 3D WORLD', 166, 122, rgba8(40, 225, 255, 255));
      print('6 spinning cubes · 4 bouncing spheres', 148, 144, rgba8(170, 200, 255, 210));
      print('N64 / PSX-style · GLES3 renderer', 168, 158, rgba8(130, 155, 220, 190));
      glowLine(150, 178, 490, 178, rgba8(40, 80, 210, 180), 1);
      printFlash(238, 190, 'Z to start', rgba8(255, 225, 80, 255), -startTime, 1.8);
      return;
   }

   printBold('HELLO 3D WORLD', 8, 6, rgba8(40, 220, 255, 255));
   print('cubes: ' + cubes.length + '   spheres: ' + spheres.length, 8, 22, rgba8(140, 180, 255, 210));
   print('t = ' + time.toFixed(1) + 's', 8, 36, rgba8(160, 160, 220, 180));
   print('Arrows+Z: move   orbit cam active', 8, 344, rgba8(100, 120, 180, 140));
}
