// Conformance cart 801: inventory — createInventory, setSlot, getSlotColor, getSlotCount,
//   clearSlot, drawInventory, setInventorySelected, destroyInventory

let inv = 0;

// Slot color palette (items)
const SWORD  = rgba8(200, 80,  80,  255);
const SHIELD = rgba8(80,  100, 200, 255);
const POTION = rgba8(80,  200, 80,  255);
const KEY    = rgba8(230, 200, 60,  255);
const BOW    = rgba8(160, 100, 50,  255);
const ARROW  = rgba8(140, 80,  40,  255);
const STAFF  = rgba8(140, 60,  200, 255);
const GEM    = rgba8(80,  220, 220, 255);

export function init() {
   inv = createInventory(4, 4, 40, 40, 220, 120);
   setSlot(inv, 0, 0, SWORD,  1);
   setSlot(inv, 1, 0, SHIELD, 1);
   setSlot(inv, 2, 0, BOW,    1);
   setSlot(inv, 3, 0, ARROW,  24);
   setSlot(inv, 0, 1, POTION, 3);
   setSlot(inv, 1, 1, POTION, 1);
   setSlot(inv, 2, 1, KEY,    2);
   setSlot(inv, 0, 2, STAFF,  1);
   setSlot(inv, 3, 2, GEM,    5);
   setInventorySelected(inv, 0, 0);
}

export function draw() {
   cls(rgba8(18, 22, 40, 255));

   // Panel background
   rectfill(200, 100, 220, 220, rgba8(14, 16, 28, 220));
   print('INVENTORY', 224, 108, rgba8(200, 220, 255, 200));

   drawInventory(inv);

   const swordColor = getSlotColor(inv, 0, 0);
   const arrowCnt   = getSlotCount(inv, 3, 0);

   printBold('801 INVENTORY', 4, 4, rgba8(200, 220, 255, 255));
   print('sword col:' + swordColor, 4, 14, rgba8(80, 255, 120, 200));
   print('arrows:' + arrowCnt, 4, 24, rgba8(80, 255, 120, 200));
}
