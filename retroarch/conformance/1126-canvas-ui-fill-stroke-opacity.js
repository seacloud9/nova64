// Conformance cart 1126: parseCanvasUI fill-opacity / stroke-opacity split.
// fill-opacity="0..1" multiplies only fill-side color alphas (fill,
// stop-color); stroke-opacity multiplies only stroke-side alphas
// (stroke). Both compose multiplicatively with the global opacity
// attribute and with the embedded alpha of #rrggbbaa hex colors.

let ui = null;
let errors = [];

export function init() {
   if (!nova64 || !nova64.ui || typeof nova64.ui.parseCanvasUI !== 'function')
      errors.push('parseCanvasUI-missing');

   if (errors.length === 0) {
      ui = nova64.ui.parseCanvasUI(`
         <ui>
            <rect x="0" y="0" width="640" height="360" fill="#101820" />

            <rect x="40"  y="40" width="80" height="80" fill="#ff4060" stroke="#ffffff" />
            <rect x="140" y="40" width="80" height="80" fill="#ff4060" stroke="#ffffff" fill-opacity="0.4" />
            <rect x="240" y="40" width="80" height="80" fill="#ff4060" stroke="#ffffff" stroke-opacity="0.4" />
            <rect x="340" y="40" width="80" height="80" fill="#ff4060" stroke="#ffffff" fill-opacity="0.4" stroke-opacity="0.4" />
            <rect x="440" y="40" width="80" height="80" fill="#ff4060" stroke="#ffffff" opacity="0.6" fill-opacity="0.5" />

            <circle cx="80"  cy="200" r="36" fill="#56d364" stroke="#ffffff" />
            <circle cx="200" cy="200" r="36" fill="#56d364" stroke="#ffffff" fill-opacity="0.3" />
            <circle cx="320" cy="200" r="36" fill="#56d364" stroke="#ffffff" stroke-opacity="0.3" />
            <circle cx="440" cy="200" r="36" fill="#56d364" stroke="#ffffff" opacity="0.7" stroke-opacity="0.5" />

            <line x1="40"  y1="280" x2="600" y2="280" stroke="#80d0ff" />
            <line x1="40"  y1="300" x2="600" y2="300" stroke="#80d0ff" stroke-opacity="0.4" />
            <line x1="40"  y1="320" x2="600" y2="320" stroke="#80d0ff" opacity="0.5" stroke-opacity="0.5" />
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
