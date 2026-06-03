// Conformance cart 1110: parseCanvasUI <tspan> inline text styling.
// <text> with <tspan> children renders each tspan as a styled segment
// laid out left-to-right from the text's x. Tspan attrs override the
// parent <text> attrs (color, size, shadow, font-family, etc.). When
// a text has tspan children the outer text content is ignored — put
// all visible runs in tspans. anchor-x measures total tspan width.

let ui = null;
let errors = [];

export function init() {
   if (!nova64 || !nova64.ui || typeof nova64.ui.parseCanvasUI !== 'function')
      errors.push('parseCanvasUI-missing');

   if (errors.length === 0) {
      ui = nova64.ui.parseCanvasUI(`
         <ui>
            <rect x="0" y="0" width="640" height="360" fill="#101820" />
            <text x="40" y="80" color="#ffffff">
               <tspan>HP </tspan>
               <tspan color="#40ff80">100</tspan>
               <tspan> / </tspan>
               <tspan color="#ff4060">25</tspan>
            </text>
            <text x="40" y="140" color="#cccccc" size="12">
               <tspan>SCORE: </tspan>
               <tspan color="#ffdc40" size="12">123450</tspan>
            </text>
            <text x="40" y="200" color="#ffffff"
                  shadow="true" shadow-color="#000000" shadow-x="2" shadow-y="2">
               <tspan>STATUS: </tspan>
               <tspan color="#40ff80">READY</tspan>
            </text>
            <text x="320" y="260" anchor-x="center" color="#ffffff">
               <tspan color="#ff8040">LV </tspan>
               <tspan>42</tspan>
               <tspan color="#80c0ff"> XP </tspan>
               <tspan>9800</tspan>
            </text>
            <text x="40" y="320" color="#cccccc">PLAIN TEXT STILL WORKS</text>
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
