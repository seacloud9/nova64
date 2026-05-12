let frame = 0

export function init() {
  print("errors:init")
}

export function update() {
  frame += 1
  if (frame === 2) {
    throw new Error("controlled update exception")
  }
}

export function draw() {
  cls(rgba8(16, 0, 0, 255))
  print("ERROR CART", 16, 16, rgba8(255, 160, 160, 255))
}
