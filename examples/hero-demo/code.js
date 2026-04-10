// ── Nova64 Hero Demo Cart ──
// Outrun synthwave: neon grid floor, displaced terrain hills, sun, clouds, particles

// ── Shared GLSL noise lib (3-octave FBM) ──
const noiseLib = `
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){
  vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);
}
float fbm3(vec2 p){float v=0.0,a=0.5;for(int i=0;i<3;i++){v+=a*noise(p);p*=2.0;a*=0.5;}return v;}
`;

// ── GLSL Shaders ──

// Neon perspective grid — never-ending scrolling floor
const gridFloorFrag = `
uniform float uTime;
varying vec2 vUv;
void main(){
  vec2 origUv = vUv;
  vec2 uv = vUv;
  uv.y += uTime * 0.08;
  // Grid lines on scrolled UV (fract makes it tile forever)
  vec2 g = abs(fract(uv * vec2(24.0, 60.0)) - 0.5);
  float lineX = 1.0 - smoothstep(0.0, 0.035, g.x);
  float lineY = 1.0 - smoothstep(0.0, 0.025, g.y);
  float grid = max(lineX, lineY);
  // Color: cyan center → magenta edges
  float cx = abs(origUv.x - 0.5) * 2.0;
  vec3 col = mix(vec3(0.0, 1.0, 0.9), vec3(1.0, 0.0, 0.6), cx * cx);
  // Depth fade on ORIGINAL UV (never changes, so never disappears)
  float depth = smoothstep(0.0, 0.08, origUv.y) * smoothstep(1.0, 0.25, origUv.y);
  // Horizon glow
  float hglow = exp(-(1.0 - origUv.y) * 3.5) * 0.5;
  vec3 hcol = vec3(1.0, 0.2, 0.5) * hglow;
  float pulse = sin(uTime * 1.2) * 0.1 + 0.9;
  gl_FragColor = vec4((col * grid * 1.8 * pulse + hcol) * depth, (grid * 0.85 + hglow) * depth);
}`;

// Terrain vertex shader — displaces Y with FBM noise for rolling hills
const terrainVert =
  `
uniform float uTime;
varying vec2 vUv;
varying float vHeight;
` +
  noiseLib +
  `
void main(){
  vUv = uv;
  vec3 pos = position;
  // Compute world-ish UV for noise (scroll over time)
  vec2 nUv = uv;
  nUv.y += uTime * 0.04;
  float h = fbm3(nUv * vec2(3.0, 6.0));
  // Scale height — taller near UV center, fades at edges
  float edgeFade = smoothstep(0.0, 0.15, uv.x) * smoothstep(1.0, 0.85, uv.x);
  edgeFade *= smoothstep(0.0, 0.1, uv.y) * smoothstep(1.0, 0.7, uv.y);
  pos.z += h * 12.0 * edgeFade;
  vHeight = h;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}`;

const terrainFrag =
  `
uniform float uTime;
varying vec2 vUv;
varying float vHeight;
` +
  noiseLib +
  `
void main(){
  vec2 origUv = vUv;
  vec2 uv = vUv;
  uv.y += uTime * 0.04;
  float n = fbm3(uv * vec2(6.0, 12.0));
  // Color ramp from deep blue-purple → hot pink based on height + noise
  vec3 col;
  float h = vHeight;
  if(h < 0.3) col = mix(vec3(0.01, 0.0, 0.08), vec3(0.1, 0.0, 0.35), h / 0.3);
  else if(h < 0.55) col = mix(vec3(0.1, 0.0, 0.35), vec3(0.5, 0.0, 0.6), (h - 0.3) / 0.25);
  else col = mix(vec3(0.5, 0.0, 0.6), vec3(1.0, 0.35, 0.75), (h - 0.55) / 0.45);
  // Wireframe grid overlay
  vec2 g = abs(fract(uv * vec2(12.0, 30.0)) - 0.5);
  float wire = 1.0 - smoothstep(0.0, 0.04, min(g.x, g.y));
  col += vec3(0.0, 0.7, 1.0) * wire * 0.22;
  // Ridge glow on peaks
  float ridge = smoothstep(0.6, 0.8, h);
  col += vec3(0.0, 1.0, 0.8) * ridge * 0.4 * (sin(uTime * 1.5) * 0.2 + 0.8);
  // Fade on ORIGINAL UV — never disappears
  float fade = smoothstep(0.0, 0.12, origUv.y) * smoothstep(1.0, 0.55, origUv.y);
  fade *= smoothstep(0.0, 0.08, origUv.x) * smoothstep(1.0, 0.92, origUv.x);
  gl_FragColor = vec4(col, fade * 0.85);
}`;

const cloudFrag =
  `
uniform float uTime;
varying vec2 vUv;
` +
  noiseLib +
  `
void main(){
  vec2 uv = vUv;
  uv.x += uTime * 0.02;
  float c = fbm3(uv * vec2(4.0, 2.5));
  float alpha = smoothstep(0.3, 0.6, c);
  float r = sin(uv.x * 3.5 + uTime * 0.4) * 0.5 + 0.5;
  float g = sin(uv.x * 3.5 + uTime * 0.4 + 2.094) * 0.5 + 0.5;
  float b = sin(uv.x * 3.5 + uTime * 0.4 + 4.189) * 0.5 + 0.5;
  vec3 rainbow = vec3(r, g, b);
  float edge = smoothstep(0.3, 0.4, c) - smoothstep(0.5, 0.6, c);
  vec3 color = mix(rainbow * 0.5, vec3(0.0, 1.0, 0.9), edge * 0.55);
  color += vec3(0.0, 0.8, 1.0) * edge * 0.4;
  float ef = smoothstep(0.0, 0.15, vUv.x) * smoothstep(1.0, 0.85, vUv.x);
  ef *= smoothstep(0.0, 0.1, vUv.y) * smoothstep(1.0, 0.9, vUv.y);
  gl_FragColor = vec4(color * 1.2, alpha * ef * 0.5);
}`;

const coronaFrag = `
uniform float uTime;
varying vec2 vUv;
void main(){
  vec2 c = vUv - 0.5;
  float d = length(c);
  float glow = exp(-d * 3.5) * 0.35;
  float pulse = sin(uTime * 0.4) * 0.12 + 0.88;
  float angle = atan(c.y, c.x);
  float rays = pow(abs(sin(angle * 8.0 + uTime * 0.3)), 12.0) * 0.15;
  vec3 warm = mix(vec3(1.0, 0.25, 0.0), vec3(1.0, 0.0, 0.55), sin(uTime * 0.15) * 0.5 + 0.5);
  float total = (glow + rays * (1.0 - d * 1.5)) * pulse;
  gl_FragColor = vec4(warm * total, total * 0.12);
}`;

// ── Helper: swap geometry on a mesh to add subdivisions ──
function subdivPlane(mesh, w, h, segsX, segsY) {
  if (!mesh) return;
  mesh.geometry.dispose();
  mesh.geometry = new THREE.PlaneGeometry(w, h, segsX, segsY);
}

// ── State ──
let t = 0;

export function init() {
  // Camera
  setCameraPosition(0, 3.5, 12);
  setCameraTarget(0, 1.0, -80);
  setCameraFOV(62);

  // Atmosphere
  setFog(0x020010, 8, 160);
  setAmbientLight(0x0c0030);
  createPointLight(0xff0080, 3.5, 180, [0, 12, -60]);
  createPointLight(0xff5500, 2.0, 200, [0, 30, -120]);

  // Post-processing
  enableBloom(1.4, 0.35, 0.5);
  enableVignette(1.1, 0.75);

  // ── SUN ── (3 layered spheres)
  const sunCoreMesh = getMesh(createSphere(40, 0xffffff, [0, 28, -165]));
  if (sunCoreMesh)
    sunCoreMesh.material = createTSLMaterial('rainbow', { speed: 0.3, opacity: 1.0 });

  const sunGlowMesh = getMesh(createSphere(60, 0xffffff, [0, 28, -168]));
  if (sunGlowMesh) sunGlowMesh.material = createTSLMaterial('plasma', { speed: 0.2, opacity: 0.3 });

  const sunCoronaMesh = getMesh(createSphere(85, 0xffffff, [0, 28, -170]));
  if (sunCoronaMesh)
    sunCoronaMesh.material = createTSLShaderMaterial(
      null,
      coronaFrag,
      {},
      { transparent: true, depthWrite: false }
    );

  // ── NEON GRID FLOOR ── (large plane, shader handles infinite scroll)
  const floorMesh = getMesh(createPlane(300, 350, 0x000011, [0, -0.1, -120]));
  if (floorMesh) {
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.material = createTSLShaderMaterial(null, gridFloorFrag, {}, { transparent: true });
  }

  // ── TERRAIN ── (displaced hills flanking the road — need subdivisions for vertex displacement)
  const tMat = createTSLShaderMaterial(terrainVert, terrainFrag, {}, { transparent: true });
  for (const xOff of [-70, 70]) {
    const m = getMesh(createPlane(100, 280, 0x110033, [xOff, 0.1, -90]));
    if (m) {
      // Swap to subdivided geometry (64x128 segments for smooth rolling hills)
      subdivPlane(m, 100, 280, 64, 128);
      m.rotation.x = -Math.PI / 2;
      m.material = tMat;
    }
  }

  // ── ROAD RAILS ── (glowing neon strips)
  const railMat = createTSLMaterial('plasma', { speed: 1.5, opacity: 0.85 });
  for (const xOff of [-16, 16]) {
    const m = getMesh(createPlane(0.35, 200, 0xff0066, [xOff, 0.08, -80]));
    if (m) {
      m.rotation.x = -Math.PI / 2;
      m.material = railMat;
    }
  }

  // ── CLOUDS ── (shared material)
  const cMat = createTSLShaderMaterial(
    null,
    cloudFrag,
    {},
    { transparent: true, depthWrite: false }
  );
  const cloudPos = [
    [-45, 20, -85],
    [40, 24, -110],
    [-30, 17, -65],
    [55, 22, -130],
    [-60, 27, -150],
  ];
  for (const pos of cloudPos) {
    const m = getMesh(createPlane(60, 20, 0xffffff, pos));
    if (m) m.material = cMat;
  }

  // ── PARTICLES — Stars ──
  createParticleSystem(400, {
    emitterX: 0,
    emitterY: 40,
    emitterZ: -80,
    emitRate: 8,
    minLife: 12,
    maxLife: 24,
    minSpeed: 0.02,
    maxSpeed: 0.15,
    spread: Math.PI,
    minSize: 0.015,
    maxSize: 0.06,
    startColor: 0xffffff,
    endColor: 0xaaaaff,
    emissive: 0xffffff,
    emissiveIntensity: 2.5,
    gravity: 0,
    blending: 'additive',
  });

  // ── PARTICLES — Road sparkles ──
  createParticleSystem(250, {
    emitterX: 0,
    emitterY: 0.5,
    emitterZ: -20,
    emitRate: 18,
    minLife: 1.5,
    maxLife: 4,
    minSpeed: 0.6,
    maxSpeed: 2.0,
    spread: Math.PI * 0.6,
    minSize: 0.025,
    maxSize: 0.09,
    startColor: 0xff00aa,
    endColor: 0x0088ff,
    emissive: 0xff44cc,
    emissiveIntensity: 3,
    gravity: -0.2,
    blending: 'additive',
    turbulence: 1.2,
    turbulenceScale: 0.5,
  });

  // ── PARTICLES — Horizon glow motes ──
  createParticleSystem(200, {
    emitterX: 0,
    emitterY: 6,
    emitterZ: -100,
    emitRate: 10,
    minLife: 4,
    maxLife: 10,
    minSpeed: 0.15,
    maxSpeed: 0.6,
    spread: Math.PI * 0.4,
    minSize: 0.03,
    maxSize: 0.12,
    startColor: 0xff6622,
    endColor: 0xff0088,
    emissive: 0xff4400,
    emissiveIntensity: 2,
    gravity: -0.08,
    blending: 'additive',
  });

  // ── PARTICLES — Side streaks ──
  for (const xOff of [-30, 30]) {
    createParticleSystem(120, {
      emitterX: xOff,
      emitterY: 1.5,
      emitterZ: -40,
      emitRate: 6,
      minLife: 0.6,
      maxLife: 1.8,
      minSpeed: 8,
      maxSpeed: 16,
      spread: Math.PI * 0.05,
      minSize: 0.01,
      maxSize: 0.04,
      startColor: 0x00ffdd,
      endColor: 0x0044ff,
      emissive: 0x00ffcc,
      emissiveIntensity: 4,
      gravity: 0,
      blending: 'additive',
    });
  }
}

export function update(dt) {
  t += dt;
  const cx = Math.sin(t * 0.22) * 2.0;
  const cy = 3.5 + Math.sin(t * 0.1) * 0.4;
  setCameraPosition(cx, cy, 12);
  updateParticles(dt);
}

export function draw() {
  // Empty — homepage overlays its own text via HTML
}
