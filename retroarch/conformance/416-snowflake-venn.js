// Conformance cart 416: drawSnowflake, fillSnowflake, drawVenn, drawParabola.

let errors = [];

export function init() {
   if (typeof drawSnowflake !== 'function') { errors.push('drawSnowflake-missing'); return; }
   if (typeof fillSnowflake !== 'function') { errors.push('fillSnowflake-missing'); return; }
   if (typeof drawVenn      !== 'function') { errors.push('drawVenn-missing');      return; }
   if (typeof drawParabola  !== 'function') { errors.push('drawParabola-missing');  return; }
}

export function update(dt) {}

export function draw() {
   cls(rgba8(6, 8, 20, 255));
   print('416 SNOWFLAKE VENN PARABOLA', 4, 4, rgba8(200, 220, 255, 255));

   if (errors.length > 0) {
      print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
      print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
      return;
   }

   // Snowflakes
   drawSnowflake(120, 160, 80, 6, rgba8(180, 220, 255, 255));
   fillSnowflake(300, 160, 70, 6, rgba8(100, 180, 255, 200));
   drawSnowflake(470, 160, 60, 8, rgba8(220, 200, 255, 220));

   // Venn diagram
   drawVenn(160, 310, 65, 0.4, rgba8(255, 100, 100, 220), rgba8(100, 100, 255, 220));

   // Parabolas
   drawParabola(300, 250, 250, 100, rgba8(100, 220, 100, 255));
   drawParabola(300, 270, 200, 60, rgba8(255, 200, 60, 200));

   print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
