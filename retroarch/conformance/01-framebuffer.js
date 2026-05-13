export function init() {}

export function update() {}

export function draw() {
  cls(rgba8(2, 6, 12, 255))
  rect(24, 24, 128, 72, rgba8(230, 64, 48, 255), true)
  rect(184, 36, 96, 96, rgba8(64, 210, 120, 255), false)
  line(0, 0, 639, 359, rgba8(255, 240, 128, 255))
  line(639, 0, 0, 359, rgba8(80, 180, 255, 255))
  pset(320, 180, rgba8(255, 255, 255, 255))
  print("FRAMEBUFFER", 12, 336, rgba8(255, 255, 255, 255))
}
