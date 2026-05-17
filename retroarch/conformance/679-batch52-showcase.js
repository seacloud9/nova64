// Conformance cart 679: Batch 52 combined showcase.
// project3DToScreen, screenToRay, getViewDirection, cameraDistanceTo, isInFrustum,
// getMeshPos, getMeshRot, getMeshScale, setMeshPos, setMeshRot, setMeshScl, getWorldUp

let errors = [];
let t = 0;
let meshes3d = [];
const N = 6;

export function init() {
   const needed = ['project3DToScreen','screenToRay','getViewDirection','cameraDistanceTo',
                   'isInFrustum','getMeshPos','getMeshRot','getMeshScale',
                   'setMeshPos','setMeshRot','setMeshScl','getWorldUp'];
   for (const f of needed) {
      if (typeof globalThis[f] !== 'function') errors.push(f + '-missing');
   }
   if (errors.length) return;

   setCamera([0, 2, 8], [0, 0, 0]);

   for (let i = 0; i < N; i++) {
      const angle = (i / N) * Math.PI * 2;
      const m = createSphere(0.4, rgba8(
         (i * 40 + 60) & 255, (i * 80 + 100) & 255, (i * 120 + 200) & 255, 255));
      setMeshPos(m, Math.cos(angle) * 3, 0, Math.sin(angle) * 3);
      meshes3d.push(m);
   }

   const up = getWorldUp();
   if (!up || Math.abs(up[1] - 1) > 0.01) errors.push('up-fail');

   const vd = getViewDirection();
   if (!vd || typeof vd.z !== 'number') errors.push('viewdir-fail');
}

export function update(dt) {
   t += dt;
   if (errors.length) return;
   for (let i = 0; i < meshes3d.length; i++) {
      const angle = (i / N) * Math.PI * 2 + t * 0.5;
      setMeshPos(meshes3d[i], Math.cos(angle) * 3, Math.sin(t + i) * 0.5, Math.sin(angle) * 3);
      setMeshRot(meshes3d[i], t * 0.3, t * 0.5 + i, 0);
   }
}

export function draw() {
   cls(rgba8(4, 6, 18, 255));
   printBold('679 BATCH 52', 4, 4, rgba8(200, 220, 255, 255));
   if (errors.length) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }
   print('ok', 4, 14, rgba8(80, 255, 120, 255));

   // project 3D sphere centers to screen and draw 2D markers
   for (let i = 0; i < meshes3d.length; i++) {
      const pos = getMeshPos(meshes3d[i]);
      if (!pos) continue;
      const p = project3DToScreen(pos[0], pos[1], pos[2]);
      if (p && p.visible) {
         rect(Math.floor(p.x) - 3, Math.floor(p.y) - 3, 6, 6,
              hslColor(i * 40, 0.9, 0.6, 220));
      }
   }

   const d = cameraDistanceTo(0, 0, 0);
   print('cam dist: ' + d.toFixed(1), 4, 24, rgba8(160, 200, 255, 200));

   const inF = isInFrustum(0, 0, 0, 1.0);
   print('center in frustum: ' + inF, 4, 34, rgba8(160, 200, 255, 200));
}
