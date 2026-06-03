// Conformance cart 1104: parseCanvasUI font-family aliases.
// Custom bitmap font handles are optional; unknown/zero handles fall back to
// the built-in bitmap font while preserving deterministic font-width metrics.

let ui = null;
let errors = [];

export function init() {
   if (!nova64 || !nova64.ui || typeof nova64.ui.parseCanvasUI !== 'function')
      errors.push('parseCanvasUI-missing');
   if (typeof nova64.ui.registerFontFamily !== 'function')
      errors.push('registerFontFamily-missing');

   if (errors.length === 0) {
      nova64.ui.registerFontFamily('hud', 0);
      if (!nova64.ui.fontFamilies || !('hud' in nova64.ui.fontFamilies))
         errors.push('fontFamilies-hud-missing');
   }

   ui = nova64.ui.parseCanvasUI(`
      <ui>
         <rect x="0" y="0" width="640" height="360" fill="#080c18" />
         <text x="320" y="44" anchor-x="center" color="#b4dcff"
               size="12" font-family="hud" font-width="5">FONT FAMILY</text>
         <text x="320" y="82" anchor-x="center" color="#8cffb0"
               size="8" fontFamily="{family}" glyph-width="4">DATA FONT</text>
         <panel x="220" y="126" width="200" height="82" fill="#1a2438cc"
                stroke="#78aaff" title="Panel Font" font-family="missing"
                font-width="4">
            <progressbar x="12" y="44" width="176" height="14" value="{hp}"
                         max="100" background="#203040" fill="#40ffa0"
                         label="HP {hp}" fontFamily="hud" />
         </panel>
         <button x="244" y="242" width="152" height="34" text="Button Font"
                 fill="#243050" stroke="#b4dcff" text-color="#ffffff"
                 font-family="hud" font-width="4" />
      </ui>
   `);
}

export function update(dt) {}

export function draw() {
   cls(rgba8(8, 12, 24, 255));
   if (ui)
      nova64.ui.renderCanvasUI(ui, { hp: 64, family: 'hud' });
   if (errors.length === 0) {
      print('ok', 4, 4, rgba8(80, 255, 120, 255));
   } else {
      print('FAIL', 4, 4, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 14, rgba8(255, 120, 120, 255));
   }
}
