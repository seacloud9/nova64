// Conformance cart 596: circle, setCamera, getCamera,
//                        createSphereLayout, createPathLayout.

let errors = [];

export function init() {
   const needed = ['circle', 'setCamera', 'getCamera',
                   'createSphereLayout', 'createPathLayout'];
   for (const f of needed) {
      if (typeof globalThis[f] !== 'function') errors.push(f + '-missing');
   }
   if (errors.length > 0) return;

   // setCamera / getCamera roundtrip
   setCamera(10, 20);
   const cam = getCamera();
   if (cam.x !== 10 || cam.y !== 20) errors.push('camera-roundtrip');
   setCamera(0, 0);

   // createSphereLayout — count and structure
   const sph = createSphereLayout(12, 0, 0, 0, 50);
   if (!Array.isArray(sph) || sph.length !== 12) errors.push('sphere-length');
   if (typeof sph[0].x !== 'number' || typeof sph[0].y !== 'number' || typeof sph[0].z !== 'number')
      errors.push('sphere-fields');

   // createPathLayout — along a 2-point line
   const pts = [{x:0,y:0,z:0}, {x:100,y:0,z:0}];
   const path = createPathLayout(pts, 5);
   if (!Array.isArray(path) || path.length !== 5) errors.push('path-length');
   if (typeof path[0].t !== 'number') errors.push('path-t-field');
   // middle point should be at x~50
   if (Math.abs(path[2].x - 50) > 1) errors.push('path-midpoint');
}

export function update(dt) {}

export function draw() {
   cls(rgba8(6, 8, 22, 255));
   print('596 CIRCLE CAMERA PATH', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // circle outline + fill demo
   circle(100, 120, 30, rgba8(80, 200, 255, 255), false);
   circle(180, 120, 25, rgba8(255, 120, 80, 255), true);

   // setCamera offset demo
   setCamera(20, 0);
   circle(300, 120, 20, rgba8(80, 255, 120, 255), false);
   setCamera(0, 0);
   circle(300, 120, 20, rgba8(255, 200, 60, 100), true);

   // sphere layout — project onto 2D plane
   const sph2 = createSphereLayout(24, 400, 0, 0, 60);
   for (let i = 0; i < sph2.length; i++) {
      const sz = Math.max(1, Math.floor((sph2[i].z + 60) / 30));
      circ(Math.floor(sph2[i].x), Math.floor(sph2[i].y + 160), sz,
           hslColor(i * 15, 0.8, 0.5, 200));
   }

   // path layout — draw polyline
   const waypoints = [{x:20,y:260,z:0},{x:150,y:230,z:0},{x:280,y:270,z:0},{x:400,y:240,z:0}];
   const path2 = createPathLayout(waypoints, 20);
   for (let i = 0; i < path2.length - 1; i++) {
      line(Math.floor(path2[i].x), Math.floor(path2[i].y),
           Math.floor(path2[i+1].x), Math.floor(path2[i+1].y),
           rgba8(80, 200, 255, 200));
   }
   for (const wp of waypoints) {
      rectfill(wp.x-3, wp.y-3, wp.x+3, wp.y+3, rgba8(255, 200, 60, 255));
   }

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
