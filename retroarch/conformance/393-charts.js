// Conformance cart 393: drawScatter, drawBarChart, drawPieChart.

let errors = [];

export function init() {
   if (typeof drawScatter  !== 'function') { errors.push('drawScatter-missing');  return; }
   if (typeof drawBarChart !== 'function') { errors.push('drawBarChart-missing'); return; }
   if (typeof drawPieChart !== 'function') { errors.push('drawPieChart-missing'); return; }
}

export function update(dt) {}

export function draw() {
   cls(rgba8(6, 8, 18, 255));
   print('393 CHARTS', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Bar chart
   const barVals = [30, 75, 50, 90, 40, 65, 80, 55];
   drawBarChart(20, 40, 240, 120, barVals, rgba8(80, 160, 255, 255));

   // Bar chart with varied data
   const barVals2 = [10, 45, 80, 60, 95, 30, 70];
   drawBarChart(280, 40, 200, 120, barVals2, rgba8(255, 140, 60, 255));

   // Pie chart
   const pieVals = [30, 20, 25, 15, 10];
   const pieCols = [
      rgba8(255, 80, 80, 220), rgba8(80, 200, 80, 220),
      rgba8(80, 80, 255, 220), rgba8(255, 200, 60, 220),
      rgba8(180, 80, 255, 220)
   ];
   drawPieChart(130, 260, 90, pieVals, pieCols);

   // Scatter plot
   const scatterPts = [];
   for (let i = 0; i < 60; i++) {
      const t = i / 60;
      scatterPts.push(340 + Math.cos(t * Math.PI * 4) * 80 + (i % 7) * 5,
                      260 + Math.sin(t * Math.PI * 3) * 60 + (i % 5) * 4);
   }
   drawScatter(scatterPts, rgba8(100, 220, 255, 255));

   // Second scatter
   const scatterPts2 = [];
   for (let i = 0; i < 40; i++) {
      const t = i / 40;
      scatterPts2.push(470 + t * 120, 200 + Math.sin(t * Math.PI * 6) * 60);
   }
   drawScatter(scatterPts2, rgba8(255, 160, 60, 255));

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
