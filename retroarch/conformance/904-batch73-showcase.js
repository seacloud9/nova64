// Conformance cart 904: Batch 73 showcase — radial arc gauges.

let t = 0;

// Six gauges: health, energy, heat, shield, ammo, xp
const CONFIGS = [
   { cx: 110, cy: 130, r: 72, w: 12, label: 'HP',     fg: [200, 50,  50 ],  speed: 0.3  },
   { cx: 290, cy: 130, r: 72, w: 12, label: 'EN',     fg: [50,  180, 240],  speed: 0.5  },
   { cx: 470, cy: 130, r: 72, w: 12, label: 'HEAT',   fg: [240, 140, 40 ],  speed: 0.7  },
   { cx: 150, cy: 280, r: 55, w: 10, label: 'SHIELD', fg: [80,  100, 255],  speed: 0.4  },
   { cx: 320, cy: 290, r: 55, w: 10, label: 'AMMO',   fg: [200, 200, 60 ],  speed: 0.9  },
   { cx: 490, cy: 280, r: 55, w: 10, label: 'XP',     fg: [140, 60,  220],  speed: 0.6  },
];
const BG_COL = rgba8(24, 26, 40, 255);
let gauges = [];

export function init() {
   for (let i = 0; i < CONFIGS.length; i++) {
      const c = CONFIGS[i];
      const h = createGauge(c.cx, c.cy, c.r, c.w);
      setGaugeColors(h, BG_COL, rgba8(c.fg[0], c.fg[1], c.fg[2], 255));
      setGaugeValue(h, 0, 1.0);
      gauges.push(h);
   }
}

export function update(dt) {
   t += dt;
}

export function draw() {
   cls(rgba8(4, 5, 14, 255));

   for (let i = 0; i < CONFIGS.length; i++) {
      const c = CONFIGS[i];
      // Oscillate each gauge at its own speed
      const val = Math.sin(t * c.speed) * 0.5 + 0.5;
      setGaugeValue(gauges[i], val, 1.0);
      drawGauge(gauges[i]);
      const pct = Math.round(val * 100);
      print(c.label, c.cx - 8, c.cy - 8, rgba8(255, 255, 255, 220));
      print(pct + '%', c.cx - 10, c.cy + 2, rgba8(180, 200, 255, 180));
   }

   printBold('904 BATCH 73', 4, 4, rgba8(200, 220, 255, 255));
   print('radial gauges', 4, 14, rgba8(80, 255, 120, 255));
}
