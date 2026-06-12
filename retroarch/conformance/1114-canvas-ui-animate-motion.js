// Conformance cart 1114: parseCanvasUI <animateMotion>.
// Motion children offset the parent node's x/y using the deterministic
// nova64.time() clock. This locks values/from-to pairs and simple
// SVG path polylines (M/L/H/V/Z).

let ui = null;
let errors = [];

export function init() {
   if (!nova64 || !nova64.ui || typeof nova64.ui.parseCanvasUI !== 'function')
      errors.push('parseCanvasUI-missing');

   if (errors.length === 0) {
      ui = nova64.ui.parseCanvasUI(`
         <ui>
            <rect x="0" y="0" width="640" height="360" fill="#101820" />

            <line x1="48" y1="78" x2="188" y2="78" color="#304050" />
            <circle x="48" y="78" r="6" fill="#304050" />
            <circle x="188" y="78" r="6" fill="#304050" />
            <rect x="48" y="58" width="28" height="28" fill="#ff6070" stroke="#ffffff">
               <animateMotion values="0,0;140,0" dur="0.25s" repeatCount="indefinite" />
            </rect>

            <line x1="62" y1="160" x2="62" y2="260" color="#304050" />
            <circle x="62" y="160" r="6" fill="#304050" />
            <circle x="62" y="260" r="6" fill="#304050" />
            <circle x="62" y="160" r="16" fill="#80ffd0" stroke="#ffffff">
               <animateMotion from="0,0" to="0,100" dur="0.5s" repeatCount="indefinite" />
            </circle>

            <path d="M300 90 L420 90 L420 190 L500 190" stroke="#304050" />
            <rect x="292" y="82" width="20" height="20" fill="#ffe080" stroke="#ffffff">
               <animateMotion path="M0,0 L120,0 L120,100 L200,100" dur="0.75s" repeatCount="indefinite" />
            </rect>

            <text x="250" y="258" color="#ffffff">animateMotion</text>
            <text x="250" y="278" color="#80d0ff">
               <animateMotion values="0,0;80,0;0,0" dur="0.5s" repeatCount="indefinite" />
               moving label
            </text>
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
