// Conformance cart 715: Batch 55 showcase — 3D particle system.
// createPS3D, setPS3DPos/Gravity/Rate/Color/Size/Lifetime/Speed, updatePS3D, drawParticles3D

let errors = [];
let t = 0;
let ps1, ps2, ps3;
let pillar;

export function init() {
   const needed = ['createPS3D','setPS3DPos','setPS3DGravity','setPS3DRate',
                   'setPS3DColor','setPS3DSize','setPS3DLifetime','setPS3DSpeed',
                   'updatePS3D','drawParticles3D','emitPS3D'];
   for (const f of needed) {
      if (typeof globalThis[f] !== 'function') errors.push(f + '-missing');
   }
   if (errors.length) return;

   setCamera([0, 3, 10], [0, 1, 0]);
   setLightDirection(1, 2, 1);

   // Central pillar
   pillar = createCylinder(0.3, 3, rgba8(60, 80, 120, 255));
   setPosition(pillar, 0, 1.5, 0);

   // Fire particles — upward with no gravity
   ps1 = createPS3D(0, 3, 0, {
      rate: 50, spread: 0.5,
      speedMin: 1.0, speedMax: 2.5,
      lifetimeMin: 0.3, lifetimeMax: 0.8,
      colorStart: rgba8(255, 200, 40, 240),
      colorEnd:   rgba8(255, 40, 0, 0),
      sizeStart: 0.18, sizeEnd: 0.02
   });
   setPS3DGravity(ps1, 0, 2, 0);

   // Sparks — outward burst, falls
   ps2 = createPS3D(0, 3, 0, {
      rate: 20, spread: 1.5,
      speedMin: 2, speedMax: 6,
      lifetimeMin: 0.4, lifetimeMax: 1.2,
      colorStart: rgba8(255, 240, 120, 220),
      colorEnd:   rgba8(255, 80, 20, 0),
      sizeStart: 0.08, sizeEnd: 0.01
   });
   setPS3DGravity(ps2, 0, -6, 0);

   // Smoke — slow upward drift
   ps3 = createPS3D(0, 3.5, 0, {
      rate: 8, spread: 0.3,
      speedMin: 0.5, speedMax: 1.0,
      lifetimeMin: 1.0, lifetimeMax: 2.0,
      colorStart: rgba8(160, 160, 160, 100),
      colorEnd:   rgba8(80, 80, 80, 0),
      sizeStart: 0.25, sizeEnd: 0.6
   });
   setPS3DGravity(ps3, 0, 0.8, 0);
}

export function update(dt) {
   t += dt;
   if (errors.length) return;
   // Flicker fire position
   setPS3DPos(ps1, Math.sin(t*5)*0.05, 3, Math.cos(t*7)*0.05);
   setPS3DPos(ps2, Math.sin(t*3)*0.1,  3, Math.cos(t*4)*0.1);
   updatePS3D(dt);
}

export function draw() {
   cls(rgba8(4, 5, 14, 255));
   printBold('715 BATCH 55', 4, 4, rgba8(200, 220, 255, 255));
   if (errors.length) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }
   print('ok', 4, 14, rgba8(80, 255, 120, 255));
   print('3D particles', 4, 24, rgba8(200, 160, 80, 200));
   drawParticles3D();
}
