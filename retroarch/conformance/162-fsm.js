// Conformance cart 162: createFSM / fsmSet / fsmGet / fsmPrev / fsmElapsed / destroyFSM.

let errors = [];
let fsm = 0;

export function init() {
   if (typeof createFSM  !== 'function') { errors.push('createFSM-missing');  return; }
   if (typeof fsmSet     !== 'function') { errors.push('fsmSet-missing');     return; }
   if (typeof fsmGet     !== 'function') { errors.push('fsmGet-missing');     return; }
   if (typeof fsmPrev    !== 'function') { errors.push('fsmPrev-missing');    return; }
   if (typeof fsmElapsed !== 'function') { errors.push('fsmElapsed-missing'); return; }
   if (typeof destroyFSM !== 'function') { errors.push('destroyFSM-missing'); return; }

   fsm = createFSM(0);
   if (typeof fsm !== 'number' || fsm === 0) { errors.push('createFSM-invalid'); return; }

   if (fsmGet(fsm) !== 0) errors.push('fsmGet-initial: ' + fsmGet(fsm));

   fsmSet(fsm, 1);
   if (fsmGet(fsm) !== 1) errors.push('fsmGet-after-set: ' + fsmGet(fsm));
   if (fsmPrev(fsm) !== 0) errors.push('fsmPrev-after-set: ' + fsmPrev(fsm));

   const el = fsmElapsed(fsm);
   if (typeof el !== 'number' || el < 0) errors.push('fsmElapsed-bad: ' + el);
}

export function update(dt) {}

export function draw() {
   cls(rgba8(8, 10, 18, 255));
   print('162 FSM', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   const states = ['IDLE', 'WALK', 'JUMP', 'FALL'];
   const cur = fsmGet(fsm);
   print('state: ' + (states[cur] || cur), 8, 40, rgba8(180, 220, 255, 255));
   print('prev:  ' + fsmPrev(fsm),         8, 52, rgba8(180, 220, 255, 255));
   print('elapsed: ' + fsmElapsed(fsm).toFixed(2), 8, 64, rgba8(180, 220, 255, 255));

   for (let i = 0; i < states.length; i++) {
      const col = (i === cur) ? rgba8(255, 220, 60, 255) : rgba8(100, 120, 160, 255);
      print(states[i], 40 + i * 70, 90, col);
   }
   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
