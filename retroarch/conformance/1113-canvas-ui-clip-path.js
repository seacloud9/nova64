// Conformance cart 1113: parseCanvasUI <clipPath> defs.
// A <clipPath id> in <defs> can be referenced with clip-path="url(#id)".
// RetroArch maps supported clipPath child shapes to deterministic rectangular
// clip intersections using the existing draw clip stack.

let ui = null;
let errors = [];

export function init() {
   if (!nova64 || !nova64.ui || typeof nova64.ui.parseCanvasUI !== 'function')
      errors.push('parseCanvasUI-missing');

   if (errors.length === 0) {
      ui = nova64.ui.parseCanvasUI(`
         <ui>
            <defs>
               <pattern id="stripes" width="18" height="18">
                  <rect x="0" y="0" width="9" height="18" fill="#204870" />
                  <rect x="9" y="0" width="9" height="18" fill="#80d0ff" />
               </pattern>
               <symbol id="chipClip">
                  <rect x="10" y="8" width="84" height="46" />
               </symbol>
               <clipPath id="leftWindow">
                  <rect x="18" y="14" width="110" height="72" />
               </clipPath>
               <clipPath id="roundWindow">
                  <circle x="58" y="48" r="38" />
               </clipPath>
               <clipPath id="chipWindow">
                  <use href="#chipClip" x="0" y="0" />
               </clipPath>
            </defs>

            <rect x="0" y="0" width="640" height="360" fill="#101820" />

            <group x="34" y="34" width="150" height="110" clip-path="url(#leftWindow)">
               <rect x="-18" y="-16" width="184" height="140" fill="#ff4060" />
               <line x1="-24" y1="92" x2="168" y2="8" color="#ffe080" />
               <text x="24" y="36" color="#ffffff" size="12">clipped text</text>
            </group>
            <rect x="52" y="48" width="110" height="72" stroke="#ffffff" />

            <group x="238" y="40" width="130" height="110" clip-path="url(#roundWindow)">
               <rect x="0" y="0" width="130" height="110" fill="url(#stripes)" />
               <circle x="58" y="48" r="52" fill="#ffe08055" stroke="#ffffff" />
            </group>
            <rect x="258" y="50" width="76" height="76" stroke="#ffffff" />

            <group x="430" y="44" width="120" height="82" clip-path="url(#chipWindow)">
               <rect x="-16" y="-16" width="160" height="110" fill="#56d364" />
               <line x1="-20" y1="-8" x2="132" y2="86" color="#101820" />
               <line x1="132" y1="-8" x2="-20" y2="86" color="#101820" />
            </group>
            <rect x="440" y="52" width="84" height="46" stroke="#ffffff" />

            <group x="90" y="205" width="240" height="96" clip="true" clip-path="url(#leftWindow)">
               <rect x="-28" y="-20" width="290" height="132" fill="#7c5cff" />
               <rect x="18" y="14" width="110" height="72" fill="#80ffd0" />
               <text x="28" y="42" color="#101820">nested clip</text>
            </group>
            <rect x="108" y="219" width="110" height="72" stroke="#ffffff" />
         </ui>
      `);

      if (!ui || !ui.clipPaths)
         errors.push('clipPaths-missing');
      else if (!ui.clipPaths.leftWindow || !ui.clipPaths.roundWindow || !ui.clipPaths.chipWindow)
         errors.push('clipPath-ids-missing');
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
