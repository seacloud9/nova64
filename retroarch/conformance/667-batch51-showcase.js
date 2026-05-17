// Conformance cart 667: Batch 51 combined showcase.
// createTorus, createCone, cloneMesh, getMeshBounds, setMeshWireframe,
// setMeshDoubleSided, setMeshLayer, getMeshLayer, setMeshGroup, getMeshGroup,
// getSceneMeshCount, setMeshSortOrder

let errors = [];
let t = 0;
let torus, cone1, cone2;

export function init() {
   const needed = ['createTorus','createCone','cloneMesh','getMeshBounds',
                   'setMeshWireframe','setMeshDoubleSided','setMeshLayer',
                   'getMeshLayer','setMeshGroup','getMeshGroup',
                   'getSceneMeshCount','setMeshSortOrder'];
   for (const f of needed) {
      if (typeof globalThis[f] !== 'function') errors.push(f + '-missing');
   }
   if (errors.length) return;

   torus = createTorus(1.2, 0.35, rgba8(100, 180, 255, 255));
   setPosition(torus, -2.5, 0, -5);
   setMeshLayer(torus, 1);
   setMeshDoubleSided(torus, true);
   if (getMeshLayer(torus) !== 1) errors.push('layer-fail');

   cone1 = createCone(0.7, 1.5, rgba8(255, 140, 60, 255));
   setPosition(cone1, 0, 0, -5);
   setMeshGroup(cone1, 3);
   if (getMeshGroup(cone1) !== 3) errors.push('group-fail');

   cone2 = cloneMesh(cone1);
   if (!cone2) { errors.push('clone-fail'); return; }
   setPosition(cone2, 2.5, 0, -5);
   setMeshColor(cone2, rgba8(80, 240, 160, 255));
   setMeshSortOrder(cone2, 5);

   const b = getMeshBounds(torus);
   if (!b || !b.center) errors.push('bounds-fail');

   const cnt = getSceneMeshCount();
   if (cnt < 3) errors.push('count-fail:' + cnt);
}

export function update(dt) {
   t += dt;
   if (errors.length || !torus) return;
   setRotation(torus, 0, t * 0.8, t * 0.4);
   setRotation(cone1, t * 0.5, 0, 0);
   setRotation(cone2, 0, t * 0.6, t * 0.3);
}

export function draw() {
   cls(rgba8(6, 8, 20, 255));
   printBold('667 BATCH 51', 4, 4, rgba8(200, 220, 255, 255));
   if (errors.length) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
   } else {
      print('ok', 4, 14, rgba8(80, 255, 120, 255));
      print('torus+cone+clone', 4, 24, rgba8(160, 220, 255, 200));
   }
}
