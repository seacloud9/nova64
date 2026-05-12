let held = false
let pressed = false

export function init() {}

export function update() {
  held = btn("z")
  pressed = btnp("z")
}

export function draw() {
  cls(rgba8(0, 0, 0, 255))
  print(held ? "Z HELD" : "Z UP", 24, 32, held ? rgba8(80, 255, 120, 255) : rgba8(255, 255, 255, 255))
  print(pressed ? "Z EDGE" : "NO EDGE", 24, 48, pressed ? rgba8(255, 220, 80, 255) : rgba8(128, 128, 128, 255))
}
