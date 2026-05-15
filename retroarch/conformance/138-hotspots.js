// Conformance cart 138: AABB hotspots — createHotspot/setHotspot/contains/overlap/destroy.

let errors = [];

export function init() {
   if (typeof createHotspot !== 'function') { errors.push('createHotspot-missing'); return; }

   const a = createHotspot(10, 20, 50, 40);
   if (!a) { errors.push('create-zero'); return; }

   // Getters
   if (hotspotX(a) !== 10) errors.push('hotspotX');
   if (hotspotY(a) !== 20) errors.push('hotspotY');
   if (hotspotW(a) !== 50) errors.push('hotspotW');
   if (hotspotH(a) !== 40) errors.push('hotspotH');

   // Contains
   if (!hotspotContains(a, 30, 40)) errors.push('contains-inside');
   if (hotspotContains(a, 0, 0))    errors.push('contains-outside');

   // Overlap
   const b = createHotspot(40, 50, 50, 40);
   if (!hotspotOverlap(a, b)) errors.push('overlap-yes');
   const c = createHotspot(200, 200, 10, 10);
   if (hotspotOverlap(a, c))  errors.push('overlap-no');

   // setHotspot moves it
   setHotspot(a, 0, 0, 5, 5);
   if (hotspotContains(a, 30, 40)) errors.push('post-move-contains');

   destroyHotspot(a);
   destroyHotspot(b);
   destroyHotspot(c);
}

export function update(dt) {}

export function draw() {
   cls(rgba8(8, 10, 18, 255));
   print('138 HOTSPOTS', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Draw two overlapping rects to illustrate
   rect(60, 60, 160, 120, rgba8(80, 150, 255, 255));
   rect(110, 90, 210, 150, rgba8(255, 150, 80, 255));
   rectfill(110, 90, 160, 120, rgba8(200, 200, 100, 80));
   printCentered('A', 110, 85,  rgba8(80, 150, 255, 255));
   printCentered('B', 160, 145, rgba8(255, 150, 80, 255));
   printCentered('overlap', 135, 102, rgba8(220, 220, 80, 255));
   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
