let played = false

export function init() {
  setVolume(0.5)
  sfx({ wave: "sine", freq: 440, dur: 0.08, vol: 0.5 })
  nova64.audio.sfx("coin", { dur: 0.05, vol: 0.25, sweep: 120 })
}

export function update() {
  if (!played) {
    played = true
    nova64.audio.sfx(0, { freq: 660, dur: 0.04, vol: 0.3 })
  }
}

export function draw() {
  cls(rgba8(6, 10, 24, 255))
  print("AUDIO OK", 24, 24, rgba8(160, 220, 255, 255))
}
