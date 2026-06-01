// Conformance cart 1096: nova64.fx.enableRetroEffects applies bloom options.

let errors = [];
let state = null;

function near(value, expected, eps = 0.01) {
  return Math.abs(value - expected) <= eps;
}

export function init() {
  if (!nova64.fx || typeof nova64.fx.enableRetroEffects !== 'function') {
    errors.push('enableRetroEffects-missing');
    return;
  }
  if (!nova64.post || typeof nova64.post.getState !== 'function') {
    errors.push('post-state-missing');
    return;
  }

  nova64.post.clear();
  nova64.fx.enableRetroEffects({ bloom: false });
  const off = nova64.post.getState();
  if (!near(off.bloom, 0.0)) errors.push('bloom-false:' + off.bloom);

  nova64.post.clear();
  const ok = nova64.fx.enableRetroEffects({
    bloom: { strength: 1.2, radius: 0.5, threshold: 0.2 },
    vignette: false,
    fxaa: false,
    dithering: false,
  });
  if (ok !== true) errors.push('return-not-true');

  state = nova64.post.getState();
  if (!near(state.bloom, 1.2)) errors.push('bloom:' + state.bloom);
  if (!near(state.bloomRadius, 0.5)) errors.push('radius:' + state.bloomRadius);
  if (!near(state.bloomThreshold, 0.2)) errors.push('threshold:' + state.bloomThreshold);
  if (state.bloomStyle !== 'three') errors.push('style:' + state.bloomStyle);
  if (state.sharpStyle !== 'cas') errors.push('sharp-style:' + state.sharpStyle);
  if (state.hdrMode !== '32f') errors.push('hdr:' + state.hdrMode);
}

export function update(dt) {}

export function draw() {
  cls(rgba8(5, 4, 10, 255));
  print('1096 RETRO EFFECTS BLOOM', 4, 4, rgba8(225, 230, 255, 255));

  if (errors.length > 0) {
    print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
    print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
    return;
  }

  print('bloom=' + state.bloom.toFixed(2), 4, 14, rgba8(255, 190, 95, 255));
  print('radius=' + state.bloomRadius.toFixed(2), 4, 24, rgba8(120, 220, 255, 255));
  print('threshold=' + state.bloomThreshold.toFixed(2), 4, 34, rgba8(160, 255, 150, 255));
  print('style=' + state.bloomStyle + ' sharp=' + state.sharpStyle, 4, 44, rgba8(200, 185, 255, 255));
}
