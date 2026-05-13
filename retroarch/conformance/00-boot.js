export function init() {
  print("boot:init")
}

export function update(dt) {
  if (dt <= 0) {
    throw new Error("dt must be positive")
  }
}

export function draw() {
  cls(rgba8(8, 12, 18, 255))
  print("NOVA64 RETROARCH", 12, 12, rgba8(255, 255, 255, 255))
}
