// Conformance cart 1124: parseCanvasUI <style> block with .class rules.
// <defs><style>.name { prop: val }</style></defs> defines CSS rules
// applied to nodes with matching class="name" attributes. Multiple
// space-separated classes are honored. Specificity: class rules
// override presentation attrs but are overridden by inline style="..."
// (matches SVG CSS specificity).

let ui = null;
let errors = [];

export function init() {
   if (!nova64 || !nova64.ui || typeof nova64.ui.parseCanvasUI !== 'function')
      errors.push('parseCanvasUI-missing');

   if (errors.length === 0) {
      ui = nova64.ui.parseCanvasUI(`
         <ui>
            <defs>
               <style>
                  .red   { fill: #ff4060 }
                  .green { fill: #56d364 }
                  .blue  { fill: #80d0ff }
                  .frame { stroke: #ffffff }
                  .big   { font-size: 14 }
                  .hi    { color: #ffe080 }
               </style>
            </defs>

            <rect x="0" y="0" width="640" height="360" fill="#101820" />

            <rect class="red"   x="20"  y="20" width="120" height="60" />
            <rect class="green" x="160" y="20" width="120" height="60" />
            <rect class="blue"  x="300" y="20" width="120" height="60" />

            <rect class="red frame"   x="20"  y="100" width="120" height="60" />
            <rect class="green frame" x="160" y="100" width="120" height="60" />

            <rect class="red" x="300" y="100" width="120" height="60" fill="#444444" />
            <rect class="red" x="440" y="100" width="120" height="60" style="fill:#7c5cff" />

            <text class="hi big" x="20"  y="200">styled text</text>
            <text class="hi"     x="220" y="200" color="#444444">inline override loses</text>
            <text class="hi"     x="440" y="200" style="color:#80ffd0">inline style wins</text>

            <g x="20" y="240" width="600" height="80">
               <rect class="frame" x="0" y="0" width="600" height="80" fill="#204870" />
               <circle class="red"   cx="60"  cy="40" r="22" />
               <circle class="green" cx="160" cy="40" r="22" />
               <circle class="blue"  cx="260" cy="40" r="22" />
            </g>
         </ui>
      `);

      if (!ui || !ui.styleRules)
         errors.push('styleRules-missing');
      else if (!ui.styleRules.red || ui.styleRules.red.fill !== '#ff4060')
         errors.push('style-rule-not-parsed');
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
