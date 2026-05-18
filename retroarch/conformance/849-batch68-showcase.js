// Conformance cart 849: Batch 68 showcase — mesh path followers.

let t = 0;
let spline, followers = [], meshes = [];
const COLORS = [
   0xff5050ff, 0x50ff80ff, 0x5080ffff,
   0xffcc30ff, 0xcc50ffff,
];
const N = 5;

export function init() {
   setCamera([0, 6, 14], [0, 0, 0]);
   setLightDirection(0.8, 1.5, 1);

   // Shared figure-8-ish 3D spline
   spline = createSpline3D([
      -5, 0,  0,
       0, 2, -4,
       5, 0,  0,
       0,-1,  4,
      -5, 0,  0,
   ]);

   for (let i = 0; i < N; i++) {
      const m = createSphere(0.4, COLORS[i]);
      meshes.push(m);
      const f = createMeshFollower(m, spline, 1.0 + i * 0.4);
      setFollowerLooping(f, true);
      setFollowerLookAhead(f, true);
      // Stagger start positions along the path
      playFollower(f);
      updateFollowers(i * 0.4);
      followers.push(f);
   }
}

export function update(dt) {
   t += dt;
   updateFollowers(dt);
}

export function draw() {
   cls(rgba8(4, 5, 14, 255));
   printBold('849 BATCH 68', 4, 4, rgba8(200, 220, 255, 255));
   print('mesh followers', 4, 14, rgba8(80, 255, 120, 255));
   for (let i = 0; i < N; i++) {
      const prog = getFollowerProgress(followers[i]);
      print('f' + i + ': ' + prog.toFixed(2), 4, 24 + i * 10, rgba8(140, 180, 255, 180));
   }
}
