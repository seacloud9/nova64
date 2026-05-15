// Conformance cart 116: Tween system.
// createTween(from, to, duration [, easing]); getTweenValue(h); tweenDone(h);
// destroyTween(h); resetTween(h).

let errors = [];
let tw = 0;
let twBounce = 0;

export function init() {
   if (typeof createTween   !== 'function') { errors.push('createTween-missing');   return; }
   if (typeof getTweenValue !== 'function') { errors.push('getTweenValue-missing'); return; }
   if (typeof tweenDone     !== 'function') { errors.push('tweenDone-missing');     return; }
   if (typeof destroyTween  !== 'function') { errors.push('destroyTween-missing');  return; }
   if (typeof resetTween    !== 'function') { errors.push('resetTween-missing');    return; }

   // Basic linear tween
   tw = createTween(0, 100, 1.0, 'linear');
   if (!tw) { errors.push('createTween returned 0'); return; }

   // Initial value should be near 0
   const v0 = getTweenValue(tw);
   if (Math.abs(v0) > 0.5)
      errors.push('initial value not 0: got ' + v0);

   // Done check before any time passes
   if (tweenDone(tw))
      errors.push('tweenDone true before any frames');

   // Bounce easing tween
   twBounce = createTween(0, 50, 0.5, 'bounceOut');
   if (!twBounce) { errors.push('createTween bounceOut returned 0'); return; }

   // Destroy and recreate to test handle reuse
   const tw2 = createTween(10, 20, 0.3);
   destroyTween(tw2);

   // Reset test: reset tw back to start
   resetTween(tw);
   const vAfterReset = getTweenValue(tw);
   if (Math.abs(vAfterReset) > 0.5)
      errors.push('after reset value not 0: got ' + vAfterReset);
}

export function update(dt) {
   // Tweens advance automatically via retro_run each frame
}

export function draw() {
   cls(rgba8(8, 10, 18, 255));
   print('116 TWEENS', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Draw tween progress bars
   const v  = getTweenValue(tw);
   const vb = getTweenValue(twBounce);

   // Linear bar
   const barW = Math.floor(v * 2);
   rectfill(40, 60, 40 + barW, 72, rgba8(80, 180, 255, 255));
   print('lin ' + Math.floor(v), 4, 64, rgba8(160, 220, 255, 255));

   // Bounce bar
   const barW2 = Math.floor(vb * 3.6);
   rectfill(40, 80, 40 + barW2, 92, rgba8(255, 180, 60, 255));
   print('bnc ' + Math.floor(vb), 4, 84, rgba8(255, 200, 120, 255));

   const doneStr = tweenDone(tw) ? 'done' : 'running';
   print(doneStr, 4, 100, rgba8(180, 255, 180, 255));

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
