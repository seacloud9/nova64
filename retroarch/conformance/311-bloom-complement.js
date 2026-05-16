// Conformance cart 311: screenBloom, colorComplement.

let errors = [];

export function init() {
   if (typeof screenBloom       !== 'function') { errors.push('screenBloom-missing');       return; }
   if (typeof colorComplement   !== 'function') { errors.push('colorComplement-missing');   return; }

   // complement of red should be cyan-ish
   const red  = rgba8(255, 0, 0, 255);
   const comp = colorComplement(red);
   const cr = (comp >>> 24) & 0xFF;
   const cg = (comp >>> 16) & 0xFF;
   const cb = (comp >>>  8) & 0xFF;
   if (cr > 50) errors.push('complement-r-high:' + cr);
   if (cg < 100) errors.push('complement-g-low:' + cg);
}

export function update(dt) {}

export function draw() {
   cls(rgba8(4, 4, 10, 255));
   print('311 BLOOM COMPLEMENT', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Complement color pairs
   const baseColors = [
      rgba8(255, 60, 60, 255), rgba8(60, 180, 60, 255),
      rgba8(60, 60, 255, 255), rgba8(220, 180, 40, 255),
      rgba8(180, 60, 220, 255),
   ];
   for (let i = 0; i < baseColors.length; i++) {
      const xv = 40 + i * 100;
      rectfill(xv, 40, xv + 60, 90, baseColors[i]);
      rectfill(xv, 100, xv + 60, 150, colorComplement(baseColors[i]));
      print('C', xv + 22, 155, rgba8(180, 180, 180, 200));
   }

   // Bloom demo — bright circles on dark bg
   rectfill(20, 180, 300, 340, rgba8(2, 2, 8, 255));
   circfill(80,  260, 20, rgba8(255, 60, 60, 255));
   circfill(150, 260, 20, rgba8(60, 255, 60, 255));
   circfill(220, 260, 20, rgba8(60, 60, 255, 255));
   setClip(20, 180, 280, 160);
   screenBloom(5, 0.6, 0.7);
   clearClip();

   // Non-bloomed reference on right
   rectfill(320, 180, 600, 340, rgba8(2, 2, 8, 255));
   circfill(380, 260, 20, rgba8(255, 60, 60, 255));
   circfill(450, 260, 20, rgba8(60, 255, 60, 255));
   circfill(520, 260, 20, rgba8(60, 60, 255, 255));
   print('no bloom', 330, 185, rgba8(120, 120, 120, 200));
   print('bloom', 30, 185, rgba8(120, 120, 120, 200));

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
