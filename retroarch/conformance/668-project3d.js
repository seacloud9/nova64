// Conformance cart 668: project3DToScreen, screenToRay, getViewDirection,
// cameraDistanceTo, isInFrustum

let errors = [];

export function init() {
   const needed = ['project3DToScreen','screenToRay','getViewDirection',
                   'cameraDistanceTo','isInFrustum'];
   for (const f of needed) {
      if (typeof globalThis[f] !== 'function') { errors.push(f + '-missing'); }
   }
   if (errors.length) return;

   // Set up a camera so VP matrix is valid
   setCamera([0,0,5], [0,0,0]);

   const vd = getViewDirection();
   if (!vd || typeof vd.x !== 'number') { errors.push('viewdir-bad'); return; }
   const vlen = Math.sqrt(vd.x*vd.x + vd.y*vd.y + vd.z*vd.z);
   if (vlen < 0.9 || vlen > 1.1) errors.push('viewdir-not-unit:' + vlen.toFixed(3));

   const dist = cameraDistanceTo(0, 0, 0);
   if (Math.abs(dist - 5) > 0.5) errors.push('dist-bad:' + dist.toFixed(2));

   const ray = screenToRay(320, 180);
   if (!ray || !ray.origin || !ray.dir) errors.push('ray-bad');

   const proj = project3DToScreen(0, 0, 0);
   if (!proj || typeof proj.x !== 'number') errors.push('proj-bad');

   const inF = isInFrustum(0, 0, 0, 0.5);
   if (typeof inF !== 'boolean') errors.push('frustum-bad-type');
}

export function update(dt) {}

export function draw() {
   cls(rgba8(8, 10, 24, 255));
   printBold('668 PROJECT 3D', 4, 4, rgba8(200, 220, 255, 255));
   if (errors.length) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
   } else {
      print('ok', 4, 14, rgba8(80, 255, 120, 255));
      print('camera queries ok', 4, 24, rgba8(160, 220, 255, 200));
   }
}
