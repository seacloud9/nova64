// Conformance cart 1111: parseCanvasUI <feColorMatrix> in <filter> chain.
// type="matrix"          — explicit 4x5 matrix (row-major, RGBA + offset)
// type="saturate"        — values="0..1+" attenuates color saturation
// type="hueRotate"       — values="deg" rotates hue around color wheel
// type="luminanceToAlpha"— preserves luminance into alpha channel
// Matrix is applied to the SHAPE'S fill color (solid or gradient stops)
// and stroke color BEFORE rendering, so shadow uses original flood-color
// but the main fill uses the transformed color.

let ui = null;
let errors = [];

export function init() {
   if (!nova64 || !nova64.ui || typeof nova64.ui.parseCanvasUI !== 'function')
      errors.push('parseCanvasUI-missing');

   if (errors.length === 0) {
      ui = nova64.ui.parseCanvasUI(`
         <ui>
            <defs>
               <filter id="grayscale">
                  <feColorMatrix type="saturate" values="0" />
               </filter>
               <filter id="muted">
                  <feColorMatrix type="saturate" values="0.4" />
               </filter>
               <filter id="hue90">
                  <feColorMatrix type="hueRotate" values="90" />
               </filter>
               <filter id="hue180">
                  <feColorMatrix type="hueRotate" values="180" />
               </filter>
               <filter id="invert">
                  <feColorMatrix type="matrix"
                                 values="-1 0 0 0 1
                                          0 -1 0 0 1
                                          0 0 -1 0 1
                                          0 0 0 1 0" />
               </filter>
               <linearGradient id="g1" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%"   stop-color="#ff4040" />
                  <stop offset="100%" stop-color="#40ff80" />
               </linearGradient>
            </defs>
            <rect x="0" y="0" width="640" height="360" fill="#101820" />
            <rect x="40"  y="60" width="100" height="60" fill="#ff4060" />
            <rect x="160" y="60" width="100" height="60" fill="#ff4060"
                  filter="url(#grayscale)" />
            <rect x="280" y="60" width="100" height="60" fill="#ff4060"
                  filter="url(#muted)" />
            <rect x="400" y="60" width="100" height="60" fill="#ff4060"
                  filter="url(#hue90)" />
            <rect x="520" y="60" width="100" height="60" fill="#ff4060"
                  filter="url(#hue180)" />
            <rect x="40"  y="160" width="200" height="60" fill="url(#g1)" />
            <rect x="260" y="160" width="200" height="60" fill="url(#g1)"
                  filter="url(#hue90)" />
            <circle x="120" y="280" r="40" fill="#ffdc40" />
            <circle x="260" y="280" r="40" fill="#ffdc40"
                    filter="url(#invert)" />
            <circle x="400" y="280" r="40" fill="#80c0ff" stroke="#ffffff"
                    filter="url(#muted)" />
         </ui>
      `);

      if (!ui || !ui.filters)
         errors.push('filters-missing');
      else if (!ui.filters.grayscale || ui.filters.grayscale[0].type !== 'colorMatrix')
         errors.push('colorMatrix-not-stored');
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
