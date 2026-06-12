// Conformance cart 1128: parseCanvasUI currentColor keyword.
// fill="currentColor" / stroke="currentColor" resolves to the nearest
// ancestor group/g/svg color attribute. Common in real SVG icon
// libraries where the colored layer is selected by the outer container.

let ui = null;
let errors = [];

export function init() {
   if (!nova64 || !nova64.ui || typeof nova64.ui.parseCanvasUI !== 'function')
      errors.push('parseCanvasUI-missing');

   if (errors.length === 0) {
      ui = nova64.ui.parseCanvasUI(`
         <ui>
            <rect x="0" y="0" width="640" height="360" fill="#101820" />

            <g x="40" y="40" width="160" height="100" color="#ff4060">
               <rect x="0" y="0" width="160" height="100" fill="currentColor" />
               <text x="10" y="60" color="#ffffff">red via currentColor</text>
            </g>

            <g x="220" y="40" width="160" height="100" color="#56d364">
               <rect x="0" y="0" width="160" height="100" stroke="currentColor" />
               <circle cx="80" cy="50" r="36" fill="currentColor" />
            </g>

            <g x="400" y="40" width="200" height="100" color="#80d0ff">
               <rect x="0" y="0" width="200" height="100" fill="#444444" />
               <g x="20" y="20" width="160" height="60" color="#ffe080">
                  <rect x="0" y="0" width="160" height="60" fill="currentColor" />
                  <text x="10" y="40" color="#101820">inner color wins</text>
               </g>
            </g>

            <g x="40" y="180" width="560" height="60">
               <text x="10" y="30" color="#7c5cff">no ancestor color</text>
               <rect x="200" y="10" width="60" height="40" fill="currentColor" stroke="#ffffff" />
            </g>

            <g x="40" y="260" width="560" height="80" color="#ffe080">
               <rect x="0" y="0" width="560" height="80" fill="#204870" />
               <text x="10" y="30" color="currentColor">text inherits currentColor</text>
               <circle cx="450" cy="40" r="24" fill="currentColor" />
            </g>
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
