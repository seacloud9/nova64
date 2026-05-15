// Conformance cart 161: createDialog / drawDialog / dialogDone / advanceDialog / destroyDialog / dialogCharCount.

let errors = [];
let dlg = 0;

export function init() {
   if (typeof createDialog    !== 'function') { errors.push('createDialog-missing');    return; }
   if (typeof drawDialog      !== 'function') { errors.push('drawDialog-missing');      return; }
   if (typeof dialogDone      !== 'function') { errors.push('dialogDone-missing');      return; }
   if (typeof advanceDialog   !== 'function') { errors.push('advanceDialog-missing');   return; }
   if (typeof destroyDialog   !== 'function') { errors.push('destroyDialog-missing');   return; }
   if (typeof dialogCharCount !== 'function') { errors.push('dialogCharCount-missing'); return; }

   dlg = createDialog('Hello, Nova64 world!', 12.0);
   if (typeof dlg !== 'number') { errors.push('createDialog-not-number'); return; }

   const cc = dialogCharCount(dlg);
   if (typeof cc !== 'number') errors.push('dialogCharCount-not-number');
   if (cc < 0) errors.push('dialogCharCount-negative');

   const done0 = dialogDone(dlg);
   if (typeof done0 !== 'boolean' && typeof done0 !== 'number') errors.push('dialogDone-bad-type');

   advanceDialog(dlg);
}

export function update(dt) {}

export function draw() {
   cls(rgba8(8, 10, 18, 255));
   print('161 DIALOG', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   rectfill(40, 120, 280, 200, rgba8(20, 30, 60, 255));
   rect(40, 120, 280, 200, rgba8(100, 140, 220, 255));
   drawDialog(dlg, 48, 130, rgba8(220, 240, 255, 255));

   print('chars: ' + dialogCharCount(dlg), 8, 40, rgba8(180, 220, 255, 255));
   print('done: '  + dialogDone(dlg),      8, 52, rgba8(180, 220, 255, 255));
   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
