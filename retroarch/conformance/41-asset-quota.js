// Conformance cart 41: asset quota reporting and rejection.

let errors = [];

export function init() {
   if (!nova64.assets || typeof nova64.assets.quota !== 'function')
      throw new Error('nova64.assets.quota missing');

   const quota = nova64.assets.quota();
   if (quota.max !== 8) errors.push('max:' + quota.max);
   if (quota.used !== 5) errors.push('used:' + quota.used);
   if (quota.count !== 1) errors.push('count:' + quota.count);
   if (quota.rejected !== 1) errors.push('rejected:' + quota.rejected);
   if (!nova64.assets.has('assets/small.txt')) errors.push('small');
   if (nova64.assets.has('assets/large.txt')) errors.push('large');
   if (assetQuota().used !== quota.used) errors.push('alias');
}

export function update() {}

export function draw() {
   cls(rgba8(10, 12, 18, 255));
   const ok = errors.length === 0;
   rect(24, 34, 136, 44, ok ? rgba8(100, 210, 180, 255) : rgba8(220, 70, 70, 255), true);
   print(ok ? '41 quota ok' : '41 quota fail', 4, 4, ok ? rgba8(90, 255, 150, 255) : rgba8(255, 120, 120, 255));
   if (!ok) print(errors[0], 4, 16, rgba8(255, 190, 130, 255));
}
