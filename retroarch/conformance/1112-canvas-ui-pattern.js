// Conformance cart 1112: parseCanvasUI <pattern> tiled fills.
// A <pattern id w h> in <defs> can host arbitrary child shapes that are
// rendered repeatedly across the bounds of a shape filled via
// fill="url(#id)". Tiles clip to the filled bbox via the existing draw
// clip stack. Pattern children render with the tile's (tileX,tileY) as
// their origin and (pat.w, pat.h) as their parent dimensions.

let ui = null;
let errors = [];

export function init() {
   if (!nova64 || !nova64.ui || typeof nova64.ui.parseCanvasUI !== 'function')
      errors.push('parseCanvasUI-missing');

   if (errors.length === 0) {
      ui = nova64.ui.parseCanvasUI(`
         <ui>
            <defs>
               <pattern id="dots" width="20" height="20">
                  <circle x="10" y="10" r="3" fill="#80a0d0" />
               </pattern>
               <pattern id="grid" width="32" height="32">
                  <line x1="0" y1="0" x2="32" y2="0" color="#283040" />
                  <line x1="0" y1="0" x2="0" y2="32" color="#283040" />
               </pattern>
               <pattern id="diag" width="24" height="24">
                  <line x1="0" y1="0" x2="24" y2="24" color="#406080" />
                  <line x1="12" y1="0" x2="36" y2="24" color="#406080" />
               </pattern>
               <linearGradient id="badge" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%"   stop-color="#ffe080" />
                  <stop offset="100%" stop-color="#cc8800" />
               </linearGradient>
            </defs>
            <rect x="0" y="0" width="640" height="360" fill="#101820" />
            <rect x="20"  y="20"  width="200" height="120" fill="url(#dots)"
                  stroke="#ffffff" />
            <rect x="240" y="20"  width="200" height="120" fill="url(#grid)"
                  stroke="#ffffff" />
            <rect x="460" y="20"  width="160" height="120" fill="url(#diag)"
                  stroke="#ffffff" />
            <circle x="120" y="240" r="60" fill="url(#dots)"
                    stroke="#ffffff" />
            <panel x="240" y="180" width="200" height="120"
                   fill="url(#grid)" stroke="#ffffff" title="GRID" />
            <rect x="460" y="180" width="160" height="60" fill="url(#badge)"
                  stroke="#ffffff" />
         </ui>
      `);

      if (!ui || !ui.patterns)
         errors.push('patterns-missing');
      else if (!ui.patterns.dots || !ui.patterns.grid || !ui.patterns.diag)
         errors.push('pattern-ids-missing');
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
