// Conformance cart 1120: parseCanvasUI more SVG attribute aliases.
// <line> accepts SVG-standard stroke="..." in addition to the existing
// parseCanvasUI shorthand color="...". <text> accepts SVG-standard
// text-anchor="middle"|"end" as aliases for anchor-x="center"|"right",
// so dropped-in SVG content lays out correctly.

let ui = null;
let errors = [];

export function init() {
   if (!nova64 || !nova64.ui || typeof nova64.ui.parseCanvasUI !== 'function')
      errors.push('parseCanvasUI-missing');

   if (errors.length === 0) {
      ui = nova64.ui.parseCanvasUI(`
         <ui>
            <rect x="0" y="0" width="640" height="360" fill="#101820" />

            <line x1="40" y1="40" x2="600" y2="40" stroke="#80d0ff" />
            <line x1="40" y1="60" x2="600" y2="60" color="#ffe080" />
            <line x1="40" y1="80" x2="600" y2="80" color="#444444" stroke="#56d364" />

            <text x="320" y="140" color="#ffffff" text-anchor="middle">centered via text-anchor</text>
            <text x="620" y="170" color="#80ffd0" text-anchor="end">right-aligned via text-anchor</text>
            <text x="20" y="200" color="#7c5cff" text-anchor="start">start-aligned (default)</text>

            <text x="320" y="240" color="#ffe080" anchor-x="center">centered via legacy anchor-x</text>

            <g x="40" y="270" width="560" height="60">
               <line x1="0" y1="10" x2="560" y2="10" stroke="#ff4060" />
               <line x1="0" y1="30" x2="560" y2="30" stroke="#56d364" />
               <line x1="0" y1="50" x2="560" y2="50" stroke="#7c5cff" />
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
