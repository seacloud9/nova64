// Conformance cart 1108: parseCanvasUI gradient fills on <text>.
// Setting color="url(#id)" on a <text> element samples the gradient
// per-character (each char's center maps to a normalized 0..1 axis on
// the gradient bbox). Solid color="..." paths and shadow/outline passes
// remain unchanged (gradient only kicks in when color resolves to 0,
// i.e. the url() fallback case, so shadow-color renders solid).

let ui = null;
let errors = [];

export function init() {
   if (!nova64 || !nova64.ui || typeof nova64.ui.parseCanvasUI !== 'function')
      errors.push('parseCanvasUI-missing');

   if (errors.length === 0) {
      ui = nova64.ui.parseCanvasUI(`
         <ui>
            <defs>
               <linearGradient id="rainbow" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%"   stop-color="#ff4040" />
                  <stop offset="33%"  stop-color="#ffdc40" />
                  <stop offset="66%"  stop-color="#40ffa0" />
                  <stop offset="100%" stop-color="#80c0ff" />
               </linearGradient>
               <linearGradient id="vfade" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%"   stop-color="#ffffff" />
                  <stop offset="100%" stop-color="#404060" />
               </linearGradient>
               <radialGradient id="glow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%"   stop-color="#ffeebb" />
                  <stop offset="100%" stop-color="#883300" />
               </radialGradient>
            </defs>
            <rect x="0" y="0" width="640" height="360" fill="#101820" />
            <text x="40"  y="80"  size="12" color="url(#rainbow)">RAINBOW TEXT</text>
            <text x="40"  y="140" size="12" color="url(#vfade)">FADE TO BLUE</text>
            <text x="40"  y="200" size="12" color="url(#glow)">RADIAL GLOW</text>
            <text x="40"  y="260" color="#ffffff"
                  shadow="true" shadow-color="#000000" shadow-x="2" shadow-y="2">
               SOLID PRESERVED
            </text>
         </ui>
      `);
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
