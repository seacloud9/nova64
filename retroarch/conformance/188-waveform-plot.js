// Conformance cart 188: waveformPlot(samples, x,y,w,h, color).

let errors = [];
const wave = [];

export function init() {
   if (typeof waveformPlot !== 'function') { errors.push('waveformPlot-missing'); return; }
   // Edge: must not crash with empty or single sample
   waveformPlot([], 0, 0, 100, 40, rgba8(255,255,255,255));
   waveformPlot([0.5], 0, 0, 100, 40, rgba8(255,255,255,255));

   // Build a waveform: sine + some harmonics
   const N = 128;
   for (let i = 0; i < N; i++) {
      const t = i / N;
      wave.push(
         0.5 * Math.sin(t * Math.PI * 8) +
         0.3 * Math.sin(t * Math.PI * 24) +
         0.2 * Math.sin(t * Math.PI * 48)
      );
   }
}

export function update(dt) {}

export function draw() {
   cls(rgba8(8, 10, 18, 255));
   print('188 WAVEFORM PLOT', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Background panel
   rectfill(10, 40, 620, 100, rgba8(12, 18, 40, 255));
   rect(10, 40, 620, 100, rgba8(60, 80, 140, 255));
   hline(10, 620, 70, rgba8(40, 60, 100, 255));
   waveformPlot(wave, 10, 40, 610, 60, rgba8(100, 220, 255, 255));

   // Second waveform: square-ish
   const sq = [];
   for (let i = 0; i < 64; i++) sq.push(i < 32 ? 0.9 : -0.9);
   rectfill(10, 120, 620, 180, rgba8(12, 18, 40, 255));
   rect(10, 120, 620, 180, rgba8(60, 80, 140, 255));
   waveformPlot(sq, 10, 120, 610, 60, rgba8(255, 160, 60, 255));

   print('waveform + square wave', 10, 190, rgba8(180, 220, 255, 255));
   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
