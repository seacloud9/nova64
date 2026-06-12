// Conformance cart 1129: parseCanvasUI <style> block element + id selectors.
// Extends the 1124 .className parser so element-name (rect, circle,
// text) and #id selectors are also honored. Specificity order matches
// SVG: element rules < class rules < id rules < inline style attr.

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
                  rect      { fill: #204870 }
                  circle    { fill: #56d364 }
                  text      { color: #ffe080 }
                  .accent   { fill: #ff4060 }
                  #hero     { fill: #80d0ff }
                  #hero-txt { color: #101820 }
               </style>
            </defs>

            <rect x="0" y="0" width="640" height="360" fill="#101820" />

            <rect x="20"  y="20" width="120" height="80" />
            <rect x="160" y="20" width="120" height="80" class="accent" />
            <rect x="300" y="20" width="120" height="80" id="hero" />
            <rect x="440" y="20" width="120" height="80" id="hero" class="accent" />

            <circle cx="80"  cy="160" r="40" />
            <circle cx="200" cy="160" r="40" class="accent" />
            <circle cx="320" cy="160" r="40" id="hero" />

            <text x="20"  y="240">element selector</text>
            <text x="220" y="240" id="hero-txt">id wins over element</text>

            <rect x="20" y="270" width="600" height="50" id="hero" style="fill:#7c5cff" />
            <text x="40" y="298" id="hero-txt" style="color:#ffffff">inline style overrides id</text>
         </ui>
      `);

      if (!ui || !ui.styleRules) errors.push('styleRules-missing');
      else {
         if (!ui.styleRules.byTag || !ui.styleRules.byTag.rect)
            errors.push('byTag-rect-missing');
         if (!ui.styleRules.byId || !ui.styleRules.byId.hero)
            errors.push('byId-hero-missing');
         if (!ui.styleRules.byClass || !ui.styleRules.byClass.accent)
            errors.push('byClass-accent-missing');
      }
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
