// Conformance cart 1117: parseCanvasUI inline style="..." attribute.
// SVG-style style="fill:red; stroke:#0f0" is parsed into the same attr
// keys the renderer already consumes (fill, stroke, color, size via
// font-size, etc). Style values override presentation attrs of the same
// name on the node, matching SVG's CSS specificity for the style attr.

let ui = null;
let errors = [];

export function init() {
   if (!nova64 || !nova64.ui || typeof nova64.ui.parseCanvasUI !== 'function')
      errors.push('parseCanvasUI-missing');

   if (errors.length === 0) {
      ui = nova64.ui.parseCanvasUI(`
         <ui>
            <rect x="0" y="0" width="640" height="360" fill="#101820" />

            <rect x="20" y="20" width="120" height="60" style="fill:#ff4060" />
            <rect x="160" y="20" width="120" height="60" fill="#444444" style="fill:#56d364" />
            <rect x="300" y="20" width="120" height="60" style="fill:#204870; stroke:#80d0ff" />

            <line x1="20" y1="120" x2="420" y2="120" style="color:#ffe080" />
            <line x1="20" y1="140" x2="420" y2="140" color="#444444" style="color:#7c5cff" />

            <text x="20" y="180" style="fill:#ffffff; font-size:14">styled text</text>
            <text x="20" y="220" color="#444444" style="color:#80ffd0">overridden color</text>

            <group x="20" y="250" width="400" height="90" style="stroke:#ffffff">
               <rect x="0" y="0" width="180" height="70" style="fill:#ffe08055; stroke:#ffffff" />
               <circle x="260" y="35" r="30" style="fill:#80d0ff" />
            </group>
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
