// Conformance cart 1121: parseCanvasUI <svg viewBox="..."> coordinate scaling.
// <svg width=W height=H viewBox="minX minY vw vh"> establishes an internal
// coordinate space (vw,vh) that scales to the destination box (W,H), with
// (minX,minY) anchored at the svg's (x,y). Children draw in viewBox
// coordinates and are scaled by W/vw, H/vh into the destination box.

let ui = null;
let errors = [];

export function init() {
   if (!nova64 || !nova64.ui || typeof nova64.ui.parseCanvasUI !== 'function')
      errors.push('parseCanvasUI-missing');

   if (errors.length === 0) {
      ui = nova64.ui.parseCanvasUI(`
         <ui>
            <rect x="0" y="0" width="640" height="360" fill="#101820" />

            <svg x="20" y="20" width="200" height="140" viewBox="0 0 100 70">
               <rect x="0" y="0" width="100" height="70" fill="#204870" />
               <circle cx="50" cy="35" r="22" fill="#80d0ff" />
               <text x="10" y="60" color="#ffe080">viewBox 1:2</text>
            </svg>
            <rect x="20" y="20" width="200" height="140" stroke="#ffffff" />

            <svg x="240" y="20" width="120" height="140" viewBox="0 0 100 70">
               <rect x="0" y="0" width="100" height="70" fill="#56d364" />
               <circle cx="50" cy="35" r="22" fill="#101820" />
               <text x="10" y="60" color="#101820">non-uniform</text>
            </svg>
            <rect x="240" y="20" width="120" height="140" stroke="#ffffff" />

            <svg x="380" y="20" width="240" height="140" viewBox="50 30 100 70">
               <rect x="50" y="30" width="100" height="70" fill="#7c5cff" />
               <circle cx="100" cy="65" r="22" fill="#ffe080" />
               <text x="60" y="90" color="#101820">viewBox origin</text>
            </svg>
            <rect x="380" y="20" width="240" height="140" stroke="#ffffff" />

            <svg x="20" y="200" width="600" height="140" viewBox="0 0 300 70">
               <rect x="0" y="0" width="300" height="70" fill="#ff4060" />
               <g x="40" y="10" width="80" height="50">
                  <rect x="0" y="0" width="80" height="50" fill="#444444" />
                  <text x="6" y="20" color="#ffffff">nested g</text>
               </g>
               <circle cx="220" cy="35" r="28" fill="#80ffd0" stroke="#ffffff" />
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
