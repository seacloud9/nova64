// Conformance cart 785: Batch 64 — spline paths.
// createSpline, addSplinePoint, getSplinePoint, getSplineTangent,
// getSplineLength, destroySpline, createSpline3D, addSpline3DPoint,
// getSpline3DPoint, getSpline3DTangent, drawSpline2D, splinePointCount

let errors = [];

export function init() {
   const needed = ['createSpline','addSplinePoint','getSplinePoint','getSplineTangent',
                   'getSplineLength','destroySpline','createSpline3D','addSpline3DPoint',
                   'getSpline3DPoint','getSpline3DTangent','drawSpline2D','splinePointCount'];
   for (const f of needed)
      if (typeof globalThis[f] !== 'function') errors.push(f + '-missing');
   if (errors.length) return;

   // createSpline from flat array
   const s = createSpline([0,0, 100,50, 200,0, 300,100]);
   if (s <= 0) errors.push('create-spline');
   if (splinePointCount(s) !== 4) errors.push('ptcount:'+splinePointCount(s));

   // addSplinePoint
   addSplinePoint(s, 400, 50);
   if (splinePointCount(s) !== 5) errors.push('addpt:'+splinePointCount(s));

   // getSplinePoint
   const p0 = getSplinePoint(s, 0);
   const p1 = getSplinePoint(s, 1);
   if (!Array.isArray(p0)) errors.push('pt-arr');
   if (Math.abs(p0[0])>0.1) errors.push('pt0-x:'+p0[0].toFixed(1));
   if (Math.abs(p1[0]-400)>5) errors.push('pt1-x:'+p1[0].toFixed(1));

   // getSplineTangent
   const tan = getSplineTangent(s, 0.5);
   if (!Array.isArray(tan)||tan.length<2) errors.push('tan-arr');

   // getSplineLength
   const len = getSplineLength(s);
   if (len < 100) errors.push('len:'+len.toFixed(1));

   // 3D spline
   const s3 = createSpline3D([0,0,0, 1,1,-1, 2,0,-2, 3,1,-3]);
   if (s3 <= 0) errors.push('spline3d');
   addSpline3DPoint(s3, 4, 0, -4);
   const p3 = getSpline3DPoint(s3, 0);
   if (!Array.isArray(p3)||p3.length<3) errors.push('pt3d');
   const t3 = getSpline3DTangent(s3, 0.5);
   if (!Array.isArray(t3)||t3.length<3) errors.push('tan3d');

   // destroySpline
   destroySpline(s);
   if (splinePointCount(s) !== 0) errors.push('destroy');
}

export function draw() {
   cls(rgba8(4,5,14,255));
   printBold('785 BATCH 64', 4, 4, rgba8(200,220,255,255));
   if (errors.length) {
      print('FAIL', 4, 14, rgba8(255,60,60,255));
      print(errors[0], 4, 24, rgba8(255,120,120,255));
      return;
   }
   // draw a test spline visually
   const s = createSpline([20,100, 100,60, 200,120, 300,70, 600,100]);
   drawSpline2D(s, rgba8(80,200,255,200), 64);
   print('ok', 4, 14, rgba8(80,255,120,255));
   print('catmull-rom splines', 4, 24, rgba8(200,200,255,200));
}

export function update(dt) {}
