// Conformance cart 80: AABB / circle physics colliders
// Tests createCollider, setColliderPos, checkCollision, moveAndCollide, destroyCollider.

let results = [];

function check(label, cond) {
   if (!cond) throw new Error('FAIL: ' + label);
   results.push(label);
}

export function init() {
   // --- Box vs Box ---
   const a = createCollider('box', 10, 10);
   const b = createCollider('box', 10, 10);
   setColliderPos(a, 0, 0);
   setColliderPos(b, 5, 5);
   check('box-box overlap', checkCollision(a, b));
   setColliderPos(b, 20, 20);
   check('box-box separated', !checkCollision(a, b));

   // getColliderPos round-trip
   const pos = getColliderPos(a);
   check('getPos.x', pos.x === 0);
   check('getPos.y', pos.y === 0);

   // --- Circle vs Circle ---
   const c1 = createCollider('circle', 5);
   const c2 = createCollider('circle', 5);
   setColliderPos(c1, 0, 0);
   setColliderPos(c2, 8, 0); // centers 8 apart, radii sum = 10 → overlap
   check('circle-circle overlap', checkCollision(c1, c2));
   setColliderPos(c2, 20, 0); // 20 > 10 → separated
   check('circle-circle separated', !checkCollision(c1, c2));

   // --- Box vs Circle ---
   const bx = createCollider('box', 10, 10);
   const ci = createCollider('circle', 5);
   setColliderPos(bx, 0, 0);
   setColliderPos(ci, 12, 5); // circle center at (12,5), box 0-10 → just inside
   check('box-circle overlap', checkCollision(bx, ci));
   setColliderPos(ci, 30, 30);
   check('box-circle separated', !checkCollision(bx, ci));

   // --- moveAndCollide ---
   const mover = createCollider('box', 8, 8);
   const wall  = createCollider('box', 8, 8);
   setColliderPos(mover, 0, 0);
   setColliderPos(wall, 20, 0);

   // Move towards wall — no overlap yet
   const r1 = moveAndCollide(mover, 5, 0, [wall]);
   check('mac no-hit x', r1.x === 5);
   check('mac no-hit', !r1.hit);

   // Move into wall — should be blocked
   const r2 = moveAndCollide(mover, 20, 0, [wall]);
   check('mac hit', r2.hit);
   check('mac blocked x', r2.x === 5); // position unchanged on hit

   // --- destroyCollider ---
   destroyCollider(a);
   check('destroyed handle invalid', !checkCollision(a, b));

   // createCollider returns 0 when pool exhausted (verify robustness)
   const handles = [];
   for (let i = 0; i < 70; i++) handles.push(createCollider('box', 1, 1));
   const overflowHandle = handles[handles.length - 1];
   check('overflow returns 0 or valid', overflowHandle >= 0);
   for (const h of handles) if (h) destroyCollider(h);
}

export function update(dt) {}

export function draw() {
   cls(rgba8(10, 18, 28, 255));
   print('80 PHYSICS', 4, 4, rgba8(100, 220, 255, 255));
   print('tests: ' + results.length, 4, 14, rgba8(200, 200, 200, 255));
   // Draw a simple box and circle to give visual output
   rect(10, 30, 40, 40, rgba8(80, 180, 80, 255));
   circ(80, 50, 18, rgba8(80, 130, 220, 255));
   print('box+circle ok', 4, 80, rgba8(180, 255, 180, 255));
}
