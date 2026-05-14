// Conformance cart 87: resolution query
// getResolution() -> {width, height}
// nova64.getResolution() alias

let ok = false;

export function init() {
   const r = getResolution();
   if (!r || typeof r.width !== 'number' || typeof r.height !== 'number')
      throw new Error('getResolution() must return {width,height}: ' + JSON.stringify(r));
   if (r.width <= 0 || r.height <= 0)
      throw new Error('resolution dims must be positive: ' + r.width + 'x' + r.height);

   // Matches screenWidth/screenHeight
   if (r.width !== screenWidth()) throw new Error('width mismatch');
   if (r.height !== screenHeight()) throw new Error('height mismatch');

   // nova64.getResolution alias
   const r2 = nova64.getResolution();
   if (!r2 || r2.width !== r.width) throw new Error('nova64.getResolution mismatch');

   ok = true;
}

export function update(dt) {}

export function draw() {
   cls(rgba8(10, 14, 10, 255));
   print('87 RESOLUTION', 4, 4, rgba8(255, 200, 80, 255));
   print(ok ? 'PASS' : 'FAIL', 4, 14,
      ok ? rgba8(100, 255, 100, 255) : rgba8(255, 80, 80, 255));
   const r = getResolution();
   print(r.width + 'x' + r.height, 4, 24, rgba8(180, 200, 180, 255));
}
