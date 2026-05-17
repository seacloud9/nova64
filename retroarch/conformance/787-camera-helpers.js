// Conformance cart 787: Batch 66 — camera helpers.
// dollyCamera, truckCamera, pedestalCamera, panCamera, tiltCamera,
// getCameraForward, getCameraRight, getCameraUp,
// setCameraRoll, getCameraRoll, zoomCamera, resetCameraRoll

let errors = [];

export function init() {
   const needed = ['dollyCamera','truckCamera','pedestalCamera','panCamera',
                   'tiltCamera','getCameraForward','getCameraRight','getCameraUp',
                   'setCameraRoll','getCameraRoll','zoomCamera','resetCameraRoll'];
   for (const f of needed)
      if (typeof globalThis[f] !== 'function') errors.push(f + '-missing');
   if (errors.length) return;

   // known state: camera at [0,0,10] looking at origin
   setCamera([0, 0, 10], [0, 0, 0]);

   // getCameraForward — should be [0,0,-1]
   const fwd = getCameraForward();
   if (!Array.isArray(fwd) || fwd.length < 3) { errors.push('fwd-arr'); return; }
   if (Math.abs(fwd[2] + 1) > 0.15) errors.push('fwd-z:'+fwd[2].toFixed(2));

   // getCameraRight — should be [1,0,0]
   const right = getCameraRight();
   if (!Array.isArray(right) || right.length < 3) { errors.push('right-arr'); return; }
   if (Math.abs(right[0] - 1) > 0.15) errors.push('right-x:'+right[0].toFixed(2));

   // getCameraUp — should be [0,1,0]
   const up = getCameraUp();
   if (!Array.isArray(up) || up.length < 3) { errors.push('up-arr'); return; }
   if (Math.abs(up[1] - 1) > 0.15) errors.push('up-y:'+up[1].toFixed(2));

   // dollyCamera — move along forward axis
   setCamera([0, 0, 10], [0, 0, 0]);
   dollyCamera(2);
   const fwdAfterDolly = getCameraForward();
   if (!Array.isArray(fwdAfterDolly)) errors.push('dolly');

   // truckCamera — move along right axis
   setCamera([0, 0, 10], [0, 0, 0]);
   truckCamera(1);

   // pedestalCamera — move along up axis
   setCamera([0, 0, 10], [0, 0, 0]);
   pedestalCamera(1);

   // panCamera 90° — camera at [0,0,10] panned 90° should look along +X
   setCamera([0, 0, 10], [0, 0, 0]);
   panCamera(90);
   const panFwd = getCameraForward();
   if (!Array.isArray(panFwd) || Math.abs(panFwd[0] - 1) > 0.15)
      errors.push('pan:'+panFwd[0].toFixed(2));

   // tiltCamera — rotate around right axis
   setCamera([0, 0, 10], [0, 0, 0]);
   tiltCamera(30);
   const tiltFwd = getCameraForward();
   if (!Array.isArray(tiltFwd) || tiltFwd.length < 3) errors.push('tilt');

   // setCameraRoll / getCameraRoll
   setCameraRoll(45);
   if (Math.abs(getCameraRoll() - 45) > 0.1) errors.push('roll:'+getCameraRoll().toFixed(1));

   // resetCameraRoll
   resetCameraRoll();
   if (Math.abs(getCameraRoll()) > 0.1) errors.push('roll-reset');

   // zoomCamera 0.5 — halve distance, forward direction unchanged
   setCamera([0, 0, 10], [0, 0, 0]);
   zoomCamera(0.5);
   const zoomedFwd = getCameraForward();
   if (!Array.isArray(zoomedFwd) || Math.abs(zoomedFwd[2] + 1) > 0.15)
      errors.push('zoom');
}

export function draw() {
   cls(rgba8(4, 5, 14, 255));
   printBold('787 BATCH 66', 4, 4, rgba8(200, 220, 255, 255));
   if (errors.length) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }
   print('ok', 4, 14, rgba8(80, 255, 120, 255));
   print('camera helpers', 4, 24, rgba8(200, 200, 255, 200));
   print('roll: '+getCameraRoll().toFixed(1), 4, 34, rgba8(160, 200, 255, 180));
}

export function update(dt) {}
