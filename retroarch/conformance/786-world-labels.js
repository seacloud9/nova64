// Conformance cart 786: Batch 65 — world labels.
// createWorldLabel, updateWorldLabel, setWorldLabelPos, setWorldLabelColor,
// setWorldLabelVisible, setWorldLabelOffset, setWorldLabelScale,
// attachWorldLabel, getWorldLabelScreenPos, destroyWorldLabel,
// clearAllWorldLabels, drawWorldLabels

let errors = [];

export function init() {
   const needed = ['createWorldLabel','updateWorldLabel','setWorldLabelPos',
                   'setWorldLabelColor','setWorldLabelVisible','setWorldLabelOffset',
                   'setWorldLabelScale','attachWorldLabel','getWorldLabelScreenPos',
                   'destroyWorldLabel','clearAllWorldLabels','drawWorldLabels'];
   for (const f of needed)
      if (typeof globalThis[f] !== 'function') errors.push(f + '-missing');
   if (errors.length) return;

   setCamera([0, 0, 10], [0, 0, 0]);

   // createWorldLabel
   const lbl = createWorldLabel('hello', 0, 0, 0, rgba8(255,255,255,255));
   if (lbl <= 0) errors.push('create');

   // updateWorldLabel
   updateWorldLabel(lbl, 'world');

   // setWorldLabelPos
   setWorldLabelPos(lbl, 1, 2, -3);

   // setWorldLabelColor
   setWorldLabelColor(lbl, rgba8(200, 100, 50, 255));

   // setWorldLabelVisible
   setWorldLabelVisible(lbl, false);
   setWorldLabelVisible(lbl, true);

   // setWorldLabelOffset
   setWorldLabelOffset(lbl, 5, -3);

   // setWorldLabelScale
   setWorldLabelScale(lbl, 1.5);

   // getWorldLabelScreenPos — should return [x, y]
   const sp = getWorldLabelScreenPos(lbl);
   if (!Array.isArray(sp) || sp.length < 2) errors.push('screenpos');

   // attachWorldLabel — attach to a mesh
   const m = createSphere(0.5, rgba8(100, 200, 255, 255));
   setPosition(m, 0, 0, 0);
   attachWorldLabel(lbl, m);
   const sp2 = getWorldLabelScreenPos(lbl);
   if (!Array.isArray(sp2) || sp2.length < 2) errors.push('attach-pos');

   // destroyWorldLabel — handle becomes invalid, returns null
   destroyWorldLabel(lbl);
   const sp3 = getWorldLabelScreenPos(lbl);
   if (sp3 !== null) errors.push('destroy');

   // clearAllWorldLabels
   const a = createWorldLabel('a', 0, 0, 0);
   createWorldLabel('b', 1, 0, 0);
   clearAllWorldLabels();
   const sa = getWorldLabelScreenPos(a);
   if (sa !== null) errors.push('clear');
}

export function draw() {
   cls(rgba8(4, 5, 14, 255));
   printBold('786 BATCH 65', 4, 4, rgba8(200, 220, 255, 255));
   if (errors.length) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }
   print('ok', 4, 14, rgba8(80, 255, 120, 255));
   print('world labels', 4, 24, rgba8(200, 200, 255, 200));
}

export function update(dt) {}
