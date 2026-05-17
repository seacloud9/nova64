// Conformance cart 816: Batch 65 showcase — world labels.

let t = 0;
let orbs = [];
let lbls = [];
const N = 6;
const NAMES = ['ALPHA','BETA','GAMMA','DELTA','EPSILON','ZETA'];

export function init() {
   setCamera([0, 4, 12], [0, 0, 0]);
   setLightDirection(0.8, 1.5, 1);
   for (let i = 0; i < N; i++) {
      const angle = (i / N) * Math.PI * 2;
      const m = createSphere(0.55, hslColor(Math.floor((i/N)*360), 0.8, 0.6, 255));
      setPosition(m, Math.cos(angle)*3.5, 0, Math.sin(angle)*3.5-2);
      orbs.push(m);
      const lbl = createWorldLabel(NAMES[i], 0, 0, 0,
                                   hslColor(Math.floor((i/N)*360), 0.6, 0.9, 220));
      setWorldLabelOffset(lbl, 0, -14);
      attachWorldLabel(lbl, m);
      lbls.push(lbl);
   }
}

export function update(dt) {
   t += dt;
   for (let i = 0; i < N; i++) {
      const angle = (i / N) * Math.PI * 2 + t * 0.4;
      setPosition(orbs[i],
         Math.cos(angle)*3.5,
         Math.sin(t*0.7 + i*1.1)*0.4,
         Math.sin(angle)*3.5 - 2);
      // pulse label visibility
      setWorldLabelVisible(lbls[i], Math.sin(t*1.5 + i*0.8) > -0.7);
   }
}

export function draw() {
   cls(rgba8(4, 5, 14, 255));
   printBold('816 BATCH 65', 4, 4, rgba8(200, 220, 255, 255));
   print('world labels', 4, 14, rgba8(80, 255, 120, 255));
   drawWorldLabels();
}
