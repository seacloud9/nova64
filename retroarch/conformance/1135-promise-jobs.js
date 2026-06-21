// Conformance cart 1135: per-frame microtask (Promise) draining.
// A Promise.then() scheduled during update() must resolve before a later
// frame's draw(). Before the per-frame job-drain fix the QuickJS job queue
// only ran at load/init, so promise continuations created during gameplay
// never fired — carts awaiting async work (e.g. indie-odyssey combat waiting
// on a model/asset load) sat in a permanent "loading" state and stalled.
// Chains three .then()s to exercise the drain loop, not just a single job.

let scheduled = false;
let resolved = false;
let chainDepth = 0;

export function init() {
  print('promise-jobs:init');
}

export function update(dt) {
  if (!scheduled) {
    scheduled = true;
    Promise.resolve()
      .then(() => { chainDepth = 1; })
      .then(() => { chainDepth = 2; })
      .then(() => { chainDepth = 3; resolved = true; });
  }
}

export function draw() {
  cls(rgba8(8, 12, 18, 255));
  print('1135 PROMISE JOBS', 4, 4, rgba8(120, 80, 200, 255));
  if (resolved && chainDepth === 3) {
    print('ok', 4, 14, rgba8(80, 255, 120, 255));
  } else {
    print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
  }
}
