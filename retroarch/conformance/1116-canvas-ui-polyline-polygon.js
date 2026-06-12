// Conformance cart 1116: parseCanvasUI <polyline> and <polygon>.
// Point lists support SVG-style comma/space separated number pairs, optional
// data binding, open polylines, closed polylines, and filled polygons.

let ui = null;
let errors = [];

export function init() {
   if (!nova64 || !nova64.ui || typeof nova64.ui.parseCanvasUI !== 'function')
      errors.push('parseCanvasUI-missing');

   if (errors.length === 0) {
      ui = nova64.ui.parseCanvasUI(`
         <ui>
            <rect x="0" y="0" width="640" height="360" fill="#0f1720" />

            <polyline
               points="40,80 110,40 180,92 250,58 320,116"
               stroke="#70d6ff" />

            <polygon
               points="390,52 520,80 480,160 350,140"
               fill="#ffd166"
               stroke="#202020" />

            <polyline
               x="55"
               y="190"
               points="0,0 80,-36 160,0 120,70 40,70"
               stroke="#ef476f"
               closed="true" />

            <polygon
               x="340"
               y="202"
               points="{badgePoints}"
               fill="#06d6a0"
               stroke="#ffffff" />

            <text x="44" y="315" color="#ffffff">polyline polygon ok</text>
         </ui>
      `);

      if (!ui)
         errors.push('ui-missing');
   }
}

export function update(dt) {}

export function draw() {
   cls(rgba8(15, 23, 32, 255));
   if (ui)
      nova64.ui.renderCanvasUI(ui, {
         badgePoints: '0,0 72,-34 156,10 118,84 24,72',
      });
   if (errors.length === 0) {
      print('ok', 4, 4, rgba8(80, 255, 120, 255));
   } else {
      print('FAIL', 4, 4, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 14, rgba8(255, 120, 120, 255));
   }
}
