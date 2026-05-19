// GLES regression: cls() clear color must drive the hardware scene clear.

export function init() {}
export function update(dt) {}

export function draw() {
   cls(rgba8(20, 180, 60, 255));
}
