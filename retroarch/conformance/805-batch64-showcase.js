// Conformance cart 805: Batch 64 showcase — spline paths.

let t = 0;
let s2d, s3d;
let tracer = 0;

export function init() {
   setCamera([0, 3, 12], [0, 0, 0]);
   setLightDirection(0.5, 1, 0.7);
   s2d = createSpline([20,240, 120,160, 240,300, 360,180, 480,260, 600,200]);
   s3d = createSpline3D([
      -4, 0,  0,
       0, 2, -3,
       4, 0, -1,
       2,-1,  3,
      -2, 1,  4
   ]);
}

export function update(dt) {
   t += dt;
   tracer = (tracer + dt * 0.18) % 1.0;
   // animate 3D spline tracer as a moving sphere
   const p3 = getSpline3DPoint(s3d, tracer);
   if (Array.isArray(p3)) setCamera([p3[0]*0.4, p3[1]*0.4+3, 12], [0, 0, 0]);
}

export function draw() {
   cls(rgba8(4, 5, 14, 255));
   printBold('805 BATCH 64', 4, 4, rgba8(200, 220, 255, 255));
   print('catmull-rom splines', 4, 14, rgba8(80, 255, 120, 255));

   // draw 2D spline and tracer
   drawSpline2D(s2d, rgba8(80, 200, 255, 180), 56);
   const p2 = getSplinePoint(s2d, tracer);
   if (Array.isArray(p2)) {
      circfill(p2[0], p2[1], 5, rgba8(255, 220, 50, 255));
      const tan = getSplineTangent(s2d, tracer);
      if (Array.isArray(tan))
         line(p2[0], p2[1], p2[0]+tan[0]*22, p2[1]+tan[1]*22, rgba8(255, 140, 40, 200));
   }
   // draw control points
   for (let i = 0; i < splinePointCount(s2d); i++) {
      const cp = getSplinePoint(s2d, i / (splinePointCount(s2d) - 1));
      if (Array.isArray(cp)) circ(cp[0], cp[1], 3, rgba8(120, 180, 255, 120));
   }
   print('len: '+getSplineLength(s2d).toFixed(0)+' pts: '+splinePointCount(s2d),
         4, 24, rgba8(160, 200, 255, 180));
}
