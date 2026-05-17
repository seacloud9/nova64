// Conformance cart 559: batch 42 combined showcase.

let errors = [];
let osc1, osc2, osc3;
let tt1, tt2;
let mm;
let entities;
let t = 0;
let pulseCount = 0;

export function init() {
   const needed = ['randInt', 'randRange', 'getDeltaTime', 'getFPS',
                   'createMinimap', 'drawMinimap', 'createOscillator', 'tickOscillator',
                   'createTimeTrigger', 'tickTimeTrigger', 'lerpVec2', 'addVec2'];
   for (const f of needed) {
      if (typeof globalThis[f] !== 'function') errors.push(f + '-missing');
   }
   if (errors.length > 0) return;

   osc1 = createOscillator({ speed: 1.5, min: 0, max: 100, waveform: 'sin' });
   osc2 = createOscillator({ speed: 3.0, min: 0, max: 100, waveform: 'cos' });
   osc3 = createOscillator({ speed: 0.8, min: 20, max: 80,  waveform: 'tri' });

   tt1 = createTimeTrigger({ interval: 0.5, repeat: true });
   tt2 = createTimeTrigger({ interval: 1.5, repeat: true });

   mm = createMinimap({ x: 460, y: 180, width: 160, height: 150,
                        worldW: 640, worldH: 360 });
   entities = [];
   for (let i = 0; i < 8; i++) {
      entities.push({
         x: randInt(20, 620),
         y: randInt(20, 340),
         color: rgba8(randInt(100,255), randInt(100,255), randInt(60,200), 255)
      });
   }
}

export function update(dt) {
   if (errors.length > 0) return;
   t += dt;
   tickOscillator(osc1, dt);
   tickOscillator(osc2, dt);
   tickOscillator(osc3, dt);
   if (tickTimeTrigger(tt1, dt)) pulseCount++;
   tickTimeTrigger(tt2, dt);
}

export function draw() {
   cls(rgba8(4, 6, 18, 255));
   printBold('559 BATCH 42', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Three oscillator bars
   const oscColors = [rgba8(80,200,255,220), rgba8(255,100,200,220), rgba8(120,255,100,220)];
   const oscs = [osc1, osc2, osc3];
   for (let i = 0; i < 3; i++) {
      const bw = Math.floor(oscs[i].value * 4);
      rectfill(20, 30 + i * 18, 20 + bw, 44 + i * 18, oscColors[i]);
      print(Math.floor(oscs[i].value) + '%', 428, 32 + i * 18, rgba8(200, 220, 255, 255));
   }

   // FPS display
   print('FPS:' + Math.floor(getFPS()), 20, 90, rgba8(160, 255, 160, 255));
   print('DT:' + Math.floor(getDeltaTime() * 10000) / 10000, 20, 102, rgba8(160, 255, 160, 255));

   // lerpVec2 animated dot
   const pa = {x: 40, y: 150};
   const pb = {x: 440, y: 150};
   const lv = lerpVec2(pa.x, pa.y, pb.x, pb.y, pulse(t, 0.6));
   line(pa.x, pa.y, pb.x, pb.y, rgba8(40, 60, 100, 255));
   rectfill(Math.floor(lv.x)-4, Math.floor(lv.y)-4, Math.floor(lv.x)+4, Math.floor(lv.y)+4,
            rgba8(255, 220, 60, 255));

   // addVec2 chain
   let pos = {x: 20, y: 170};
   for (let i = 0; i < 6; i++) {
      const np = addVec2(pos.x, pos.y, 60 + randInt(-5,5), randInt(-8,8));
      line(Math.floor(pos.x), Math.floor(pos.y), Math.floor(np.x), Math.floor(np.y),
           rgba8(80, 200, 255, 200));
      pos = np;
   }

   // Pulse counter
   print('pulses: ' + pulseCount, 20, 310, rgba8(200, 80, 255, 255));

   // Minimap
   drawMinimap(mm, entities);

   // TWO_PI constant check
   print('2PI~' + Math.floor(TWO_PI * 100) / 100, 466, 340, rgba8(180, 180, 255, 255));

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
