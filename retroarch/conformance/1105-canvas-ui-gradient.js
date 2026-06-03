// Conformance cart 1105: parseCanvasUI <linearGradient> / <radialGradient> defs.
// Multi-stop gradients referenced via fill="url(#id)" rasterize through
// scanline fills (linear) or the native fillRadialGradient + ring fallback
// (radial). Stops accept hex colors and stop-opacity, sorted by offset.

let ui = null;
let errors = [];

export function init() {
   if (!nova64 || !nova64.ui || typeof nova64.ui.parseCanvasUI !== 'function')
      errors.push('parseCanvasUI-missing');

   if (errors.length === 0) {
      ui = nova64.ui.parseCanvasUI(`
         <ui>
            <defs>
               <linearGradient id="sky" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%"   stop-color="#1a2640" />
                  <stop offset="60%"  stop-color="#4a7cc0" />
                  <stop offset="100%" stop-color="#ffcc88" />
               </linearGradient>
               <linearGradient id="bar" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%"   stop-color="#ff4040" />
                  <stop offset="50%"  stop-color="#ffdc40" />
                  <stop offset="100%" stop-color="#40ff80" />
               </linearGradient>
               <radialGradient id="sun" cx="50%" cy="50%" r="50%">
                  <stop offset="0%"   stop-color="#ffeebb" />
                  <stop offset="100%" stop-color="#ff883080" />
               </radialGradient>
               <radialGradient id="orb" cx="50%" cy="50%" r="50%">
                  <stop offset="0%"   stop-color="#ffffff" />
                  <stop offset="40%"  stop-color="#88c8ff" />
                  <stop offset="100%" stop-color="#1828a0" />
               </radialGradient>
            </defs>
            <rect x="0"   y="0"   width="640" height="360" fill="url(#sky)" />
            <circle x="160" y="120" r="48" fill="url(#sun)" />
            <circle x="480" y="120" r="48" fill="url(#orb)" stroke="#ffffff" />
            <panel x="120" y="220" width="400" height="60" fill="url(#bar)"
                   stroke="#ffffff" title="GRADIENT" />
            <rect x="120" y="296" width="400" height="20" fill="url(#bar)" />
         </ui>
      `);

      if (!ui || !ui.gradients)
         errors.push('gradients-missing');
      else {
         if (!ui.gradients.sky || ui.gradients.sky.type !== 'linear')
            errors.push('sky-linear-missing');
         if (!ui.gradients.sun || ui.gradients.sun.type !== 'radial')
            errors.push('sun-radial-missing');
         if (!ui.gradients.bar || ui.gradients.bar.stops.length !== 3)
            errors.push('bar-stops-count');
      }
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
