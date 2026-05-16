// Conformance cart 201: barChart(values, x,y,w,h, color).

let errors = [];

export function init() {
   if (typeof barChart !== 'function') { errors.push('barChart-missing'); return; }
   // Edge: empty array must not crash
   barChart([], 0, 0, 100, 60, rgba8(0,200,100,255));
   barChart([5], 0, 0, 100, 60, rgba8(0,200,100,255));
}

export function update(dt) {}

export function draw() {
   cls(rgba8(8, 10, 18, 255));
   print('201 BAR CHART', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Static bar chart
   const vals1 = [12, 28, 18, 42, 35, 24, 50, 38, 15, 44];
   rectfill(20, 50, 300, 170, rgba8(12, 18, 40, 255));
   rect(20, 50, 300, 170, rgba8(60, 80, 140, 255));
   barChart(vals1, 20, 50, 280, 120, rgba8(80, 180, 255, 255), rgba8(14, 22, 46, 255));

   // Animated bar chart
   const t = nova64.time();
   const vals2 = [];
   for (let i = 0; i < 12; i++) {
      vals2.push(Math.abs(Math.sin(i * 0.6 + t * 1.2)) * 40 + 5);
   }
   rectfill(320, 50, 620, 170, rgba8(12, 18, 40, 255));
   rect(320, 50, 620, 170, rgba8(60, 80, 140, 255));
   barChart(vals2, 320, 50, 300, 120, rgba8(255, 160, 60, 255));

   print('static + animated bars', 8, 180, rgba8(180, 220, 255, 255));
   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
