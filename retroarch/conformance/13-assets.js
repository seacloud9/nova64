let ok = false
let message = "assets:init"

export function init() {
  const text = nova64.assets.readText("assets/message.txt", "")
  const data = nova64.assets.readJSON("data/config.json", {})
  const bytes = nova64.assets.readBytes("bin/blob.bin")
  const listed = nova64.assets.list()

  ok =
    nova64.assets.has("assets/message.txt") &&
    assetHas("data/config.json") &&
    text.trim() === "hello assets" &&
    data &&
    data.answer === 64 &&
    bytes &&
    bytes.byteLength === 4 &&
    assetSize("bin/blob.bin") === 4 &&
    listed.length === 3 &&
    readAssetText("missing.txt", "fallback") === "fallback"
  message = ok ? "ASSETS OK" : "ASSETS FAIL"
}

export function update() {}

export function draw() {
  cls(ok ? rgba8(12, 18, 36, 255) : rgba8(42, 4, 4, 255))
  print(message, 24, 24, ok ? rgba8(180, 230, 255, 255) : rgba8(255, 120, 120, 255))
}
