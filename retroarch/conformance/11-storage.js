let ok = false
let message = "storage:init"

export function init() {
  deleteData("slot")
  const missing = loadData("slot", { score: 3, name: "fallback" })
  const saved = nova64.storage.saveData("slot", {
    score: 64,
    name: "nova",
    nested: { lives: 3 },
  })
  const loaded = nova64.storage.loadData("slot", null)
  const removed = nova64.storage.remove("slot")
  const afterRemove = nova64.storage.loadJSON("slot", { score: 9 })
  const aliasSaved = saveJSON("alias", { enabled: true })
  const aliasLoaded = loadJSON("alias", null)
  const aliasRemoved = remove("alias")

  ok =
    missing.score === 3 &&
    missing.name === "fallback" &&
    saved === true &&
    loaded &&
    loaded.score === 64 &&
    loaded.name === "nova" &&
    loaded.nested &&
    loaded.nested.lives === 3 &&
    removed === true &&
    afterRemove.score === 9 &&
    aliasSaved === true &&
    aliasLoaded &&
    aliasLoaded.enabled === true &&
    aliasRemoved === true
  message = ok ? "STORAGE OK" : "STORAGE FAIL"
}

export function update() {}

export function draw() {
  cls(ok ? rgba8(4, 28, 16, 255) : rgba8(36, 0, 0, 255))
  print(message, 24, 24, ok ? rgba8(120, 255, 160, 255) : rgba8(255, 120, 120, 255))
}
