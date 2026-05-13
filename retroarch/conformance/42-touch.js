// Conformance cart 42: RetroArch pointer/touch input.

let errors = [];

export function init() {
   if (typeof touchX !== 'function') errors.push('touchX missing');
   if (typeof touchY !== 'function') errors.push('touchY missing');
   if (typeof touchCount !== 'function') errors.push('touchCount missing');

   if (touchCount() !== 1) errors.push('count:' + touchCount());
   if (touchX() !== 123) errors.push('x:' + touchX());
   if (touchY() !== -45) errors.push('y:' + touchY());
   if (nova64.input.touchCount() !== 1) errors.push('namespace');
}

export function update() {}

export function draw() {
   cls(rgba8(8, 10, 18, 255));
   const ok = errors.length === 0;
   rect(40, 42, 90, 36, ok ? rgba8(120, 180, 255, 255) : rgba8(220, 70, 90, 255), true);
   print(ok ? '42 touch ok' : '42 touch fail', 4, 4, ok ? rgba8(90, 255, 130, 255) : rgba8(255, 120, 120, 255));
   if (!ok) print(errors[0], 4, 16, rgba8(255, 190, 120, 255));
}
