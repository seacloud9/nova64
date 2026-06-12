// Conformance cart 1123: parseCanvasUI <mask> defs.
// A <mask id> in <defs> can be referenced with mask="url(#id)".
// Like <clipPath>, RetroArch approximates a <mask> as a rectangular
// bounds clip derived from the union of its child shape bounds — no
// per-pixel alpha mask, just the bounds clip union. Documented in the
// source comment.

let ui = null;
let errors = [];

export function init() {
   if (!nova64 || !nova64.ui || typeof nova64.ui.parseCanvasUI !== 'function')
      errors.push('parseCanvasUI-missing');

   if (errors.length === 0) {
      ui = nova64.ui.parseCanvasUI(`
         <ui>
            <defs>
               <mask id="leftMask">
                  <rect x="16" y="14" width="120" height="80" fill="#ffffff" />
               </mask>
               <mask id="roundMask">
                  <circle cx="60" cy="50" r="42" fill="#ffffff" />
               </mask>
               <clipPath id="rightClip">
                  <rect x="10" y="10" width="80" height="48" />
               </clipPath>
            </defs>

            <rect x="0" y="0" width="640" height="360" fill="#101820" />

            <group x="30" y="30" width="150" height="110" mask="url(#leftMask)">
               <rect x="-20" y="-16" width="200" height="140" fill="#ff4060" />
               <text x="24" y="40" color="#ffffff">masked</text>
            </group>
            <rect x="46" y="44" width="120" height="80" stroke="#ffffff" />

            <group x="220" y="30" width="130" height="110" mask="url(#roundMask)">
               <rect x="0" y="0" width="130" height="110" fill="#56d364" />
               <text x="20" y="60" color="#101820">round mask</text>
            </group>
            <rect x="238" y="38" width="84" height="84" stroke="#ffffff" />

            <group x="400" y="30" width="120" height="80" clip-path="url(#rightClip)" mask="url(#leftMask)">
               <rect x="-10" y="-10" width="160" height="100" fill="#7c5cff" />
            </group>
            <rect x="416" y="44" width="80" height="48" stroke="#ffffff" />
         </ui>
      `);

      if (!ui || !ui.masks)
         errors.push('masks-missing');
      else if (!ui.masks.leftMask || !ui.masks.roundMask)
         errors.push('mask-ids-missing');
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
