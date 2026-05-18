// Conformance cart 970: Batch 79 showcase — 2D inventory grid.
// Shows an RPG-style equipment screen with two inventories: equipment slots and bag.

let equip = 0;
let bag   = 0;
let t     = 0;
let blinkTimer = 0;
let blinkSlot  = 0;

// Item colors
const NONE   = rgba8(0, 0, 0, 0);
const SWORD  = rgba8(200, 80,  80,  255);
const SHIELD = rgba8(80,  100, 200, 255);
const HELM   = rgba8(160, 140, 80,  255);
const ARMOR  = rgba8(100, 120, 160, 255);
const BOOTS  = rgba8(120, 90,  60,  255);
const RING   = rgba8(220, 180, 60,  255);
const POTION = rgba8(80,  200, 80,  255);
const BOMB   = rgba8(220, 100, 40,  255);
const ARROW  = rgba8(140, 80,  40,  255);
const SCROLL = rgba8(200, 200, 140, 255);
const GEM    = rgba8(80,  220, 220, 255);
const STAFF  = rgba8(140, 60,  200, 255);
const BOW    = rgba8(160, 100, 50,  255);
const KEY    = rgba8(230, 200, 60,  255);

export function init() {
   // Equipment: 2 cols × 4 rows
   equip = createInventory(2, 4, 44, 44, 40, 110);
   setSlot(equip, 0, 0, HELM,   1);
   setSlot(equip, 0, 1, ARMOR,  1);
   setSlot(equip, 0, 2, BOOTS,  1);
   setSlot(equip, 0, 3, RING,   2);
   setSlot(equip, 1, 0, SWORD,  1);
   setSlot(equip, 1, 1, SHIELD, 1);
   setInventorySelected(equip, 1, 0);

   // Bag: 5 cols × 4 rows
   bag = createInventory(5, 4, 36, 36, 200, 110);
   setSlot(bag, 0, 0, POTION, 5);
   setSlot(bag, 1, 0, BOMB,   3);
   setSlot(bag, 2, 0, ARROW,  40);
   setSlot(bag, 3, 0, SCROLL, 2);
   setSlot(bag, 0, 1, GEM,    7);
   setSlot(bag, 1, 1, STAFF,  1);
   setSlot(bag, 2, 1, BOW,    1);
   setSlot(bag, 3, 1, KEY,    3);
   setSlot(bag, 4, 1, POTION, 2);
   setSlot(bag, 0, 2, RING,   1);
}

export function update(dt) {
   t += dt;
   blinkTimer += dt;
   if (blinkTimer >= 0.5) {
      blinkTimer = 0;
      blinkSlot  = (blinkSlot + 1) % 5;
      setInventorySelected(bag, blinkSlot % 5, 1);
   }
}

export function draw() {
   cls(rgba8(8, 10, 22, 255));

   // Panel
   rectfill(20, 90, 420, 220, rgba8(12, 14, 26, 230));
   rectfill(20, 90, 420, 1, rgba8(80, 100, 180, 200));
   rectfill(20, 310, 420, 1, rgba8(80, 100, 180, 200));

   // Character silhouette
   rectfill(155, 100, 30, 60, rgba8(50, 55, 80, 200));
   rectfill(160, 90,  20, 12, rgba8(60, 65, 90, 200));

   // Labels
   print('EQUIP',  44,  100, rgba8(180, 200, 255, 160));
   print('BAG',   210,  100, rgba8(180, 200, 255, 160));

   drawInventory(equip);
   drawInventory(bag);

   // Stats panel
   rectfill(460, 90, 160, 220, rgba8(12, 14, 26, 200));
   rectfill(460, 90, 160, 1, rgba8(80, 100, 180, 200));
   print('STATS', 476, 98, rgba8(200, 220, 255, 180));
   print('ATK  42', 468, 114, rgba8(200, 100, 100, 200));
   print('DEF  28', 468, 126, rgba8(100, 140, 200, 200));
   print('HP  100', 468, 138, rgba8(80, 200, 80, 200));
   print('MP   60', 468, 150, rgba8(100, 80, 200, 200));

   printBold('970 BATCH 79', 4, 4, rgba8(200, 220, 255, 255));
   print('inventory grid', 4, 14, rgba8(80, 255, 120, 200));
}
