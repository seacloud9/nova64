import test from 'node:test';
import assert from 'node:assert/strict';
import {
  STEP,
  LENGTH,
  course,
  sample,
  newCraft,
  crossGates,
  recover,
  step,
  aiInput,
} from '../examples/breakwater-circuit/race.js';

test('the course closes and progress is continuous across the seam', () => {
  const a = sample(0),
    b = sample(LENGTH);
  assert.deepEqual(a, b);
  assert.ok(Math.hypot(sample(LENGTH - 0.01).x - a.x, sample(LENGTH - 0.01).z - a.z) < 0.02);
  assert.ok(course.every((p, i) => i === 0 || p.s > course[i - 1].s));
});
test('backward finish, skipped gates and teleporting cannot award laps', () => {
  const p = newCraft();
  crossGates(p, LENGTH + 0.1, LENGTH - 0.1, 0);
  crossGates(p, LENGTH - 0.1, LENGTH + 0.1, 0);
  crossGates(p, 0, LENGTH, 0);
  assert.equal(p.lap, 0);
  assert.equal(p.nextGate, 1);
  for (let gate = 1; gate <= 7; gate++)
    crossGates(p, (gate * LENGTH) / 8 - 0.1, (gate * LENGTH) / 8 + 0.1, 0);
  crossGates(p, LENGTH - 0.1, LENGTH + 0.1, 30);
  assert.equal(p.lap, 0);
  crossGates(p, LENGTH - 0.1, LENGTH + 0.1, 0);
  assert.equal(p.lap, 1);
  crossGates(p, LENGTH + 0.1, LENGTH - 0.1, 0);
  crossGates(p, LENGTH - 0.1, LENGTH + 0.1, 0);
  assert.equal(p.lap, 1);
});
test('recovery stays at last valid gate, adds visible penalty and cannot grant progress', () => {
  const p = newCraft();
  crossGates(p, LENGTH / 8 - 0.1, LENGTH / 8 + 0.1, 0);
  p.s = LENGTH - 0.1;
  p.lane = 25;
  const next = p.nextGate;
  recover(p);
  assert.equal(p.nextGate, next);
  assert.equal(p.lap, 0);
  assert.equal(p.penalty, 3);
  assert.equal(p.s, p.checkpoint + 0.1);
  assert.match(p.notice, /RECOVERY/);
  assert.equal(p.clean, false);
});
test('light scrapes remain steerable; heavy contact costs more momentum', () => {
  const light = newCraft(30, 12),
    heavy = newCraft(30, 12);
  light.speed = heavy.speed = 70;
  light.slip = 4;
  heavy.slip = 30;
  step(light, { throttle: true });
  step(heavy, { throttle: true });
  assert.ok(heavy.speed < light.speed);
  assert.ok(light.speed > 40);
  step(light, { throttle: true, steer: -1 });
  assert.ok(Number.isFinite(light.heading));
});
test('a charge can be banked, then spent; boost strips cannot be farmed by reversing', () => {
  const p = newCraft(40);
  p.charge = 1;
  step(p, {});
  assert.equal(p.charge, 1);
  step(p, { boost: true });
  assert.equal(p.charge, 0);
  assert.ok(p.boost > 1);
  const q = newCraft(LENGTH * 0.08 - 0.2);
  q.speed = 60;
  step(q, { throttle: true });
  assert.equal(q.padPass.size, 1);
  q.s = LENGTH * 0.08 - 0.2;
  q.boost = 0;
  q.speed = 60;
  step(q, { throttle: true });
  assert.equal(q.padPass.size, 1);
  assert.equal(q.boost, 0);
});
function race(reckless = false, index = 0) {
  const p = newCraft();
  let contacts = 0;
  for (let i = 0; i < 120 * 180 && !p.finished; i++) {
    const input = aiInput(p, index);
    if (reckless)
      Object.assign(input, {
        throttle: true,
        brake: false,
        leftBrake: false,
        rightBrake: false,
        boost: false,
      });
    const before = p.hit;
    step(p, input);
    if (p.hit > before) contacts++;
  }
  return { p, contacts };
}
test('clean airbrake entries and timed boosts beat full-throttle wall scraping', () => {
  const clean = race(),
    reckless = race(true);
  assert.equal(clean.p.lap, 3);
  assert.equal(reckless.p.lap, 3);
  assert.equal(clean.contacts, 0);
  assert.ok(reckless.contacts > 10);
  assert.ok(clean.p.time + 3 < reckless.p.time);
  assert.equal(clean.p.awarded.size, 9); // Each of three marked bends, once per lap.
  const old = clean.p.time;
  step(clean.p, { throttle: true });
  assert.equal(clean.p.time, old);
  console.log(
    `Clean ${clean.p.time.toFixed(2)}s / ${clean.contacts} hits; flat ${reckless.p.time.toFixed(2)}s / ${reckless.contacts} hits`
  );
});
test('all five rivals finish and a fresh retry resets race accounting', () => {
  for (let i = 1; i <= 5; i++) assert.equal(race(false, i).p.lap, 3);
  const p = newCraft();
  assert.equal(p.time, 0);
  assert.equal(p.nextGate, 1);
  assert.equal(p.awarded.size, 0);
});
test('fixed simulation produces the same result at 30, 60 and 120 presentation FPS', () => {
  const run = fps => {
    let acc = 0;
    const p = newCraft();
    for (let n = 0; n < fps * 10; n++) {
      acc += 1 / fps;
      while (acc >= STEP) {
        step(p, { throttle: true });
        acc -= STEP;
      }
    }
    return p;
  };
  assert.deepEqual(run(30), run(120));
  assert.deepEqual(run(60), run(120));
});
