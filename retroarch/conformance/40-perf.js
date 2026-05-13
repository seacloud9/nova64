// Conformance cart 40: lightweight in-cart performance timers.

let errors = [];
let count = 0;

export function init() {
   if (!nova64.perf) throw new Error('nova64.perf missing');
   for (const fn of ['begin', 'end', 'report', 'clear']) {
      if (typeof nova64.perf[fn] !== 'function') errors.push(fn + ':missing');
   }

   nova64.perf.begin('setup');
   let sink = 0;
   for (let i = 0; i < 2000; i++) sink += i;
   const elapsed = nova64.perf.end('setup');
   const report = nova64.perf.report();
   if (!report.setup) errors.push('setup:missing');
   else {
      if (report.setup.count !== 1) errors.push('count:' + report.setup.count);
      if (report.setup.active !== false) errors.push('active');
      if (report.setup.total < 0 || elapsed < 0) errors.push('elapsed');
   }

   nova64.perf.clear();
   if (nova64.perf.report().setup !== undefined) errors.push('clear');
   nova64.perf.begin('draw');
   nova64.perf.end('draw');
   count = nova64.perf.report().draw.count;
}

export function update() {}

export function draw() {
   cls(rgba8(8, 14, 18, 255));
   const ok = errors.length === 0 && count === 1;
   rect(28, 36, 120, 36, ok ? rgba8(200, 230, 80, 255) : rgba8(230, 70, 70, 255), true);
   print(ok ? '40 perf ok' : '40 perf fail', 4, 4, ok ? rgba8(120, 255, 120, 255) : rgba8(255, 100, 100, 255));
   if (!ok) print(errors[0] || ('count:' + count), 4, 16, rgba8(255, 190, 120, 255));
}
