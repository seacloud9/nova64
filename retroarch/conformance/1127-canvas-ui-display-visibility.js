// Conformance cart 1127: parseCanvasUI display/visibility subtree skip.
// display="none" and visibility="hidden" both skip the entire subtree
// of the node they appear on. (Per SVG spec, visibility="hidden" lets
// children re-enable themselves with visibility="visible"; parseCanvasUI
// flattens both into a subtree skip for simplicity. Documented.)

let ui = null;
let errors = [];

export function init() {
   if (!nova64 || !nova64.ui || typeof nova64.ui.parseCanvasUI !== 'function')
      errors.push('parseCanvasUI-missing');

   if (errors.length === 0) {
      ui = nova64.ui.parseCanvasUI(`
         <ui>
            <rect x="0" y="0" width="640" height="360" fill="#101820" />

            <rect x="40"  y="40" width="80" height="80" fill="#ff4060" />
            <rect x="140" y="40" width="80" height="80" fill="#56d364" display="none" />
            <rect x="240" y="40" width="80" height="80" fill="#80d0ff" visibility="hidden" />
            <rect x="340" y="40" width="80" height="80" fill="#7c5cff" />
            <rect x="440" y="40" width="80" height="80" fill="#ffe080" />

            <g x="40" y="160" width="240" height="100" display="none">
               <rect x="0" y="0" width="240" height="100" fill="#444444" />
               <text x="10" y="30" color="#ffffff">whole group hidden</text>
            </g>

            <g x="40" y="160" width="240" height="100">
               <rect x="0" y="0" width="240" height="100" fill="#204870" />
               <text x="10" y="30" color="#ffe080">visible group</text>
               <text x="10" y="60" color="#80d0ff" display="none">hidden line</text>
               <text x="10" y="80" color="#80d0ff">visible line</text>
            </g>

            <g x="320" y="160" width="240" height="100" visibility="hidden">
               <rect x="0" y="0" width="240" height="100" fill="#56d364" />
               <text x="10" y="30" color="#101820">visibility hidden subtree</text>
            </g>

            <rect x="40" y="290" width="560" height="40" fill="#444444" />
            <text x="50" y="312" color="#ffffff">tail row should be visible</text>
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
