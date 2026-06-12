// Conformance cart 1132: parseCanvasUI per-character dx/dy on <text>.
// SVG-standard dx="0 2 -1 3" / dy="0 1 0 -1" shifts each character
// individually from the running cursor. dx values accumulate (each
// applies before its character is drawn, then the cursor advances by
// the character's width). dy applies absolutely per character relative
// to the text's y.

let ui = null;
let errors = [];

export function init() {
   if (!nova64 || !nova64.ui || typeof nova64.ui.parseCanvasUI !== 'function')
      errors.push('parseCanvasUI-missing');

   if (errors.length === 0) {
      ui = nova64.ui.parseCanvasUI(`
         <ui>
            <rect x="0" y="0" width="640" height="360" fill="#101820" />

            <text x="20" y="40" color="#ffe080">PLAIN (no dx/dy)</text>

            <text x="20" y="80" color="#80d0ff" dx="0 4 4 4 4 4 4 4 4">SPACED</text>

            <text x="20" y="120" color="#56d364" dy="0 -3 0 -3 0 -3 0">BOUNCE</text>

            <text x="20" y="170" color="#ff4060" dx="0 2 -1 4 -2 3" dy="0 -2 1 -3 2 0">jitter</text>

            <text x="20" y="220" color="#7c5cff" dx="0 0 8 0 0 0 8 0">A B  C</text>

            <text x="20" y="270" color="#ffe080" dy="0 0 0 -8 0 0 -8 0 0 -8 0">step up step</text>

            <text x="20" y="320" color="#80d0ff">tail row (no dx/dy)</text>
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
