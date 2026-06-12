// Conformance cart 1133: parseCanvasUI <image> data: URI support.
// <image href="data:image/png;base64,..."> is base64-decoded at parse
// time and registered as a dynamic asset (key __data_uri_N.png) via
// nova64.assets.registerBytes, then routed through the existing
// image draw path. Same src string is cached so it only registers
// once per render arc.

let ui = null;
let errors = [];

// Tiny 2x2 red PNG (smallest valid PNG with a single red pixel block)
const RED_PX_PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAEUlEQVQIW2P8z8Dwn4GBgQEAFgwCAcfPgK0AAAAASUVORK5CYII=';

export function init() {
   if (!nova64 || !nova64.ui || typeof nova64.ui.parseCanvasUI !== 'function')
      errors.push('parseCanvasUI-missing');
   if (!nova64 || !nova64.assets || typeof nova64.assets.registerBytes !== 'function')
      errors.push('registerBytes-missing');

   if (errors.length === 0) {
      ui = nova64.ui.parseCanvasUI(`
         <ui>
            <rect x="0" y="0" width="640" height="360" fill="#101820" />

            <image href="data:image/png;base64,${RED_PX_PNG}" x="40"  y="40" width="64"  height="64" />
            <image href="data:image/png;base64,${RED_PX_PNG}" x="140" y="40" width="120" height="64" />
            <image href="data:image/png;base64,${RED_PX_PNG}" x="280" y="40" width="64"  height="120" />
            <image href="data:image/png;base64,${RED_PX_PNG}" x="380" y="40" width="160" height="160" />

            <text x="40"  y="220" color="#ffe080">data:image/png;base64 routed through registerBytes</text>
            <text x="40"  y="240" color="#80d0ff">Same string cached; only first parse registers the asset.</text>
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
