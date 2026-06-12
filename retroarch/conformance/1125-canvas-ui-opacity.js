// Conformance cart 1125: parseCanvasUI opacity attribute.
// opacity="0.5" multiplies the alpha channel of every color-valued attr
// (fill, stroke, color, stop-color, shadow-color, outline-color) at the
// applyAnimations gateway, so all draw sites pick up the alpha without
// per-site changes. url(#id) gradients and patterns are skipped — they
// don't have a single alpha to scale.

let ui = null;
let errors = [];

export function init() {
   if (!nova64 || !nova64.ui || typeof nova64.ui.parseCanvasUI !== 'function')
      errors.push('parseCanvasUI-missing');

   if (errors.length === 0) {
      ui = nova64.ui.parseCanvasUI(`
         <ui>
            <rect x="0" y="0" width="640" height="360" fill="#101820" />

            <rect x="40" y="40" width="180" height="80" fill="#ff4060" />
            <rect x="80" y="60" width="180" height="80" fill="#56d364" opacity="0.5" />
            <rect x="120" y="80" width="180" height="80" fill="#80d0ff" opacity="0.3" />

            <circle cx="420" cy="80" r="40" fill="#7c5cff" />
            <circle cx="460" cy="80" r="40" fill="#ffe080" opacity="0.5" />
            <circle cx="500" cy="80" r="40" fill="#ff4060" opacity="0.25" />

            <line x1="40" y1="180" x2="600" y2="180" color="#80d0ff" />
            <line x1="40" y1="200" x2="600" y2="200" color="#80d0ff" opacity="0.5" />
            <line x1="40" y1="220" x2="600" y2="220" color="#80d0ff" opacity="0.25" />

            <text x="40"  y="260" color="#ffffff">opaque text</text>
            <text x="240" y="260" color="#ffffff" opacity="0.5">half-alpha text</text>
            <text x="440" y="260" color="#ffffff" opacity="0.25">quarter-alpha</text>

            <rect x="40" y="290" width="560" height="50" fill="#444444" />
            <rect x="40" y="290" width="560" height="50" fill="#ffe080" opacity="0.4" stroke="#ffffff" />
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
