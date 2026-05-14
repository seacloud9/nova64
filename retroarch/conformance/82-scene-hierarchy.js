// Conformance cart 82: scene hierarchy — setParent / clearParent / getWorldPosition

let parent_mesh, child_mesh;
let init_ok = false;

export function init() {
   parent_mesh = createCube(0.5, rgba8(100, 180, 255, 255), [0, 0, -5]);
   child_mesh  = createCube(0.3, rgba8(255, 120, 80, 255), [1, 0, 0]);

   // setParent should not throw
   setParent(child_mesh, parent_mesh);

   // getWorldPosition should return an object
   const wp = getWorldPosition(child_mesh);
   if (!wp || typeof wp.x !== 'number') throw new Error('getWorldPosition failed');

   // clearParent should work
   clearParent(child_mesh);
   const wp2 = getWorldPosition(child_mesh);
   if (!wp2 || typeof wp2.x !== 'number') throw new Error('getWorldPosition after clearParent failed');

   // Re-attach for visual frame
   setParent(child_mesh, parent_mesh);

   // Invalid handles should not throw
   setParent(0, parent_mesh);
   setParent(child_mesh, 0);
   clearParent(9999);

   init_ok = true;
}

export function update(dt) {
   rotateMesh(parent_mesh, 0, dt, 0);
}

export function draw() {
   cls(rgba8(12, 16, 24, 255));
   print('82 HIERARCHY', 4, 4, rgba8(100, 220, 255, 255));
   print(init_ok ? 'PASS' : 'FAIL', 4, 14,
      init_ok ? rgba8(100, 255, 100, 255) : rgba8(255, 80, 80, 255));
   const wp = getWorldPosition(child_mesh);
   if (wp) print('wx=' + wp.x.toFixed(2), 4, 24, rgba8(200, 200, 200, 255));
}
