// Conformance cart 1115: parseCanvasUI <textPath>.
// A <text> can contain <textPath path="..."> children; each character is
// placed along a simple path polyline using the same deterministic sampler
// as animateMotion. Rotation is intentionally not part of this subset.

let ui = null;
let errors = [];

export function init() {
   if (!nova64 || !nova64.ui || typeof nova64.ui.parseCanvasUI !== 'function')
      errors.push('parseCanvasUI-missing');

   if (errors.length === 0) {
      ui = nova64.ui.parseCanvasUI(`
         <ui>
            <rect x="0" y="0" width="640" height="360" fill="#101820" />

            <path d="M70 70 L260 70" stroke="#304050" />
            <text x="70" y="70" color="#ffffff">
               <textPath path="M0,0 L190,0">straight path</textPath>
            </text>

            <path d="M70 150 L180 105 L300 150" stroke="#304050" />
            <text x="70" y="150" color="#80d0ff">
               <textPath path="M0,0 L110,-45 L230,0">angled labels</textPath>
            </text>

            <path d="M360 80 L500 80 L500 170 L580 170" stroke="#304050" />
            <text x="360" y="80" color="#ffe080" size="12">
               <textPath path="M0,0 L140,0 L140,90 L220,90" color="#ffe080">
                  corner run
               </textPath>
            </text>

            <text x="96" y="250" color="#ff80a0">
               <textPath path="M0,0 H90 V48 H180">HV path</textPath>
            </text>
            <path d="M96 250 H186 V298 H276" stroke="#304050" />
         </ui>
      `);

      if (!ui)
         errors.push('ui-missing');
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
