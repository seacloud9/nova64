// Conformance cart 1118: parseCanvasUI static transform="..." attribute.
// SVG-style transform="translate(tx,ty) scale(sx,sy)" is parsed left-to-
// right and composed onto the node's x/y/width/height the same way the
// existing animateTransform child does. Translate offsets x/y; scale
// multiplies width/height; rotate writes to the rotation attr for
// parity with animateTransform (the 2D UI renderer does not consume
// rotation yet, so it parses cleanly but does not visually rotate).

let ui = null;
let errors = [];

export function init() {
   if (!nova64 || !nova64.ui || typeof nova64.ui.parseCanvasUI !== 'function')
      errors.push('parseCanvasUI-missing');

   if (errors.length === 0) {
      ui = nova64.ui.parseCanvasUI(`
         <ui>
            <rect x="0" y="0" width="640" height="360" fill="#101820" />

            <rect x="40" y="40" width="80" height="50" fill="#ff4060" transform="translate(20 12)" />
            <rect x="40" y="40" width="80" height="50" stroke="#ffffff" />

            <rect x="180" y="40" width="40" height="40" fill="#56d364" transform="scale(2 1.5)" />
            <rect x="180" y="40" width="80" height="60" stroke="#ffffff" />

            <group x="320" y="40" width="160" height="120" transform="translate(20 14)">
               <rect x="0" y="0" width="120" height="80" fill="#80d0ff" />
               <text x="6" y="20" color="#101820">shifted group</text>
            </group>
            <rect x="340" y="54" width="120" height="80" stroke="#ffffff" />

            <group x="40" y="200" width="240" height="100" transform="translate(8 10) scale(1.5 1)">
               <rect x="0" y="0" width="120" height="60" fill="#7c5cff" />
            </group>
            <rect x="48" y="210" width="180" height="60" stroke="#ffffff" />

            <rect x="380" y="220" width="50" height="40" fill="#ffe080" transform="rotate(30) translate(10 4)" />
            <rect x="390" y="224" width="50" height="40" stroke="#ffffff" />
         </ui>
      `);

      if (!ui || !ui.root) errors.push('ui-parse-failed');
   }
}

export function update(dt) {}

export function draw() {
   cls(rgba8(16, 24, 32, 255));
   if (ui)
      nova64.ui.renderCanvasUI(ui, {});
   if (errors.length === 0) {
      print('ok', 4, 4, rgba8(80, 255, 120, 255));
   } else {
      print('FAIL', 4, 4, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 14, rgba8(255, 120, 120, 255));
   }
}
