/*
 * 291-overlay-autoclear: regression test for the auto-clearing of the
 * 2D HUD overlay between frames. Web nova64 auto-clears the canvas
 * before each draw() call, so carts ported from the browser
 * (f-zero-nova-3d, minecraft-demo, wad-demo) only repaint the pixels
 * they care about. If the RA core forgets to auto-clear, stale pixels
 * from the previous draw() persist — the visible symptom is that the
 * F-Zero title-screen vignette stayed glued under the gameplay HUD
 * after the player pressed start.
 *
 * This cart paints a full-screen distinctive colour on frame 0, then a
 * single small rectangle on every later frame. With auto-clear on
 * (the post-fix default), frame 5 shows only the small rectangle on
 * a transparent / black background. With auto-clear off the frame-0
 * fill bleeds through forever.
 */

let frame = 0;

export function init() {}

export function update() {
  frame++;
}

export function draw() {
  if (frame === 1) {
    // First-frame full-screen fill — simulates a title-screen vignette.
    rectfill(0, 0, 640, 360, rgba8(180, 30, 200, 255));
    return;
  }
  // Later frames: small marker only. With auto-clear ON, the surrounding
  // canvas is transparent (clear-color). With auto-clear OFF the magenta
  // fill from frame 1 stays under everything.
  rectfill(280, 160, 80, 40, rgba8(0, 220, 120, 255));
}
