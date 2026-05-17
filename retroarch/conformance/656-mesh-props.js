// Conformance cart 656: createTorus, createCone, setMeshWireframe, setMeshDoubleSided,
// setMeshLayer, getMeshLayer, setMeshGroup, getMeshGroup, setMeshSortOrder, getSceneMeshCount

let errors = [];

export function init() {
   const needed = ['createTorus','createCone','setMeshWireframe','setMeshDoubleSided',
                   'setMeshLayer','getMeshLayer','setMeshGroup','getMeshGroup',
                   'setMeshSortOrder','getSceneMeshCount'];
   for (const f of needed) {
      if (typeof globalThis[f] !== 'function') { errors.push(f + '-missing'); }
   }
   if (errors.length) return;

   const t = createTorus(1.0, 0.3, rgba8(120, 200, 255, 255));
   if (!t) { errors.push('createTorus-zero'); return; }
   setMeshLayer(t, 2);
   if (getMeshLayer(t) !== 2) errors.push('layer-mismatch');

   setMeshGroup(t, 5);
   if (getMeshGroup(t) !== 5) errors.push('group-mismatch');

   setMeshSortOrder(t, 10);
   setMeshWireframe(t, true);
   setMeshDoubleSided(t, true);

   const c = createCone(0.5, 1.2, rgba8(255, 160, 80, 255));
   if (!c) { errors.push('createCone-zero'); return; }

   const cnt = getSceneMeshCount();
   if (cnt < 2) errors.push('count-lt-2:' + cnt);

   setPosition(t, 0, 0, -3);
   setPosition(c, 2, 0, -3);
}

export function update(dt) {}

export function draw() {
   cls(rgba8(8, 10, 24, 255));
   printBold('656 MESH PROPS', 4, 4, rgba8(200, 220, 255, 255));
   if (errors.length) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
   } else {
      print('ok', 4, 14, rgba8(80, 255, 120, 255));
      print('torus+cone layered', 4, 24, rgba8(160, 220, 255, 200));
   }
}
