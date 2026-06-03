// Conformance cart 1107: parseCanvasUI <filter> with <feGaussianBlur>
// and <feDropShadow>. Filters live in <defs> and are referenced via
// filter="url(#id)" on <rect>, <panel>, and <circle>. Drop-shadow renders
// a flood-color copy at (dx,dy) under the main shape; Gaussian blur fakes
// the effect via jittered shape repaints at half-opacity.

let ui = null;
let errors = [];

export function init() {
   if (!nova64 || !nova64.ui || typeof nova64.ui.parseCanvasUI !== 'function')
      errors.push('parseCanvasUI-missing');

   if (errors.length === 0) {
      ui = nova64.ui.parseCanvasUI(`
         <ui>
            <defs>
               <filter id="shadow1">
                  <feDropShadow dx="4" dy="4" stdDeviation="0"
                                flood-color="#000000" flood-opacity="0.7" />
               </filter>
               <filter id="shadow2">
                  <feDropShadow dx="6" dy="6" stdDeviation="2"
                                flood-color="#202060" flood-opacity="0.5" />
               </filter>
               <filter id="blur1">
                  <feGaussianBlur stdDeviation="2" />
               </filter>
            </defs>
            <rect x="0" y="0" width="640" height="360" fill="#101820" />
            <rect x="60" y="60" width="160" height="80" fill="#ff4060"
                  filter="url(#shadow1)" />
            <panel x="280" y="60" width="160" height="80" fill="#40ffa0"
                   stroke="#ffffff" title="Shadow" filter="url(#shadow2)" />
            <circle x="540" y="100" r="40" fill="#80c0ff"
                    filter="url(#shadow1)" />
            <rect x="60" y="220" width="120" height="70" fill="#ffcc40"
                  filter="url(#blur1)" />
            <circle x="320" y="255" r="36" fill="#a060ff"
                    filter="url(#blur1)" />
         </ui>
      `);

      if (!ui || !ui.filters)
         errors.push('filters-missing');
      else {
         if (!ui.filters.shadow1 || ui.filters.shadow1.length !== 1)
            errors.push('shadow1-missing');
         if (!ui.filters.blur1 || ui.filters.blur1[0].type !== 'blur')
            errors.push('blur1-missing');
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
