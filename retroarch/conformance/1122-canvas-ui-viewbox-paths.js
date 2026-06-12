// Conformance cart 1122: parseCanvasUI viewBox scaling for <path> and
// <polyline>/<polygon>. Cart 1121 scaled the primitive shape coords
// (rect/circle/line/ellipse) but path d-data and polyline point lists
// still went through unscaled. This cart locks both inside viewBox-active
// <svg> blocks so SVG path content scales correctly with its container.

let ui = null;
let errors = [];

export function init() {
   if (!nova64 || !nova64.ui || typeof nova64.ui.parseCanvasUI !== 'function')
      errors.push('parseCanvasUI-missing');

   if (errors.length === 0) {
      ui = nova64.ui.parseCanvasUI(`
         <ui>
            <rect x="0" y="0" width="640" height="360" fill="#101820" />

            <svg x="20" y="20" width="280" height="160" viewBox="0 0 100 60">
               <rect x="0" y="0" width="100" height="60" fill="#204870" />
               <path d="M 10 10 L 90 10 L 90 50 L 10 50 Z" stroke="#80d0ff" fill="#ffe08055" />
               <path d="M 20 30 C 30 10, 50 10, 60 30 S 90 50, 95 30" stroke="#ff4060" />
            </svg>
            <rect x="20" y="20" width="280" height="160" stroke="#ffffff" />

            <svg x="320" y="20" width="280" height="160" viewBox="0 0 100 60">
               <rect x="0" y="0" width="100" height="60" fill="#56d364" />
               <polyline points="10 10 30 50 50 10 70 50 90 10" stroke="#101820" />
               <polygon points="20 25 80 25 50 50" fill="#7c5cff" stroke="#ffffff" />
            </svg>
            <rect x="320" y="20" width="280" height="160" stroke="#ffffff" />

            <svg x="20" y="200" width="600" height="140" viewBox="0 0 300 70">
               <rect x="0" y="0" width="300" height="70" fill="#444444" />
               <path d="M 10 35 L 290 35" stroke="#ffe080" />
               <path d="M 150 5 L 150 65" stroke="#ffe080" />
               <path d="M 10 10 A 30 30 0 0 1 70 10" stroke="#80d0ff" fill="none" />
               <polygon points="220 10 280 10 250 60" fill="#ff4060" />
            </svg>
            <rect x="20" y="200" width="600" height="140" stroke="#ffffff" />
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
