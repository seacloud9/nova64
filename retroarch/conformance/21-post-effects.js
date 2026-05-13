// Conformance cart 21: extended post-processing effects
// Verifies bloom, chromatic, setColorGrade, setPosterize state round-trips.
// In software/headless mode the FBO is absent but state must hold correctly.

let cube;
let sphere;
let t = 0;

export function init() {
   cube = createCube(1, rgba8(255, 80, 40, 255), [1.2, 0, -3]);
   sphere = createSphere(0.7, rgba8(60, 200, 255, 255), [-1.2, 0, -3]);
   setAmbientLight(rgba8(30, 20, 40, 255), 1.0);
   setLightDirection(-0.5, -1, -0.8);

   // Bloom
   nova64.post.setBloom(0.7);
   // Chromatic aberration
   nova64.post.setChromatic(0.006);
   // Color grade: warm tint (boost red/green, reduce blue)
   nova64.post.setColorGrade(1.3, 1.1, 0.7);
   // Posterize
   nova64.post.setPosterize(5);

   const s = nova64.post.getState();
   if (Math.abs(s.bloom - 0.7) > 0.01) throw new Error('bloom mismatch: ' + s.bloom);
   if (Math.abs(s.chromatic - 0.006) > 0.0005) throw new Error('chromatic mismatch: ' + s.chromatic);
   if (Math.abs(s.colorGrade[0] - 1.3) > 0.01) throw new Error('grade[0] mismatch');
   if (Math.abs(s.colorGrade[1] - 1.1) > 0.01) throw new Error('grade[1] mismatch');
   if (Math.abs(s.colorGrade[2] - 0.7) > 0.01) throw new Error('grade[2] mismatch');
   if (s.posterize !== 5) throw new Error('posterize mismatch: ' + s.posterize);
   if (!s.active) throw new Error('active expected true');

   // Round-trip clear then re-enable for visual frame
   nova64.post.clear();
   const s2 = nova64.post.getState();
   if (s2.bloom !== 0) throw new Error('bloom should be 0 after clear');
   if (s2.posterize !== 0) throw new Error('posterize should be 0 after clear');
   if (s2.colorGrade[0] !== 1 || s2.colorGrade[1] !== 1 || s2.colorGrade[2] !== 1)
      throw new Error('colorGrade should be [1,1,1] after clear');

   // Re-enable combined effects for the visual frame
   nova64.post.setBloom(0.5);
   nova64.post.setChromatic(0.005);
   nova64.post.setColorGrade(1.2, 1.0, 0.8);
   nova64.post.setPosterize(6);
   nova64.post.setVignette(0.4);
}

export function update(dt) {
   t += dt;
   rotateMesh(cube, 0, dt * 0.8, 0);
   rotateMesh(sphere, dt * 0.5, 0, dt * 0.3);
}

export function draw() {
   cls(rgba8(8, 10, 20, 255));
   const s = nova64.post.getState();
   print('21 POST-FX', 4, 4, rgba8(255, 220, 80, 255));
   print('bloom=' + s.bloom.toFixed(2), 4, 14, rgba8(255, 160, 100, 255));
   print('chroma=' + s.chromatic.toFixed(3), 4, 24, rgba8(160, 220, 255, 255));
   print('grade=' + s.colorGrade.map(v => v.toFixed(1)).join(','), 4, 34, rgba8(200, 255, 160, 255));
   print('poster=' + s.posterize, 4, 44, rgba8(200, 160, 255, 255));
   print('fbo=' + s.fboReady, 4, 54, rgba8(180, 180, 180, 255));
}
