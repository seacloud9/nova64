// Conformance cart 704: createPS3D, destroyPS3D, emitPS3D, setPS3DPos,
// setPS3DGravity, setPS3DRate, setPS3DColor, setPS3DSize, setPS3DLifetime,
// setPS3DSpeed, updatePS3D, drawParticles3D

let errors = [];
let ps;

export function init() {
   const needed = ['createPS3D','destroyPS3D','emitPS3D','setPS3DPos',
                   'setPS3DGravity','setPS3DRate','setPS3DColor','setPS3DSize',
                   'setPS3DLifetime','setPS3DSpeed','updatePS3D','drawParticles3D'];
   for (const f of needed) {
      if (typeof globalThis[f] !== 'function') errors.push(f + '-missing');
   }
   if (errors.length) return;

   setCamera([0, 2, 8], [0, 0, 0]);
   ps = createPS3D(0, 0, 0, {
      rate: 30, spread: 0.8,
      speedMin: 2, speedMax: 5,
      lifetimeMin: 0.5, lifetimeMax: 1.2,
      colorStart: rgba8(255, 200, 40, 255),
      colorEnd:   rgba8(255, 60, 20, 0),
      sizeStart: 0.15, sizeEnd: 0.02
   });
   if (!ps) { errors.push('createPS3D-zero'); return; }

   setPS3DPos(ps, 0, 1, 0);
   setPS3DGravity(ps, 0, -3, 0);
   setPS3DRate(ps, 40);
   setPS3DColor(ps, rgba8(255, 200, 40, 255), rgba8(255, 40, 20, 0));
   setPS3DSize(ps, 0.15, 0.01);
   setPS3DLifetime(ps, 0.4, 1.0);
   setPS3DSpeed(ps, 2, 5);
   emitPS3D(ps, 10);
   updatePS3D(0.016);
}

export function update(dt) {
   if (errors.length || !ps) return;
   updatePS3D(dt);
}

export function draw() {
   cls(rgba8(4, 6, 18, 255));
   printBold('704 PS3D', 4, 4, rgba8(200, 220, 255, 255));
   if (errors.length) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
   } else {
      drawParticles3D();
      print('ok', 4, 14, rgba8(80, 255, 120, 255));
   }
}
