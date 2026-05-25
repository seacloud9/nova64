// Nova64 Game Cart: TEST FONT (RetroArch port)
// Complete ASCII-oriented font smoke test based on examples/test-font.

export function init() {}

export function update() {}

export function draw() {
  cls(rgba8(20, 20, 40, 255));

  print('NOVA64 FONT - COMPLETE TEST', 140, 10, rgba8(255, 200, 0, 255), 1);
  print('UPPERCASE: ABCDEFGHIJKLMNOPQRSTUVWXYZ', 20, 35, rgba8(255, 255, 255, 255), 1);
  print('lowercase: abcdefghijklmnopqrstuvwxyz', 20, 52, rgba8(0, 255, 200, 255), 1);
  print('Numbers:   0123456789', 20, 69, rgba8(255, 255, 100, 255), 1);
  print("Symbols:   !?.,;:'-_()[]{}", 20, 86, rgba8(255, 150, 255, 255), 1);
  print('           <>=+*&%$#@^~`\"|\\\\/', 20, 103, rgba8(255, 150, 255, 255), 1);
  print('Arrows:    <- -> ^ v  <->  up/down', 20, 120, rgba8(100, 255, 100, 255), 1);
  print('Controls:  Z FIRE   X BOOST   ARROWS MOVE', 20, 137, rgba8(200, 200, 255, 255), 1);
  print('Mixed:     Hello World! The Quick Brown Fox', 20, 154, rgba8(255, 200, 150, 255), 1);
  print('           Jumps Over The Lazy Dog 123!', 20, 171, rgba8(255, 200, 150, 255), 1);
  print('Fallback:  Unicode glyphs are sanitized by the font path', 20, 195, rgba8(255, 100, 100, 255), 1);
  print('Game Text:', 20, 219, rgba8(0, 255, 255, 255), 1);
  print('  SCORE: 1234567890', 20, 236, rgba8(255, 255, 0, 255), 1);
  print('  HEALTH: [##########] 100%', 20, 253, rgba8(0, 255, 0, 255), 1);
  print('  Press X to Fire! Press Z for Boost!', 20, 270, rgba8(200, 200, 200, 255), 1);

  rect(20, 295, 600, 50, rgba8(0, 0, 0, 200), true);
  rect(20, 295, 600, 50, rgba8(0, 255, 0, 255), false);
  print('All core ASCII characters render cleanly.', 35, 303, rgba8(0, 255, 100, 255), 1);
  print('Lowercase, punctuation, numbers, and HUD text covered.', 35, 320, rgba8(150, 255, 150, 255), 1);
}
