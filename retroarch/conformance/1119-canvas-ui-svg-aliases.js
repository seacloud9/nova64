// Conformance cart 1119: parseCanvasUI SVG element/attribute aliases.
// Real SVG content uses <g> instead of <group> and cx/cy instead of x/y
// on <circle> and <ellipse>. parseCanvasUI now accepts these aliases so
// drop-in SVG snippets render without renaming.

let ui = null;
let errors = [];

export function init() {
   if (!nova64 || !nova64.ui || typeof nova64.ui.parseCanvasUI !== 'function')
      errors.push('parseCanvasUI-missing');

   if (errors.length === 0) {
      ui = nova64.ui.parseCanvasUI(`
         <ui>
            <rect x="0" y="0" width="640" height="360" fill="#101820" />

            <g x="40" y="40" width="160" height="80">
               <rect x="0" y="0" width="160" height="80" fill="#204870" />
               <text x="8" y="24" color="#80d0ff">g alias</text>
            </g>

            <g x="240" y="40" width="160" height="80" clip="true">
               <rect x="-20" y="-20" width="200" height="120" fill="#56d364" />
               <text x="8" y="24" color="#101820">g + clip</text>
            </g>

            <circle cx="100" cy="180" r="32" fill="#ff4060" />
            <circle x="200" y="180" r="24" fill="#7c5cff" />

            <ellipse cx="320" cy="180" rx="40" ry="22" fill="#ffe080" stroke="#ffffff" />
            <ellipse x="440" y="180" rx="30" ry="20" fill="#80ffd0" stroke="#ffffff" />

            <g x="40" y="240" width="280" height="80" transform="translate(8 6)">
               <rect x="0" y="0" width="280" height="68" fill="#444444" />
               <circle cx="40" cy="34" r="22" fill="#ff4060" />
               <text x="80" y="30" color="#ffffff">g + transform</text>
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
