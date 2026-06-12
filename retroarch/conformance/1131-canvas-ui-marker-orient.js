// Conformance cart 1131: parseCanvasUI <marker orient="auto"> rotation.
// Extends 1130 so a marker with orient="auto" rotates its children to
// align with the line direction at the endpoint. Supported child
// shapes for rotation: path, polyline, polygon, line, triangle, and
// circle (which is rotation-invariant). Rect inside a rotated marker
// renders un-rotated as a documented limitation.

let ui = null;
let errors = [];

export function init() {
   if (!nova64 || !nova64.ui || typeof nova64.ui.parseCanvasUI !== 'function')
      errors.push('parseCanvasUI-missing');

   if (errors.length === 0) {
      ui = nova64.ui.parseCanvasUI(`
         <ui>
            <defs>
               <marker id="arrow" refX="9" refY="0" orient="auto">
                  <polygon points="-9 -5 0 0 -9 5" fill="#ffe080" />
               </marker>
               <marker id="diamond" refX="0" refY="0" orient="auto">
                  <polygon points="-6 0 0 -6 6 0 0 6" fill="#80d0ff" stroke="#ffffff" />
               </marker>
               <marker id="circle" refX="0" refY="0">
                  <circle cx="0" cy="0" r="6" fill="#56d364" />
               </marker>
            </defs>

            <rect x="0" y="0" width="640" height="360" fill="#101820" />

            <line x1="40"  y1="60"  x2="600" y2="60"  stroke="#7c5cff" marker-end="url(#arrow)" />
            <line x1="40"  y1="100" x2="600" y2="180" stroke="#7c5cff" marker-end="url(#arrow)" />
            <line x1="40"  y1="280" x2="600" y2="200" stroke="#7c5cff" marker-end="url(#arrow)" />
            <line x1="600" y1="320" x2="40"  y2="320" stroke="#7c5cff" marker-end="url(#arrow)" />

            <line x1="60"  y1="160" x2="580" y2="240" stroke="#ff4060" marker-start="url(#circle)" marker-mid="url(#diamond)" marker-end="url(#arrow)" />
         </ui>
      `);

      if (!ui || !ui.markers || !ui.markers.arrow || !ui.markers.diamond)
         errors.push('markers-missing');
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
