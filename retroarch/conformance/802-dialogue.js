// Conformance cart 802: dialogue — createDialogue, setDialogueSpeaker, setDialogueText,
//   advanceDialogue, isDialogueDone, updateDialogue, drawDialogue, destroyDialogue

let dlg = 0;

export function init() {
   dlg = createDialogue(
      'Greetings, traveler. The ancient ruins await beyond the northern gate. Beware the stone golems.',
      20, 260, 600, 70, 40
   );
   setDialogueSpeaker(dlg, 'OLD SAGE');
}

export function draw() {
   cls(rgba8(18, 22, 40, 255));

   // Background scene
   rectfill(0, 0, 640, 200, rgba8(20, 40, 80, 255));
   rectfill(0, 200, 640, 60, rgba8(50, 80, 50, 255));
   rectfill(0, 260, 640, 100, rgba8(10, 12, 22, 255));

   // Character silhouette
   rectfill(80, 140, 30, 60, rgba8(30, 30, 50, 255));

   const done = isDialogueDone(dlg);
   drawDialogue(dlg);

   printBold('802 DIALOGUE', 4, 4, rgba8(200, 220, 255, 255));
   print('done:' + done, 4, 14, rgba8(80, 255, 120, 200));
}
