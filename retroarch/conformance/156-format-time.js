// Conformance cart 156: formatTime(seconds) / formatTimeMs(ms).

let errors = [];

export function init() {
   if (typeof formatTime   !== 'function') { errors.push('formatTime-missing'); return; }
   if (typeof formatTimeMs !== 'function') { errors.push('formatTimeMs-missing'); return; }

   if (formatTime(0)    !== '00:00')    errors.push('formatTime-0: ' + formatTime(0));
   if (formatTime(65)   !== '01:05')    errors.push('formatTime-65: ' + formatTime(65));
   if (formatTime(3661) !== '1:01:01')  errors.push('formatTime-3661: ' + formatTime(3661));

   if (formatTimeMs(0)     !== '00:00.000') errors.push('formatTimeMs-0: ' + formatTimeMs(0));
   if (formatTimeMs(65500) !== '01:05.500') errors.push('formatTimeMs-65500: ' + formatTimeMs(65500));
}

export function update(dt) {}

export function draw() {
   cls(rgba8(8, 10, 18, 255));
   print('156 FORMAT TIME', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   const y0 = 40;
   const c = rgba8(180, 220, 255, 255);
   print('formatTime(0)    = ' + formatTime(0),    8, y0,      c);
   print('formatTime(65)   = ' + formatTime(65),   8, y0 + 12, c);
   print('formatTime(3661) = ' + formatTime(3661), 8, y0 + 24, c);
   print('formatTimeMs(65500) = ' + formatTimeMs(65500), 8, y0 + 40, c);

   // Show current game time as a countdown-style display
   const elapsed = nova64.time();
   rectfill(80, 140, 240, 180, rgba8(20, 30, 60, 255));
   printCentered(formatTime(elapsed), 160, 153, rgba8(200, 240, 100, 255));
   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
