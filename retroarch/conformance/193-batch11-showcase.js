// Conformance cart 193: batch 11 APIs combined showcase.

let errors = [];

export function init() {
   const needed = ['drawCubicBezier', 'splinePoint', 'hexGrid', 'drawGraph',
                   'colorDesaturate', 'colorSaturate', 'waveformPlot',
                   'charCode', 'charFromCode', 'printBold', 'dotGrid', 'clampColor'];
   for (const f of needed) {
      if (typeof globalThis[f] !== 'function') errors.push(f + '-missing');
   }
}

export function update(dt) {}

export function draw() {
   cls(rgba8(6, 8, 16, 255));
   printBold('193 BATCH 11', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   const t = nova64.time();

   // Hex grid background (left panel)
   dotGrid(0, 20, 200, 340, 12, 1, rgba8(30, 45, 80, 255));
   hexGrid(10, 30, 16, 5, 8, rgba8(50, 80, 140, 255));

   // Cubic bezier ribbon (center)
   for (let i = 0; i < 6; i++) {
      const phase = t * 0.5 + i * 0.3;
      const cy0 = 80 + Math.sin(phase) * 40;
      const cy1 = 80 - Math.cos(phase) * 40;
      const hue = (i * 40 + t * 20) % 360;
      drawCubicBezier(220, 60, 270, cy0, 370, cy1, 420, 160,
         colorHSV(hue, 180, 200, 255));
   }

   // Waveform (bottom)
   const wav = [];
   for (let i = 0; i < 80; i++) wav.push(Math.sin(i / 80 * Math.PI * 6 + t * 2) * 0.8);
   rectfill(220, 200, 620, 250, rgba8(12, 18, 40, 255));
   waveformPlot(wav, 220, 200, 400, 50, rgba8(80, 200, 255, 255));

   // Graph (right)
   const gdata = [];
   for (let i = 0; i < 20; i++) gdata.push(Math.abs(Math.sin(i * 0.5 + t)));
   rectfill(440, 60, 620, 180, rgba8(12, 18, 40, 255));
   drawGraph(gdata, 440, 60, 180, 120, 0, 1, rgba8(255, 180, 60, 255));

   // Color desaturate strip
   const baseC = rgba8(200, 100, 40, 255);
   for (let i = 0; i < 10; i++) {
      const c = colorDesaturate(baseC, i / 9);
      rectfill(220 + i * 20, 270, 238 + i * 20, 290, c);
   }

   // charCode display
   print('A=' + charCode('A') + ' a=' + charCode('a'), 220, 300, rgba8(160, 200, 255, 255));

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
