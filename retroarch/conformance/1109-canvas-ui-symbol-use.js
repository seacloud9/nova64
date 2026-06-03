// Conformance cart 1109: parseCanvasUI <symbol> + <use> instancing.
// A <symbol id="..."> in <defs> can be instanced many times via
// <use href="#id" x="..." y="..."/>. The symbol's children render
// with the use's (x,y) as their origin. Recursion is capped at depth 8
// so a self-referencing symbol cannot lock the renderer.

let ui = null;
let errors = [];

export function init() {
   if (!nova64 || !nova64.ui || typeof nova64.ui.parseCanvasUI !== 'function')
      errors.push('parseCanvasUI-missing');

   if (errors.length === 0) {
      ui = nova64.ui.parseCanvasUI(`
         <ui>
            <defs>
               <linearGradient id="coinGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%"   stop-color="#ffe080" />
                  <stop offset="100%" stop-color="#cc8800" />
               </linearGradient>
               <symbol id="coin">
                  <circle x="0" y="0" r="14" fill="url(#coinGrad)"
                          stroke="#ffffff" />
                  <circle x="0" y="0" r="6"  fill="#ffeebb" />
               </symbol>
               <symbol id="heart">
                  <circle x="-6" y="0" r="10" fill="#ff4060" />
                  <circle x="6"  y="0" r="10" fill="#ff4060" />
                  <triangle x="0" y="14" r="14" fill="#ff4060" />
               </symbol>
               <symbol id="badge">
                  <rect x="0" y="0" width="60" height="20" fill="#404060"
                        stroke="#ffffff" radius="6" />
               </symbol>
            </defs>
            <rect x="0" y="0" width="640" height="360" fill="#101820" />
            <use href="#coin" x="80"  y="80" />
            <use href="#coin" x="140" y="80" />
            <use href="#coin" x="200" y="80" />
            <use href="#coin" x="260" y="80" />
            <use href="#coin" x="320" y="80" />
            <use href="#heart" x="80"  y="200" />
            <use href="#heart" x="160" y="200" />
            <use href="#heart" x="240" y="200" />
            <use href="#badge" x="400" y="80" />
            <use href="#badge" x="400" y="120" />
            <use href="#badge" x="400" y="160" />
         </ui>
      `);

      if (!ui || !ui.symbols)
         errors.push('symbols-missing');
      else if (!ui.symbols.coin || !ui.symbols.heart || !ui.symbols.badge)
         errors.push('symbol-ids-missing');
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
