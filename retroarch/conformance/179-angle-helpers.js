// Conformance cart 179: wrapAngle / angleDiff / angleLerp / moveToward.

let errors = [];

export function init() {
   if (typeof wrapAngle   !== 'function') { errors.push('wrapAngle-missing');   return; }
   if (typeof angleDiff   !== 'function') { errors.push('angleDiff-missing');   return; }
   if (typeof angleLerp   !== 'function') { errors.push('angleLerp-missing');   return; }
   if (typeof moveToward  !== 'function') { errors.push('moveToward-missing');  return; }

   // wrapAngle
   const w1 = wrapAngle(370);
   if (Math.abs(w1 - 10) > 0.001) errors.push('wrapAngle-370: ' + w1);
   const w2 = wrapAngle(-10);
   if (Math.abs(w2 - 350) > 0.001) errors.push('wrapAngle--10: ' + w2);

   // angleDiff
   const d1 = angleDiff(10, 350);
   if (Math.abs(d1 - (-20)) > 0.001) errors.push('angleDiff-10-350: ' + d1);
   const d2 = angleDiff(350, 10);
   if (Math.abs(d2 - 20) > 0.001) errors.push('angleDiff-350-10: ' + d2);

   // angleLerp
   const al = angleLerp(0, 90, 0.5);
   if (Math.abs(al - 45) > 0.001) errors.push('angleLerp: ' + al);

   // moveToward
   const mt = moveToward(10, 20, 5);
   if (Math.abs(mt - 15) > 1e-6) errors.push('moveToward-5: ' + mt);
   const mt2 = moveToward(10, 12, 5);
   if (Math.abs(mt2 - 12) > 1e-6) errors.push('moveToward-overshoot: ' + mt2);
}

export function update(dt) {}

export function draw() {
   cls(rgba8(8, 10, 18, 255));
   print('179 ANGLE HELPERS', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   const t = nova64.time();
   const target = (t * 60) % 360;
   const cx = 160, cy = 140, r = 60;

   // Two arrows: target (yellow) and moveToward follower (cyan)
   let follower = wrapAngle(target - 45 + moveToward(0, 45, t * 30 % 45));

   circ(cx, cy, r, rgba8(40, 60, 100, 255));

   const tx = cx + Math.round(Math.cos(target * Math.PI / 180) * r);
   const ty = cy + Math.round(Math.sin(target * Math.PI / 180) * r);
   line(cx, cy, tx, ty, rgba8(255, 220, 60, 255));

   const fx = cx + Math.round(Math.cos(follower * Math.PI / 180) * r);
   const fy = cy + Math.round(Math.sin(follower * Math.PI / 180) * r);
   line(cx, cy, fx, fy, rgba8(80, 220, 255, 255));

   const diff = angleDiff(follower, target).toFixed(1);
   print('diff=' + diff + 'deg', 8, 215, rgba8(180, 220, 255, 255));
   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
