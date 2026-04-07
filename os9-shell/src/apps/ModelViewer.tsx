import { useEffect, useRef, useState, useCallback } from 'react';

// ── Types ──────────────────────────────────────────────────────────────────

type CameraMode = 'orbit' | 'fly';
type FileType = 'gltf' | 'wad' | null;

interface WadLump {
  name: string;
  offset: number;
  size: number;
}

interface WadData {
  lumps: WadLump[];
  bytes: Uint8Array;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

const ESMSIX = 'https://esm.sh/three@0.182.0';
const EXAMPLES = `${ESMSIX}/examples/jsm`;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _THREE: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _OrbitControls: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _FlyControls: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _GLTFLoader: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _DRACOLoader: any = null;

async function loadTHREE() {
  if (!_THREE) {
    _THREE = await import(/* @vite-ignore */ ESMSIX);
  }
  return _THREE;
}

async function loadOrbitControls() {
  if (!_OrbitControls) {
    const m = await import(/* @vite-ignore */ `${EXAMPLES}/controls/OrbitControls.js`);
    _OrbitControls = m.OrbitControls;
  }
  return _OrbitControls;
}

async function loadFlyControls() {
  if (!_FlyControls) {
    const m = await import(/* @vite-ignore */ `${EXAMPLES}/controls/FlyControls.js`);
    _FlyControls = m.FlyControls;
  }
  return _FlyControls;
}

async function loadGLTFLoader() {
  if (!_GLTFLoader) {
    const m = await import(/* @vite-ignore */ `${EXAMPLES}/loaders/GLTFLoader.js`);
    _GLTFLoader = m.GLTFLoader;
  }
  return _GLTFLoader;
}

async function loadDRACOLoader() {
  if (!_DRACOLoader) {
    const m = await import(/* @vite-ignore */ `${EXAMPLES}/loaders/DRACOLoader.js`);
    _DRACOLoader = m.DRACOLoader;
  }
  return _DRACOLoader;
}

// ── WAD Parser ──────────────────────────────────────────────────────────────

function parseWAD(buffer: ArrayBuffer): WadData | null {
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);
  const magic = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]);
  if (magic !== 'IWAD' && magic !== 'PWAD') return null;
  const numLumps = view.getInt32(4, true);
  const dirOffset = view.getInt32(8, true);
  const lumps: WadLump[] = [];
  for (let i = 0; i < numLumps; i++) {
    const base = dirOffset + i * 16;
    const offset = view.getInt32(base, true);
    const size = view.getInt32(base + 4, true);
    let name = '';
    for (let c = 0; c < 8; c++) {
      const ch = bytes[base + 8 + c];
      if (ch === 0) break;
      name += String.fromCharCode(ch);
    }
    lumps.push({ name, offset, size });
  }
  return { lumps, bytes };
}

function getWadMaps(wad: WadData): string[] {
  return wad.lumps
    .filter(l => /^(E\dM\d|MAP\d\d)$/.test(l.name))
    .map(l => l.name);
}


// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildWadMapGeometry(wad: WadData, mapName: string, THREE: any) {
  const lumps = wad.lumps;
  const mapIdx = lumps.findIndex(l => l.name === mapName);
  if (mapIdx < 0) return null;

  const find = (n: string) => lumps.slice(mapIdx + 1, mapIdx + 12).find(l => l.name === n);

  const vLump = find('VERTEXES');
  const ldLump = find('LINEDEFS');
  const sdLump = find('SIDEDEFS');
  const secLump = find('SECTORS');
  if (!vLump || !ldLump || !sdLump || !secLump) return null;

  const dv = new DataView(wad.bytes.buffer);

  // ── Parse vertices ──
  const numVerts = vLump.size / 4;
  const vx = new Float32Array(numVerts);
  const vy = new Float32Array(numVerts);
  for (let i = 0; i < numVerts; i++) {
    vx[i] = dv.getInt16(vLump.offset + i * 4, true);
    vy[i] = dv.getInt16(vLump.offset + i * 4 + 2, true);
  }

  // ── Parse sectors ── 26 bytes each
  const numSectors = secLump.size / 26;
  const sectorFloor = new Float32Array(numSectors);
  const sectorCeil = new Float32Array(numSectors);
  const sectorLight = new Float32Array(numSectors);
  for (let i = 0; i < numSectors; i++) {
    const base = secLump.offset + i * 26;
    sectorFloor[i] = dv.getInt16(base, true);
    sectorCeil[i] = dv.getInt16(base + 2, true);
    sectorLight[i] = Math.min(1, dv.getUint16(base + 20, true) / 255);
  }

  // ── Parse sidedefs ── 30 bytes each
  const numSidedefs = sdLump.size / 30;
  const sidedefSector = new Int16Array(numSidedefs);
  for (let i = 0; i < numSidedefs; i++) {
    sidedefSector[i] = dv.getInt16(sdLump.offset + i * 30 + 28, true);
  }

  // ── Parse linedefs ── 14 bytes each
  const numLinedefs = ldLump.size / 14;

  // ── Bounding box ──
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (let i = 0; i < numVerts; i++) {
    if (vx[i] < minX) minX = vx[i];
    if (vx[i] > maxX) maxX = vx[i];
    if (vy[i] < minY) minY = vy[i];
    if (vy[i] > maxY) maxY = vy[i];
  }
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const S = 1 / 64;

  // ── Build sector boundary rings for floor/ceiling triangulation ──
  // Collect line segments for each sector
  const sectorLines: Map<number, Array<[number, number, number, number]>> = new Map();

  for (let i = 0; i < numLinedefs; i++) {
    const base = ldLump.offset + i * 14;
    const v1i = dv.getUint16(base, true);
    const v2i = dv.getUint16(base + 2, true);
    const sideR = dv.getInt16(base + 10, true);
    const sideL = dv.getInt16(base + 12, true);
    if (v1i >= numVerts || v2i >= numVerts) continue;

    const addToSector = (sideIdx: number) => {
      if (sideIdx < 0 || sideIdx >= numSidedefs) return;
      const secIdx = sidedefSector[sideIdx];
      if (secIdx < 0 || secIdx >= numSectors) return;
      if (!sectorLines.has(secIdx)) sectorLines.set(secIdx, []);
      sectorLines.get(secIdx)!.push([vx[v1i], vy[v1i], vx[v2i], vy[v2i]]);
    };
    addToSector(sideR);
    addToSector(sideL);
  }

  // Simple ear-clipping triangulation of a polygon
  function triangulate2D(ring: Array<[number, number]>): number[] {
    const tris: number[] = [];
    if (ring.length < 3) return tris;
    // Ensure CCW winding
    let area = 0;
    for (let i = 0; i < ring.length; i++) {
      const j = (i + 1) % ring.length;
      area += ring[i][0] * ring[j][1] - ring[j][0] * ring[i][1];
    }
    const pts = area < 0 ? ring.slice().reverse() : ring.slice();

    const indices = pts.map((_, i) => i);
    let failCount = 0;
    while (indices.length > 2 && failCount < indices.length * 2) {
      let earFound = false;
      for (let ii = 0; ii < indices.length; ii++) {
        const prev = indices[(ii + indices.length - 1) % indices.length];
        const curr = indices[ii];
        const next = indices[(ii + 1) % indices.length];
        const ax = pts[prev][0], ay = pts[prev][1];
        const bx = pts[curr][0], by = pts[curr][1];
        const cxx = pts[next][0], cyy = pts[next][1];
        const cross = (bx - ax) * (cyy - ay) - (by - ay) * (cxx - ax);
        if (cross <= 0) continue; // reflex

        // Check no other point inside
        let inside = false;
        for (let k = 0; k < indices.length; k++) {
          const ki = indices[k];
          if (ki === prev || ki === curr || ki === next) continue;
          const px = pts[ki][0], py = pts[ki][1];
          const d1 = (px - ax) * (by - ay) - (py - ay) * (bx - ax);
          const d2 = (px - bx) * (cyy - by) - (py - by) * (cxx - bx);
          const d3 = (px - cxx) * (ay - cyy) - (py - cyy) * (ax - cxx);
          if (d1 >= 0 && d2 >= 0 && d3 >= 0) { inside = true; break; }
        }
        if (inside) continue;

        tris.push(prev, curr, next);
        indices.splice(ii, 1);
        earFound = true;
        failCount = 0;
        break;
      }
      if (!earFound) failCount++;
    }
    return tris;
  }

  // Build an ordered ring from unordered line segments
  function buildRing(segs: Array<[number, number, number, number]>): Array<[number, number]> | null {
    if (segs.length === 0) return null;
    const eps = 1;
    const eq = (a: number, b: number) => Math.abs(a - b) < eps;
    const ring: Array<[number, number]> = [];
    const used = new Set<number>();

    ring.push([segs[0][0], segs[0][1]]);
    let endX = segs[0][2], endY = segs[0][3];
    used.add(0);

    for (let iter = 0; iter < segs.length; iter++) {
      let found = false;
      for (let i = 0; i < segs.length; i++) {
        if (used.has(i)) continue;
        const [x1, y1, x2, y2] = segs[i];
        if (eq(x1, endX) && eq(y1, endY)) {
          ring.push([x1, y1]);
          endX = x2; endY = y2;
          used.add(i);
          found = true;
          break;
        } else if (eq(x2, endX) && eq(y2, endY)) {
          ring.push([x2, y2]);
          endX = x1; endY = y1;
          used.add(i);
          found = true;
          break;
        }
      }
      if (!found) break;
    }
    return ring.length >= 3 ? ring : null;
  }

  // ── Geometry arrays ──
  const wallPositions: number[] = [];
  const wallColors: number[] = [];
  const floorPositions: number[] = [];
  const floorColors: number[] = [];
  const ceilPositions: number[] = [];
  const ceilColors: number[] = [];
  const wirePositions: number[] = [];

  // ── Build walls (including two-sided upper/lower) ──
  for (let i = 0; i < numLinedefs; i++) {
    const base = ldLump.offset + i * 14;
    const v1i = dv.getUint16(base, true);
    const v2i = dv.getUint16(base + 2, true);
    const sideR = dv.getInt16(base + 10, true);
    const sideL = dv.getInt16(base + 12, true);
    if (v1i >= numVerts || v2i >= numVerts) continue;

    // Right sector info
    let floorR = 0, ceilR = 128, lightR = 0.5;
    let secIdxR = -1;
    if (sideR >= 0 && sideR < numSidedefs) {
      secIdxR = sidedefSector[sideR];
      if (secIdxR >= 0 && secIdxR < numSectors) {
        floorR = sectorFloor[secIdxR];
        ceilR = sectorCeil[secIdxR];
        lightR = sectorLight[secIdxR];
      }
    }

    const isTwoSided = sideL >= 0 && sideL < numSidedefs;

    const x1 = (vx[v1i] - cx) * S;
    const z1 = -(vy[v1i] - cy) * S;
    const x2 = (vx[v2i] - cx) * S;
    const z2 = -(vy[v2i] - cy) * S;

    const addQuad = (yBot: number, yTop: number, light: number) => {
      if (yTop <= yBot) return;
      const yb = yBot * S, yt = yTop * S;
      const r = light * 0.85 + 0.1;
      const g = light * 0.75 + 0.05;
      const b = light * 0.6;
      wallPositions.push(x1,yb,z1, x2,yb,z2, x2,yt,z2);
      wallColors.push(r,g,b, r,g,b, r,g,b);
      wallPositions.push(x1,yb,z1, x2,yt,z2, x1,yt,z1);
      wallColors.push(r,g,b, r,g,b, r,g,b);
      wirePositions.push(x1,yb,z1, x2,yb,z2);
      wirePositions.push(x1,yt,z1, x2,yt,z2);
      wirePositions.push(x1,yb,z1, x1,yt,z1);
      wirePositions.push(x2,yb,z2, x2,yt,z2);
    };

    if (!isTwoSided) {
      // One-sided: full wall from floor to ceiling
      addQuad(floorR, ceilR, lightR);
    } else {
      // Two-sided: render upper and lower wall sections where heights differ
      let floorL = 0, ceilL = 128, lightL = 0.5;
      const secIdxL = sidedefSector[sideL];
      if (secIdxL >= 0 && secIdxL < numSectors) {
        floorL = sectorFloor[secIdxL];
        ceilL = sectorCeil[secIdxL];
        lightL = sectorLight[secIdxL];
      }
      // Lower wall: where adjacent floor is higher
      if (floorL > floorR) addQuad(floorR, floorL, lightR);
      if (floorR > floorL) addQuad(floorL, floorR, lightL);
      // Upper wall: where adjacent ceiling is lower
      if (ceilL < ceilR) addQuad(ceilL, ceilR, lightR);
      if (ceilR < ceilL) addQuad(ceilR, ceilL, lightL);
    }
  }

  // ── Build floor & ceiling polygons per sector ──
  for (const [secIdx, segs] of sectorLines.entries()) {
    if (secIdx < 0 || secIdx >= numSectors) continue;
    const floorH = sectorFloor[secIdx] * S;
    const ceilH = sectorCeil[secIdx] * S;
    const light = sectorLight[secIdx];

    const ring = buildRing(segs);
    if (!ring || ring.length < 3) continue;

    // Transform ring to Three.js coords
    const ring3: Array<[number, number]> = ring.map(([px, py]) => [
      (px - cx) * S,
      -(py - cy) * S,
    ]);

    const triIndices = triangulate2D(ring3);

    const rF = light * 0.6 + 0.08;
    const gF = light * 0.55 + 0.05;
    const bF = light * 0.45;
    const rC = light * 0.5 + 0.15;
    const gC = light * 0.45 + 0.1;
    const bC = light * 0.55 + 0.05;

    for (let t = 0; t < triIndices.length; t += 3) {
      const a = ring3[triIndices[t]], b = ring3[triIndices[t+1]], c = ring3[triIndices[t+2]];
      if (!a || !b || !c) continue;
      // Floor (y = floorH, face up)
      floorPositions.push(a[0], floorH, a[1],  b[0], floorH, b[1],  c[0], floorH, c[1]);
      floorColors.push(rF,gF,bF, rF,gF,bF, rF,gF,bF);
      // Ceiling (y = ceilH, face down — reversed winding)
      ceilPositions.push(c[0], ceilH, c[1],  b[0], ceilH, b[1],  a[0], ceilH, a[1]);
      ceilColors.push(rC,gC,bC, rC,gC,bC, rC,gC,bC);
    }
  }

  // ── Assemble group ──
  const group = new THREE.Group();
  const makeMesh = (positions: number[], colors: number[]) => {
    if (positions.length === 0) return;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    const mat = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
    group.add(new THREE.Mesh(geo, mat));
  };
  makeMesh(wallPositions, wallColors);
  makeMesh(floorPositions, floorColors);
  makeMesh(ceilPositions, ceilColors);

  if (wirePositions.length > 0) {
    const wGeo = new THREE.BufferGeometry();
    wGeo.setAttribute('position', new THREE.Float32BufferAttribute(wirePositions, 3));
    const wMat = new THREE.LineBasicMaterial({ color: 0x00ff88, opacity: 0.25, transparent: true });
    group.add(new THREE.LineSegments(wGeo, wMat));
  }

  return group;
}

// ── Camera fit ──────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fitCameraToObject(camera: any, object: any, controls: any, THREE: any) {
  const box = new THREE.Box3().setFromObject(object);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);
  const fov = (camera.fov * Math.PI) / 180;
  const dist = Math.abs(maxDim / 2 / Math.tan(fov / 2)) * 1.6;
  camera.position.set(center.x + dist * 0.6, center.y + dist * 0.4, center.z + dist);
  camera.near = dist * 0.01;
  camera.far = dist * 20;
  camera.updateProjectionMatrix();
  if (controls?.target) {
    controls.target.copy(center);
    controls.update();
  }
}

// ── Component ───────────────────────────────────────────────────────────────

const BTN: React.CSSProperties = {
  padding: '4px 10px',
  background: '#3a3a3a',
  border: '1px solid #555',
  borderRadius: 4,
  color: '#e0e0e0',
  cursor: 'pointer',
  fontSize: 12,
  fontFamily: 'inherit',
  whiteSpace: 'nowrap',
};
const BTN_ACTIVE: React.CSSProperties = { ...BTN, background: '#0066cc', borderColor: '#0088ff', color: '#fff' };

export function ModelViewer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<unknown>(null);
  const sceneRef = useRef<unknown>(null);
  const cameraRef = useRef<unknown>(null);
  const controlsRef = useRef<unknown>(null);
  const mixerRef = useRef<unknown>(null);
  const clockRef = useRef<unknown>(null);
  const modelRef = useRef<unknown>(null);
  const wadRef = useRef<WadData | null>(null);
  const animRef = useRef<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [status, setStatus] = useState('Drop a .gltf, .glb, or .wad file here, or click Open');
  const [fileName, setFileName] = useState('');
  const [fileType, setFileType] = useState<FileType>(null);
  const [cameraMode, setCameraMode] = useState<CameraMode>('orbit');
  const [wireframe, setWireframe] = useState(false);
  const [wadMaps, setWadMaps] = useState<string[]>([]);
  const [currentMap, setCurrentMap] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);

  // ── Init Three.js ──────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const THREE = await loadTHREE();
      const OrbitControls = await loadOrbitControls();
      if (cancelled || !canvasRef.current) return;

      const canvas = canvasRef.current;
      const parent = canvas.parentElement!;
      const w = parent.clientWidth || 800;
      const h = parent.clientHeight || 600;

      const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(w, h);
      renderer.shadowMap.enabled = true;
      rendererRef.current = renderer;

      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x1a1a2e);
      sceneRef.current = scene;

      const camera = new THREE.PerspectiveCamera(60, w / h, 0.01, 1000);
      camera.position.set(5, 4, 8);
      cameraRef.current = camera;

      const clock = new THREE.Clock();
      clockRef.current = clock;

      // Lights
      const ambient = new THREE.AmbientLight(0xffffff, 0.6);
      scene.add(ambient);
      const dir = new THREE.DirectionalLight(0xffffff, 1.4);
      dir.position.set(5, 10, 7);
      dir.castShadow = true;
      scene.add(dir);
      const fill = new THREE.DirectionalLight(0x8888ff, 0.4);
      fill.position.set(-5, 0, -5);
      scene.add(fill);

      // Grid
      const grid = new THREE.GridHelper(20, 20, 0x333366, 0x222244);
      scene.add(grid);

      // Controls
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.08;
      controlsRef.current = controls;

      // Resize observer
      const ro = new ResizeObserver(() => {
        const pw = parent.clientWidth;
        const ph = parent.clientHeight;
        if (pw > 0 && ph > 0) {
          renderer.setSize(pw, ph);
          (camera as {aspect: number; updateProjectionMatrix:()=>void}).aspect = pw / ph;
          (camera as {updateProjectionMatrix:()=>void}).updateProjectionMatrix();
        }
      });
      ro.observe(parent);

      // Render loop
      const tick = () => {
        animRef.current = requestAnimationFrame(tick);
        const delta = (clockRef.current as {getDelta:()=>number}).getDelta();
        if (mixerRef.current) {
          (mixerRef.current as {update:(d:number)=>void}).update(delta);
        }
        (controls as {update:(d?:number)=>void}).update(delta);
        renderer.render(scene, camera);
      };
      tick();

      return () => { ro.disconnect(); };
    })();
    return () => {
      cancelled = true;
      cancelAnimationFrame(animRef.current);
      if (rendererRef.current) {
        (rendererRef.current as {dispose:()=>void}).dispose();
      }
    };
  }, []);

  // ── Switch camera mode ─────────────────────────────────────────────────────
  const switchCameraMode = useCallback(async (mode: CameraMode) => {
    if (!rendererRef.current || !cameraRef.current) return;
    const THREE = await loadTHREE();

    // Dispose old controls
    if (controlsRef.current) {
      (controlsRef.current as {dispose:()=>void}).dispose();
      controlsRef.current = null;
    }

    const camera = cameraRef.current;
    const renderer = rendererRef.current;

    if (mode === 'orbit') {
      const OrbitControls = await loadOrbitControls();
      const controls = new OrbitControls(camera, (renderer as {domElement:HTMLElement}).domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.08;
      // Re-fit to model if loaded
      if (modelRef.current && sceneRef.current) {
        fitCameraToObject(camera, modelRef.current, controls, THREE);
      }
      controlsRef.current = controls;
    } else {
      const FlyControls = await loadFlyControls();
      const controls = new FlyControls(camera, (renderer as {domElement:HTMLElement}).domElement);
      controls.movementSpeed = 15;
      controls.rollSpeed = 0.35;
      controls.dragToLook = true;
      controlsRef.current = controls;
    }
    setCameraMode(mode);
  }, []);

  // ── Toggle wireframe ───────────────────────────────────────────────────────
  const toggleWireframe = useCallback(() => {
    if (!modelRef.current) return;
    const next = !wireframe;
    setWireframe(next);
    const model = modelRef.current as {traverse:(fn:(o:unknown)=>void)=>void};
    model.traverse((obj: unknown) => {
      const mesh = obj as {isMesh?:boolean; material?:{wireframe:boolean}|Array<{wireframe:boolean}>};
      if (!mesh.isMesh || !mesh.material) return;
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach(m => { m.wireframe = next; });
      } else {
        mesh.material.wireframe = next;
      }
    });
  }, [wireframe]);

  // ── Reset camera ───────────────────────────────────────────────────────────
  const resetCamera = useCallback(async () => {
    const THREE = await loadTHREE();
    if (modelRef.current && cameraRef.current && controlsRef.current) {
      fitCameraToObject(cameraRef.current, modelRef.current, controlsRef.current, THREE);
    }
  }, []);

  // ── Clear scene ────────────────────────────────────────────────────────────
  const clearModel = useCallback(async () => {
    const THREE = await loadTHREE();
    if (!sceneRef.current) return;
    const scene = sceneRef.current as {children:unknown[]; remove:(o:unknown)=>void};
    if (modelRef.current) {
      scene.remove(modelRef.current);
      const model = modelRef.current as {traverse:(fn:(o:unknown)=>void)=>void};
      model.traverse((obj: unknown) => {
        const o = obj as {isMesh?:boolean; geometry?:{dispose:()=>void}; material?:{dispose:()=>void}|Array<{dispose:()=>void}>};
        if (!o.isMesh) return;
        o.geometry?.dispose();
        if (Array.isArray(o.material)) o.material.forEach(m => m.dispose());
        else o.material?.dispose();
      });
      modelRef.current = null;
    }
    mixerRef.current = null;
    void THREE; // suppress unused warning
  }, []);

  // ── GLTF load ──────────────────────────────────────────────────────────────
  const loadGLTF = useCallback(async (file: File) => {
    const THREE = await loadTHREE();
    const GLTFLoader = await loadGLTFLoader();
    await clearModel();

    const url = URL.createObjectURL(file);
    setStatus('Loading model…');
    setLoading(true);

    const DRACOLoader = await loadDRACOLoader();
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');
    dracoLoader.setDecoderConfig({ type: 'js' });
    const loader = new GLTFLoader();
    loader.setDRACOLoader(dracoLoader);
    loader.load(
      url,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (gltf: any) => {
        URL.revokeObjectURL(url);
        const model = gltf.scene;
        modelRef.current = model;
        (sceneRef.current as {add:(o:unknown)=>void}).add(model);

        if (cameraRef.current && controlsRef.current) {
          fitCameraToObject(cameraRef.current, model, controlsRef.current, THREE);
        }

        // Animations
        if (gltf.animations?.length) {
          const mixer = new THREE.AnimationMixer(model);
          mixer.clipAction(gltf.animations[0]).play();
          mixerRef.current = mixer;
        }

        // Count triangles
        let tris = 0;
        model.traverse((o: unknown) => {
          const m = o as {isMesh?:boolean; geometry?:{index?:{count:number};attributes?:{position?:{count:number}}}};
          if (!m.isMesh || !m.geometry) return;
          tris += m.geometry.index
            ? m.geometry.index.count / 3
            : (m.geometry.attributes?.position?.count ?? 0) / 3;
        });
        const animStr = gltf.animations?.length ? ` · ${gltf.animations.length} animations` : '';
        setStatus(`${Math.round(tris).toLocaleString()} triangles${animStr}`);
        setFileType('gltf');
        setLoading(false);
      },
      undefined,
      (err: unknown) => {
        URL.revokeObjectURL(url);
        setStatus(`Error loading model: ${(err as Error).message ?? err}`);
        setLoading(false);
      }
    );
  }, [clearModel]);

  // ── WAD load ───────────────────────────────────────────────────────────────
  const loadWAD = useCallback(async (file: File) => {
    await clearModel();
    setStatus('Parsing WAD…');
    setLoading(true);
    const buf = await file.arrayBuffer();
    const wad = parseWAD(buf);
    if (!wad) {
      setStatus('Error: not a valid WAD file (missing IWAD/PWAD header)');
      setLoading(false);
      return;
    }
    wadRef.current = wad;
    const maps = getWadMaps(wad);
    setWadMaps(maps);
    setFileType('wad');
    setLoading(false);

    if (maps.length > 0) {
      setCurrentMap(maps[0]);
      // renderMap called via useEffect on currentMap
    } else {
      setStatus(`WAD loaded: ${wad.lumps.length} lumps. No maps found.`);
    }
  }, [clearModel]);

  // ── Render WAD map ─────────────────────────────────────────────────────────
  const renderWadMap = useCallback(async (mapName: string) => {
    if (!wadRef.current || !sceneRef.current) return;
    const THREE = await loadTHREE();

    await clearModel();

    const group = buildWadMapGeometry(wadRef.current, mapName, THREE);
    if (!group) {
      setStatus(`Could not parse map ${mapName}`);
      return;
    }

    modelRef.current = group;
    (sceneRef.current as {add:(o:unknown)=>void}).add(group);

    if (cameraRef.current && controlsRef.current) {
      fitCameraToObject(cameraRef.current, group, controlsRef.current, THREE);
    }

    const wad = wadRef.current;
    setStatus(`Map: ${mapName} · ${wad.lumps.length} lumps total`);
  }, [clearModel]);

  // Render map when currentMap changes
  useEffect(() => {
    if (currentMap && fileType === 'wad') {
      renderWadMap(currentMap);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMap, fileType]);

  // ── File dispatch ──────────────────────────────────────────────────────────
  const handleFile = useCallback((file: File) => {
    const name = file.name.toLowerCase();
    setFileName(file.name);
    if (name.endsWith('.gltf') || name.endsWith('.glb')) {
      loadGLTF(file);
    } else if (name.endsWith('.wad')) {
      loadWAD(file);
    } else {
      setStatus(`Unsupported file type. Drop a .gltf, .glb, or .wad file.`);
    }
  }, [loadGLTF, loadWAD]);

  // ── Drag & drop ────────────────────────────────────────────────────────────
  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const onDragLeave = () => setIsDragging(false);
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };
  const onFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#111', fontFamily: '"Helvetica Neue", Arial, sans-serif', fontSize: 12, color: '#ddd' }}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 8px', background: '#222', borderBottom: '1px solid #333', flexShrink: 0, flexWrap: 'wrap' }}>
        <input ref={fileInputRef} type="file" accept=".gltf,.glb,.wad" style={{ display: 'none' }} onChange={onFileInput} />
        <button style={BTN} onClick={() => fileInputRef.current?.click()}>📂 Open</button>

        {/* Separator */}
        <div style={{ width: 1, height: 18, background: '#444', margin: '0 2px' }} />

        {/* Camera mode */}
        <button style={cameraMode === 'orbit' ? BTN_ACTIVE : BTN} onClick={() => switchCameraMode('orbit')}>🌐 Orbit</button>
        <button style={cameraMode === 'fly'   ? BTN_ACTIVE : BTN} onClick={() => switchCameraMode('fly')}>✈️ Fly</button>

        {/* Separator */}
        <div style={{ width: 1, height: 18, background: '#444', margin: '0 2px' }} />

        {/* Tools */}
        {fileType === 'gltf' && (
          <button style={wireframe ? BTN_ACTIVE : BTN} onClick={toggleWireframe}>🔲 Wire</button>
        )}
        <button style={BTN} onClick={resetCamera}>↩️ Reset</button>

        {/* WAD map selector */}
        {fileType === 'wad' && wadMaps.length > 0 && (
          <>
            <div style={{ width: 1, height: 18, background: '#444', margin: '0 2px' }} />
            <span style={{ color: '#aaa', marginRight: 2 }}>Map:</span>
            <select
              value={currentMap}
              onChange={e => setCurrentMap(e.target.value)}
              style={{ background: '#333', border: '1px solid #555', color: '#e0e0e0', borderRadius: 4, padding: '3px 6px', fontSize: 12, cursor: 'pointer' }}
            >
              {wadMaps.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </>
        )}

        {/* Status */}
        <div style={{ flex: 1, minWidth: 20 }} />
        <span style={{ color: loading ? '#ffcc44' : '#888', fontSize: 11 }}>
          {fileName ? `${fileName} · ` : ''}{status}
        </span>
      </div>

      {/* Canvas container */}
      <div style={{ position: 'relative', flex: 1, overflow: 'hidden' }}>
        <canvas
          ref={canvasRef}
          style={{ display: 'block', width: '100%', height: '100%' }}
        />

        {/* Drop overlay */}
        {isDragging && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,80,200,0.35)', border: '3px dashed #4488ff', pointerEvents: 'none', zIndex: 10,
          }}>
            <div style={{ fontSize: 24, color: '#aaccff' }}>Drop .gltf / .glb / .wad here</div>
          </div>
        )}

        {/* Empty state */}
        {!fileType && !isDragging && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            color: '#555', pointerEvents: 'none', gap: 10,
          }}>
            <div style={{ fontSize: 48 }}>📦</div>
            <div style={{ fontSize: 14 }}>Drop a file or click Open</div>
            <div style={{ fontSize: 11, color: '#3a3a3a' }}>.gltf · .glb · .wad</div>
          </div>
        )}

        {/* Fly mode hint */}
        {cameraMode === 'fly' && fileType && (
          <div style={{
            position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)',
            background: 'rgba(0,0,0,0.65)', border: '1px solid #333', borderRadius: 4,
            padding: '4px 10px', fontSize: 11, color: '#aaa', pointerEvents: 'none', whiteSpace: 'nowrap',
          }}>
            ✈️ Fly mode · WASD to move · drag to look
          </div>
        )}
      </div>
    </div>
  );
}
