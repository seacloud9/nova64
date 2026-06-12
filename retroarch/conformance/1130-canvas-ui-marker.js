// Conformance cart 1130: parseCanvasUI <marker> defs on lines.
// <marker id> in <defs> referenced via marker-end="url(#id)" /
// marker-start="url(#id)" / marker-mid="url(#id)" draws the marker's
// children at the line's endpoints. refX / refY on the marker offset
// the children so the marker tip aligns with the endpoint.
//
// Limitations (documented): orient="auto" rotation is not supported;
// markers render in their authored orientation (the cart picks shapes
// that look reasonable un-rotated). marker-mid is honored on simple
// lines as the midpoint only (no support for poly-line / path mids).

let ui = null;
let errors = [];

export function init() {
   if (!nova64 || !nova64.ui || typeof nova64.ui.parseCanvasUI !== 'function')
      errors.push('parseCanvasUI-missing');

   if (errors.length === 0) {
      ui = nova64.ui.parseCanvasUI(`
         <ui>
            <defs>
               <marker id="dot" refX="4" refY="4">
                  <circle cx="4" cy="4" r="4" fill="#ff4060" />
               </marker>
               <marker id="square" refX="5" refY="5">
                  <rect x="0" y="0" width="10" height="10" fill="#56d364" />
               </marker>
               <marker id="ring" refX="6" refY="6">
                  <circle cx="6" cy="6" r="6" fill="#80d0ff" stroke="#ffffff" />
               </marker>
            </defs>

            <rect x="0" y="0" width="640" height="360" fill="#101820" />

            <line x1="40"  y1="60" x2="600" y2="60" stroke="#444444" />
            <line x1="40"  y1="60" x2="600" y2="60" stroke="#ffe080" marker-end="url(#dot)" />

            <line x1="40"  y1="120" x2="600" y2="120" stroke="#7c5cff" marker-start="url(#square)" marker-end="url(#dot)" />

            <line x1="40"  y1="180" x2="600" y2="180" stroke="#80d0ff" marker-start="url(#ring)" marker-mid="url(#dot)" marker-end="url(#ring)" />

            <line x1="40"  y1="240" x2="600" y2="280" stroke="#ff4060" marker-end="url(#square)" />
            <line x1="40"  y1="320" x2="600" y2="280" stroke="#ff4060" marker-end="url(#square)" />
         </ui>
      `);

      if (!ui || !ui.markers)
         errors.push('markers-missing');
      else if (!ui.markers.dot || !ui.markers.square || !ui.markers.ring)
         errors.push('marker-ids-missing');
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
