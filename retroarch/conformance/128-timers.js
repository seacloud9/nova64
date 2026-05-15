// Conformance cart 128: Timer system.
// createTimer(duration); timerDone(h); timerElapsed(h); timerProgress(h);
// resetTimer(h); destroyTimer(h).

let errors = [];
let t1 = 0, t2 = 0;

export function init() {
   if (typeof createTimer   !== 'function') { errors.push('createTimer-missing');   return; }
   if (typeof timerDone     !== 'function') { errors.push('timerDone-missing');     return; }
   if (typeof timerElapsed  !== 'function') { errors.push('timerElapsed-missing');  return; }
   if (typeof timerProgress !== 'function') { errors.push('timerProgress-missing'); return; }
   if (typeof resetTimer    !== 'function') { errors.push('resetTimer-missing');    return; }
   if (typeof destroyTimer  !== 'function') { errors.push('destroyTimer-missing');  return; }

   t1 = createTimer(1.0);
   if (!t1) { errors.push('createTimer returned 0'); return; }

   // Initially not done
   if (timerDone(t1)) errors.push('timerDone true at start');
   if (timerElapsed(t1) > 0.01) errors.push('elapsed > 0 at start: ' + timerElapsed(t1));
   if (timerProgress(t1) > 0.01) errors.push('progress > 0 at start: ' + timerProgress(t1));

   // Short timer that completes after 1 frame
   t2 = createTimer(0.001);
   if (!t2) { errors.push('createTimer t2 returned 0'); return; }

   // Destroy a timer and make sure it doesn't crash
   const td = createTimer(0.5);
   destroyTimer(td);
   // Destroyed timer should report done
   if (!timerDone(td)) errors.push('destroyed timer not done');
}

export function update(dt) {}

export function draw() {
   cls(rgba8(8, 10, 18, 255));
   print('128 TIMERS', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Progress bar
   const p = timerProgress(t1);
   const barW = Math.floor(p * 200);
   rectfill(40, 60, 40 + barW, 74, rgba8(80, 200, 100, 255));
   rect(40, 60, 240, 74, rgba8(100, 140, 100, 255));
   print('t1 ' + (p * 100).toFixed(0) + '%', 4, 64, rgba8(160, 255, 160, 255));

   const e2 = timerElapsed(t2).toFixed(3);
   print('t2 done=' + (timerDone(t2) ? 'y' : 'n') + ' el=' + e2, 4, 80, rgba8(200, 200, 255, 255));

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
