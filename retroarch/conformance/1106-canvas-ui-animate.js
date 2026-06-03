// Conformance cart 1106: parseCanvasUI <animate> + <animateTransform>.
// Animations sample nova64.time() at render time so frames are deterministic
// at 60fps. Covers numeric attributes (x, fill, opacity), values keyframes,
// and animateTransform translate/rotate/scale flowing into the parent attrs.

let ui = null;
let errors = [];

export function init() {
   if (!nova64 || !nova64.ui || typeof nova64.ui.parseCanvasUI !== 'function')
      errors.push('parseCanvasUI-missing');

   if (errors.length === 0) {
      ui = nova64.ui.parseCanvasUI(`
         <ui>
            <rect x="0" y="0" width="640" height="360" fill="#080c18" />
            <rect x="40" y="40" width="60" height="30" fill="#ff4040">
               <animate attributeName="x" from="40" to="540"
                        dur="1s" repeatCount="indefinite" />
               <animate attributeName="fill" from="#ff4040" to="#40ffa0"
                        dur="1s" repeatCount="indefinite" />
            </rect>
            <rect x="40" y="100" width="60" height="30" fill="#80c0ff">
               <animate attributeName="width" values="60;120;60"
                        dur="0.5s" repeatCount="indefinite" />
            </rect>
            <rect x="40" y="160" width="60" height="30" fill="#ffcc40">
               <animateTransform attributeName="transform" type="translate"
                                 from="0,0" to="200,0"
                                 dur="0.5s" repeatCount="indefinite" />
               <animateTransform attributeName="transform" type="scale"
                                 from="1" to="1.5"
                                 dur="1s" repeatCount="indefinite" />
            </rect>
            <star x="500" y="200" r="32" fill="#ffe080" points="5">
               <animateTransform attributeName="transform" type="rotate"
                                 from="0" to="360"
                                 dur="2s" repeatCount="indefinite" />
            </star>
            <circle x="320" y="280" r="24" fill="#a0a0ff">
               <animate attributeName="r" from="16" to="48"
                        dur="0.5s" repeatCount="indefinite" />
            </circle>
         </ui>
      `);
   }
}

export function update(dt) {}

export function draw() {
   cls(rgba8(8, 12, 24, 255));
   if (ui)
      nova64.ui.renderCanvasUI(ui, {});
   if (errors.length === 0) {
      print('ok', 4, 4, rgba8(80, 255, 120, 255));
   } else {
      print('FAIL', 4, 4, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 14, rgba8(255, 120, 120, 255));
   }
}
