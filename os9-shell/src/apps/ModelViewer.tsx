import { useEffect, useRef, useState, useCallback } from 'react';

// ── Types ──────────────────────────────────────────────────────────────────

type CameraMode = 'orbit' | 'fly';
type FileType = 'gltf' | 'wad' | 'vox' | null;

// WadLump replaced by DirEntry in WADLoaderMV

// WadData replaced by WADLoaderMV

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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _VOXLoader: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _VOXMesh: any = null;

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

async function loadVOXLoader() {
  if (!_VOXLoader) {
    const m = await import(/* @vite-ignore */ `${EXAMPLES}/loaders/VOXLoader.js`);
    _VOXLoader = m.VOXLoader;
    _VOXMesh = m.VOXMesh;
  }
  return { VOXLoader: _VOXLoader, VOXMesh: _VOXMesh };
}

// ── WAD Thing Constants ──────────────────────────────────────────────────────

const THING_MONSTERS: Record<number, string> = {
  3004:'grunt',9:'grunt',3001:'grunt',3006:'grunt',
  65:'shooter',3005:'shooter',66:'shooter',68:'shooter',71:'shooter',84:'shooter',
  3002:'tank',58:'tank',67:'tank',69:'tank',
  3003:'boss',64:'boss',16:'boss',7:'boss',
};

const THING_ITEMS: Record<number, string> = {
  2011:'health',2012:'health',2014:'health',
  2015:'armor',2018:'armor',2019:'armor',
  2007:'ammo',2008:'ammo',2010:'ammo',2047:'ammo',2048:'ammo',2049:'ammo',
  2001:'ammo',2002:'ammo',2003:'ammo',2004:'ammo',2006:'ammo',
};

const THING_SPRITE_PREFIX: Record<number, string> = {
  3004:'POSS',9:'SPOS',3001:'TROO',3006:'SKUL',65:'CPOS',3005:'HEAD',
  66:'SKEL',68:'BSPI',71:'PAIN',84:'SSWV',3002:'SARG',58:'SARG',
  67:'FATT',69:'BOS2',3003:'BOSS',64:'VILE',16:'CYBR',7:'SPID',
  2011:'STIM',2012:'MEDI',2014:'BON1',2015:'BON2',2018:'ARM1',2019:'ARM2',
  2007:'CLIP',2008:'SHEL',2010:'ROCK',2047:'CELL',2001:'SHOT',2002:'MGUN',
  2003:'LAUN',2004:'PLAS',2006:'BFUG',2035:'BAR1',70:'FCAN',44:'TBLU',
  45:'TGRN',46:'TRED',48:'ELEC',34:'CAND',35:'CBRA',
};

const THING_COLORS: Record<string, number> = {
  grunt:0x00cc00, shooter:0xcc6600, tank:0x666666, boss:0xff0000,
  health:0xff3333, armor:0x3366ff, ammo:0xffcc00,
};

// ── WAD Binary Helpers ──────────────────────────────────────────────────────

function readStr8(bytes: Uint8Array, offset: number): string {
  let s = '';
  for (let i = 0; i < 8; i++) {
    const c = bytes[offset + i];
    if (c === 0) break;
    s += String.fromCharCode(c);
  }
  return s.toUpperCase();
}

interface WadVertex { x: number; y: number; }
interface WadLinedef { v1: number; v2: number; flags: number; right: number; left: number; }
interface WadSidedef { xoff: number; yoff: number; upper: string; lower: string; middle: string; sector: number; }
interface WadSector { floorH: number; ceilH: number; floorFlat: string; ceilFlat: string; light: number; }
interface WadThing { x: number; y: number; angle: number; type: number; flags: number; }
interface WadMap { name: string; vertexes: WadVertex[]; linedefs: WadLinedef[]; sidedefs: WadSidedef[]; sectors: WadSector[]; things: WadThing[]; }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface WadTexDef { name: string; width: number; height: number; patches: any[]; }

function readVerts(dv: DataView): WadVertex[] {
  const out: WadVertex[] = [];
  for (let i = 0; i < dv.byteLength; i += 4)
    out.push({ x: dv.getInt16(i, true), y: dv.getInt16(i + 2, true) });
  return out;
}

function readLines(dv: DataView): WadLinedef[] {
  const out: WadLinedef[] = [];
  for (let i = 0; i < dv.byteLength; i += 14)
    out.push({
      v1: dv.getUint16(i, true), v2: dv.getUint16(i + 2, true),
      flags: dv.getUint16(i + 4, true),
      right: dv.getInt16(i + 10, true), left: dv.getInt16(i + 12, true),
    });
  return out;
}

function readSides(dv: DataView): WadSidedef[] {
  const bytes = new Uint8Array(dv.buffer, dv.byteOffset, dv.byteLength);
  const out: WadSidedef[] = [];
  for (let i = 0; i < dv.byteLength; i += 30) {
    out.push({
      xoff: dv.getInt16(i, true), yoff: dv.getInt16(i + 2, true),
      upper: readStr8(bytes, i + 4), lower: readStr8(bytes, i + 12),
      middle: readStr8(bytes, i + 20), sector: dv.getUint16(i + 28, true),
    });
  }
  return out;
}

function readSectors(dv: DataView): WadSector[] {
  const bytes = new Uint8Array(dv.buffer, dv.byteOffset, dv.byteLength);
  const out: WadSector[] = [];
  for (let i = 0; i < dv.byteLength; i += 26)
    out.push({
      floorH: dv.getInt16(i, true), ceilH: dv.getInt16(i + 2, true),
      floorFlat: readStr8(bytes, i + 4), ceilFlat: readStr8(bytes, i + 12),
      light: dv.getInt16(i + 20, true),
    });
  return out;
}

function readThings(dv: DataView): WadThing[] {
  const out: WadThing[] = [];
  for (let i = 0; i < dv.byteLength; i += 10)
    out.push({
      x: dv.getInt16(i, true), y: dv.getInt16(i + 2, true),
      angle: dv.getUint16(i + 4, true), type: dv.getUint16(i + 6, true),
      flags: dv.getUint16(i + 8, true),
    });
  return out;
}

// ── WADLoaderMV ─────────────────────────────────────────────────────────────

interface DirEntry { name: string; filepos: number; size: number; }

class WADLoaderMV {
  directory: DirEntry[] = [];
  buffer: ArrayBuffer | null = null;

  load(arrayBuffer: ArrayBuffer) {
    this.buffer = arrayBuffer;
    const view = new DataView(arrayBuffer);
    const bytes = new Uint8Array(arrayBuffer);
    const tag = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]);
    if (tag !== 'IWAD' && tag !== 'PWAD') throw new Error('Invalid WAD file');

    const numLumps = view.getInt32(4, true);
    const dirOfs = view.getInt32(8, true);
    this.directory = [];
    for (let i = 0; i < numLumps; i++) {
      const o = dirOfs + i * 16;
      const filepos = view.getInt32(o, true);
      const size = view.getInt32(o + 4, true);
      let name = '';
      for (let j = 0; j < 8; j++) {
        const c = bytes[o + 8 + j];
        if (c === 0) break;
        name += String.fromCharCode(c);
      }
      this.directory.push({ name: name.toUpperCase(), filepos, size });
    }
    return this;
  }

  getMapNames(): string[] {
    return this.directory.filter(e => /^(E\dM\d|MAP\d\d)$/.test(e.name)).map(e => e.name);
  }

  getMap(name: string): WadMap | null {
    const idx = this.directory.findIndex(e => e.name === name);
    if (idx < 0 || !this.buffer) return null;
    const lumps: Record<string, DataView> = {};
    for (let i = idx + 1; i < this.directory.length && i <= idx + 11; i++) {
      const e = this.directory[i];
      if (/^(E\dM\d|MAP\d\d)$/.test(e.name)) break;
      if (e.size > 0) lumps[e.name] = new DataView(this.buffer, e.filepos, e.size);
    }
    if (!lumps.VERTEXES || !lumps.LINEDEFS || !lumps.SIDEDEFS || !lumps.SECTORS) return null;
    return {
      name,
      vertexes: readVerts(lumps.VERTEXES),
      linedefs: readLines(lumps.LINEDEFS),
      sidedefs: readSides(lumps.SIDEDEFS),
      sectors: readSectors(lumps.SECTORS),
      things: lumps.THINGS ? readThings(lumps.THINGS) : [],
    };
  }

  getPalette(): Uint8Array | null {
    const lump = this.directory.find(e => e.name === 'PLAYPAL');
    if (!lump || lump.size < 768 || !this.buffer) return null;
    return new Uint8Array(this.buffer, lump.filepos, 768);
  }

  getLump(name: string): { data: Uint8Array; size: number } | null {
    const lump = this.directory.find(e => e.name === name.toUpperCase());
    if (!lump || lump.size === 0 || !this.buffer) return null;
    return { data: new Uint8Array(this.buffer, lump.filepos, lump.size), size: lump.size };
  }

  getFlatLumps(): Record<string, Uint8Array> {
    const flats: Record<string, Uint8Array> = {};
    let inFlats = false;
    for (const e of this.directory) {
      if (e.name === 'F_START' || e.name === 'FF_START') { inFlats = true; continue; }
      if (e.name === 'F_END' || e.name === 'FF_END') { inFlats = false; continue; }
      if (inFlats && e.size === 4096 && this.buffer) {
        flats[e.name] = new Uint8Array(this.buffer, e.filepos, 4096);
      }
    }
    return flats;
  }

  getPNames(): string[] {
    const lump = this.getLump('PNAMES');
    if (!lump) return [];
    const dv = new DataView(lump.data.buffer, lump.data.byteOffset, lump.data.byteLength);
    const count = dv.getInt32(0, true);
    const names: string[] = [];
    for (let i = 0; i < count; i++) names.push(readStr8(lump.data, 4 + i * 8));
    return names;
  }

  getTextureDefs(lumpName: string): Record<string, WadTexDef> {
    const lump = this.getLump(lumpName);
    if (!lump) return {};
    const dv = new DataView(lump.data.buffer, lump.data.byteOffset, lump.data.byteLength);
    const count = dv.getInt32(0, true);
    const textures: Record<string, WadTexDef> = {};
    for (let i = 0; i < count; i++) {
      const offset = dv.getInt32(4 + i * 4, true);
      if (offset + 22 > lump.size) continue;
      const name = readStr8(lump.data, offset);
      const width = dv.getInt16(offset + 12, true);
      const height = dv.getInt16(offset + 14, true);
      const patchCount = dv.getInt16(offset + 20, true);
      const patches = [];
      for (let j = 0; j < patchCount; j++) {
        const po = offset + 22 + j * 10;
        if (po + 6 > lump.size) break;
        patches.push({
          originX: dv.getInt16(po, true),
          originY: dv.getInt16(po + 2, true),
          patchIdx: dv.getInt16(po + 4, true),
        });
      }
      textures[name] = { name, width, height, patches };
    }
    return textures;
  }

  getSpriteLumps(): Record<string, Uint8Array> {
    const sprites: Record<string, Uint8Array> = {};
    let inSprites = false;
    for (const e of this.directory) {
      if (e.name === 'S_START' || e.name === 'SS_START') { inSprites = true; continue; }
      if (e.name === 'S_END' || e.name === 'SS_END') { inSprites = false; continue; }
      if (inSprites && e.size > 0 && this.buffer) {
        sprites[e.name] = new Uint8Array(this.buffer, e.filepos, e.size);
      }
    }
    return sprites;
  }
}

// ── WADTextureManagerMV (standalone, no global THREE dependency) ─────────────

class WADTextureManagerMV {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  THREE: any;
  wad: WADLoaderMV;
  palette: Uint8Array | null = null;
  patchNames: string[] = [];
  textureDefs: Record<string, WadTexDef> = {};
  flatLumps: Record<string, Uint8Array> = {};
  spriteLumps: Record<string, Uint8Array> = {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  wallTexCache = new Map<string, any>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  flatTexCache = new Map<string, any>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  spriteTexCache = new Map<number, any>();
  _init = false;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(wadLoader: WADLoaderMV, THREE: any) {
    this.THREE = THREE;
    this.wad = wadLoader;
  }

  init() {
    if (this._init) return;
    this.palette = this.wad.getPalette();
    if (!this.palette) { console.warn('WAD has no PLAYPAL'); return; }
    this.patchNames = this.wad.getPNames();
    this.textureDefs = {
      ...this.wad.getTextureDefs('TEXTURE1'),
      ...this.wad.getTextureDefs('TEXTURE2'),
    };
    this.flatLumps = this.wad.getFlatLumps();
    this.spriteLumps = this.wad.getSpriteLumps();
    this._init = true;
  }

  parsePicture(data: Uint8Array) {
    if (!data || data.length < 8 || !this.palette) return null;
    const dv = new DataView(data.buffer, data.byteOffset, data.byteLength);
    const width = dv.getUint16(0, true);
    const height = dv.getUint16(2, true);
    if (width === 0 || height === 0 || width > 4096 || height > 4096) return null;
    if (8 + width * 4 > data.length) return null;
    const colOffsets: number[] = [];
    for (let x = 0; x < width; x++) colOffsets.push(dv.getUint32(8 + x * 4, true));

    const pixels = new Uint8Array(width * height * 4);
    for (let x = 0; x < width; x++) {
      let ofs = colOffsets[x];
      if (ofs >= data.length) continue;
      for (let safety = 0; safety < 256; safety++) {
        if (ofs >= data.length) break;
        const topdelta = data[ofs++];
        if (topdelta === 0xff) break;
        if (ofs >= data.length) break;
        const length = data[ofs++];
        ofs++; // padding
        for (let j = 0; j < length; j++) {
          if (ofs >= data.length) break;
          const y = topdelta + j;
          if (y < height) {
            const palIdx = data[ofs];
            const pi = (y * width + x) * 4;
            pixels[pi] = this.palette![palIdx * 3];
            pixels[pi + 1] = this.palette![palIdx * 3 + 1];
            pixels[pi + 2] = this.palette![palIdx * 3 + 2];
            pixels[pi + 3] = 255;
          }
          ofs++;
        }
        ofs++; // padding
      }
    }
    return { width, height, pixels };
  }

  compositeWallTexture(texDef: WadTexDef) {
    const { width, height, patches } = texDef;
    const pixels = new Uint8Array(width * height * 4);
    for (const p of patches) {
      if (p.patchIdx < 0 || p.patchIdx >= this.patchNames.length) continue;
      const patchName = this.patchNames[p.patchIdx];
      const patchLump = this.wad.getLump(patchName);
      if (!patchLump) continue;
      const pic = this.parsePicture(patchLump.data);
      if (!pic) continue;
      for (let py = 0; py < pic.height; py++) {
        for (let px = 0; px < pic.width; px++) {
          const srcIdx = (py * pic.width + px) * 4;
          if (pic.pixels[srcIdx + 3] === 0) continue;
          const dx = p.originX + px;
          const dy = p.originY + py;
          if (dx < 0 || dx >= width || dy < 0 || dy >= height) continue;
          const dstIdx = (dy * width + dx) * 4;
          pixels[dstIdx] = pic.pixels[srcIdx];
          pixels[dstIdx + 1] = pic.pixels[srcIdx + 1];
          pixels[dstIdx + 2] = pic.pixels[srcIdx + 2];
          pixels[dstIdx + 3] = 255;
        }
      }
    }
    return { width, height, pixels };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getWallTexture(name: string): any {
    if (!name || name === '-' || !this._init) return null;
    name = name.toUpperCase();
    const cached = this.wallTexCache.get(name);
    if (cached !== undefined) return cached;
    const texDef = this.textureDefs[name];
    if (!texDef) { this.wallTexCache.set(name, null); return null; }
    const comp = this.compositeWallTexture(texDef);
    // Flip Y for Three.js
    const flipped = new Uint8Array(comp.width * comp.height * 4);
    const rowBytes = comp.width * 4;
    for (let y = 0; y < comp.height; y++) {
      const srcRow = y * rowBytes;
      const dstRow = (comp.height - 1 - y) * rowBytes;
      flipped.set(comp.pixels.subarray(srcRow, srcRow + rowBytes), dstRow);
    }
    const T = this.THREE;
    const tex = new T.DataTexture(flipped, comp.width, comp.height, T.RGBAFormat);
    tex.wrapS = T.RepeatWrapping;
    tex.wrapT = T.RepeatWrapping;
    tex.magFilter = T.NearestFilter;
    tex.minFilter = T.NearestFilter;
    tex.generateMipmaps = false;
    tex.needsUpdate = true;
    this.wallTexCache.set(name, tex);
    return tex;
  }

  getTextureDef(name: string): WadTexDef | null {
    if (!name || name === '-') return null;
    return this.textureDefs[name.toUpperCase()] || null;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getFlatTexture(name: string): any {
    if (!name || name === '-' || !this._init) return null;
    name = name.toUpperCase();
    const cached = this.flatTexCache.get(name);
    if (cached !== undefined) return cached;
    const flatData = this.flatLumps[name];
    if (!flatData || !this.palette) { this.flatTexCache.set(name, null); return null; }
    const pixels = new Uint8Array(64 * 64 * 4);
    for (let i = 0; i < 4096; i++) {
      const palIdx = flatData[i];
      pixels[i * 4] = this.palette[palIdx * 3];
      pixels[i * 4 + 1] = this.palette[palIdx * 3 + 1];
      pixels[i * 4 + 2] = this.palette[palIdx * 3 + 2];
      pixels[i * 4 + 3] = 255;
    }
    const T = this.THREE;
    const tex = new T.DataTexture(pixels, 64, 64, T.RGBAFormat);
    tex.wrapS = T.RepeatWrapping;
    tex.wrapT = T.RepeatWrapping;
    tex.magFilter = T.NearestFilter;
    tex.minFilter = T.NearestFilter;
    tex.generateMipmaps = false;
    tex.needsUpdate = true;
    this.flatTexCache.set(name, tex);
    return tex;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getSpriteTexture(thingType: number): any {
    const prefix = THING_SPRITE_PREFIX[thingType];
    if (!prefix) return null;
    const cached = this.spriteTexCache.get(thingType);
    if (cached !== undefined) return cached;
    let spriteData = this.spriteLumps[prefix + 'A1'];
    if (!spriteData) spriteData = this.spriteLumps[prefix + 'A0'];
    if (!spriteData) {
      const key = Object.keys(this.spriteLumps).find(k => k.startsWith(prefix + 'A'));
      if (key) spriteData = this.spriteLumps[key];
    }
    if (!spriteData) { this.spriteTexCache.set(thingType, null); return null; }
    const pic = this.parsePicture(spriteData);
    if (!pic) { this.spriteTexCache.set(thingType, null); return null; }
    // Flip Y for Three.js
    const flipped = new Uint8Array(pic.width * pic.height * 4);
    const rowBytes = pic.width * 4;
    for (let y = 0; y < pic.height; y++) {
      const srcRow = y * rowBytes;
      const dstRow = (pic.height - 1 - y) * rowBytes;
      flipped.set(pic.pixels.subarray(srcRow, srcRow + rowBytes), dstRow);
    }
    const T = this.THREE;
    const tex = new T.DataTexture(flipped, pic.width, pic.height, T.RGBAFormat);
    tex.magFilter = T.NearestFilter;
    tex.minFilter = T.NearestFilter;
    tex.generateMipmaps = false;
    tex.needsUpdate = true;
    const result = { texture: tex, width: pic.width, height: pic.height };
    this.spriteTexCache.set(thingType, result);
    return result;
  }

  dispose() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const tex of this.wallTexCache.values()) if (tex) (tex as any).dispose();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const tex of this.flatTexCache.values()) if (tex) (tex as any).dispose();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const s of this.spriteTexCache.values()) if (s) (s as any).texture.dispose();
    this.wallTexCache.clear();
    this.flatTexCache.clear();
    this.spriteTexCache.clear();
  }
}

// ── buildWadMapGeometry (textured, with things) ─────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildWadMapGeometry(loader: WADLoaderMV, texMgr: WADTextureManagerMV | null, mapName: string, THREE: any) {
  const map = loader.getMap(mapName);
  if (!map) return null;

  const { vertexes, linedefs, sidedefs, sectors, things } = map;
  const S = 1 / 64;

  // ── Centering ──
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const v of vertexes) {
    if (v.x < minX) minX = v.x;
    if (v.x > maxX) maxX = v.x;
    if (v.y < minY) minY = v.y;
    if (v.y > maxY) maxY = v.y;
  }
  const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;

  const group = new THREE.Group();

  // ── Wall batching ──
  // Textured walls batched by texture name; untextured walls batched together
  interface WallBatch { positions: number[]; uvs: number[]; normals: number[]; colors: number[]; }
  const wallBatches = new Map<string, WallBatch>();
  const untextured: { positions: number[]; normals: number[]; colors: number[] } = { positions: [], normals: [], colors: [] };

  function getWallBatch(texName: string): WallBatch {
    if (!wallBatches.has(texName)) wallBatches.set(texName, { positions: [], uvs: [], normals: [], colors: [] });
    return wallBatches.get(texName)!;
  }

  // ── Sector boundary lines for floor/ceiling ──
  const sectorLines = new Map<number, Array<[number, number, number, number]>>();

  for (const line of linedefs) {
    const va = vertexes[line.v1], vb = vertexes[line.v2];
    if (!va || !vb) continue;

    const doomLen = Math.hypot(vb.x - va.x, vb.y - va.y);
    const x1 = (va.x - cx) * S, z1 = -(va.y - cy) * S;
    const x2 = (vb.x - cx) * S, z2 = -(vb.y - cy) * S;

    // Normal (perpendicular to linedef direction in XZ plane)
    const dx = x2 - x1, dz = z2 - z1;
    const nLen = Math.hypot(dx, dz) || 1;
    const nx = dz / nLen, nz = -dx / nLen;

    const fSide = line.right >= 0 ? sidedefs[line.right] : null;
    const bSide = line.left >= 0 ? sidedefs[line.left] : null;
    const fSec = fSide ? sectors[fSide.sector] : null;
    const bSec = bSide ? sectors[bSide.sector] : null;
    const light = fSec ? Math.max(0.15, fSec.light / 255) : 0.5;

    // Collect sector boundaries
    if (fSide && fSide.sector < sectors.length) {
      if (!sectorLines.has(fSide.sector)) sectorLines.set(fSide.sector, []);
      sectorLines.get(fSide.sector)!.push([va.x, va.y, vb.x, vb.y]);
    }
    if (bSide && bSide.sector < sectors.length) {
      if (!sectorLines.has(bSide.sector)) sectorLines.set(bSide.sector, []);
      sectorLines.get(bSide.sector)!.push([va.x, va.y, vb.x, vb.y]);
    }

    function addWallQuad(yBotDoom: number, yTopDoom: number, texName: string | null | undefined, xoff: number, yoff: number, lightLevel: number) {
      const wallHDoom = yTopDoom - yBotDoom;
      if (wallHDoom <= 0) return;
      const yb = yBotDoom * S, yt = yTopDoom * S;

      const positions = [
        x1, yb, z1, x2, yb, z2, x2, yt, z2,
        x1, yb, z1, x2, yt, z2, x1, yt, z1,
      ];
      const normals = [
        nx, 0, nz, nx, 0, nz, nx, 0, nz,
        nx, 0, nz, nx, 0, nz, nx, 0, nz,
      ];

      const tex = texName && texName !== '-' ? texMgr?.getWallTexture(texName) : null;
      const texDef = texName && texName !== '-' ? texMgr?.getTextureDef(texName) : null;

      if (tex && texDef) {
        const tileU = doomLen / texDef.width;
        const tileV = wallHDoom / texDef.height;
        const ofsU = (xoff || 0) / texDef.width;
        const ofsV = (yoff || 0) / texDef.height;
        const uvs = [
          ofsU, ofsV + tileV,  ofsU + tileU, ofsV + tileV,  ofsU + tileU, ofsV,
          ofsU, ofsV + tileV,  ofsU + tileU, ofsV,           ofsU, ofsV,
        ];
        const batch = getWallBatch(texName!);
        batch.positions.push(...positions);
        batch.normals.push(...normals);
        batch.uvs.push(...uvs);
        for (let i = 0; i < 6; i++) batch.colors.push(lightLevel, lightLevel, lightLevel);
      } else {
        const r = lightLevel * 0.85 + 0.1;
        const g = lightLevel * 0.75 + 0.05;
        const b = lightLevel * 0.6;
        untextured.positions.push(...positions);
        untextured.normals.push(...normals);
        for (let i = 0; i < 6; i++) untextured.colors.push(r, g, b);
      }
    }

    if (!bSec) {
      // One-sided: full wall from floor to ceiling
      const floorH = fSec ? fSec.floorH : 0;
      const ceilH = fSec ? fSec.ceilH : 128;
      addWallQuad(floorH, ceilH, fSide?.middle, fSide?.xoff || 0, fSide?.yoff || 0, light);
    } else {
      // Two-sided: upper and lower wall sections
      const fF = fSec?.floorH ?? 0, fC = fSec?.ceilH ?? 128;
      const bF = bSec?.floorH ?? 0, bC = bSec?.ceilH ?? 128;
      const lightB = bSec ? Math.max(0.15, bSec.light / 255) : light;

      // Lower wall
      if (bF > fF) {
        let texName = fSide?.lower !== '-' ? fSide?.lower : null;
        if (!texName && bSide?.lower !== '-') texName = bSide?.lower;
        addWallQuad(fF, bF, texName, fSide?.xoff || 0, fSide?.yoff || 0, light);
      } else if (fF > bF) {
        let texName = bSide?.lower !== '-' ? bSide?.lower : null;
        if (!texName && fSide?.lower !== '-') texName = fSide?.lower;
        addWallQuad(bF, fF, texName, bSide?.xoff || 0, bSide?.yoff || 0, lightB);
      }
      // Upper wall
      if (bC < fC) {
        let texName = fSide?.upper !== '-' ? fSide?.upper : null;
        if (!texName && bSide?.upper !== '-') texName = bSide?.upper;
        addWallQuad(bC, fC, texName, fSide?.xoff || 0, fSide?.yoff || 0, light);
      } else if (fC < bC) {
        let texName = bSide?.upper !== '-' ? bSide?.upper : null;
        if (!texName && fSide?.upper !== '-') texName = fSide?.upper;
        addWallQuad(fC, bC, texName, bSide?.xoff || 0, bSide?.yoff || 0, lightB);
      }
    }
  }

  // Create textured wall meshes (one per texture)
  for (const [texName, batch] of wallBatches) {
    if (batch.positions.length === 0) continue;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(batch.positions, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(batch.normals, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(batch.uvs, 2));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(batch.colors, 3));
    const tex = texMgr?.getWallTexture(texName);
    const mat = new THREE.MeshPhongMaterial({
      map: tex, vertexColors: true, side: THREE.DoubleSide,
    });
    group.add(new THREE.Mesh(geo, mat));
  }

  // Create untextured wall mesh
  if (untextured.positions.length > 0) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(untextured.positions, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(untextured.normals, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(untextured.colors, 3));
    const mat = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
    group.add(new THREE.Mesh(geo, mat));
  }

  // ── Floor & Ceiling polygons (per sector, batched by flat texture) ──

  // Ear-clipping triangulation
  function triangulate2D(ring: Array<[number, number]>): number[] {
    const tris: number[] = [];
    if (ring.length < 3) return tris;
    let area = 0;
    for (let i = 0; i < ring.length; i++) {
      const j = (i + 1) % ring.length;
      area += ring[i][0] * ring[j][1] - ring[j][0] * ring[i][1];
    }
    const pts = area < 0 ? ring.slice().reverse() : ring.slice();
    const indices = pts.map((_: [number, number], i: number) => i);
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
        if (cross <= 0) continue;
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
        const [sx1, sy1, sx2, sy2] = segs[i];
        if (eq(sx1, endX) && eq(sy1, endY)) {
          ring.push([sx1, sy1]); endX = sx2; endY = sy2; used.add(i); found = true; break;
        } else if (eq(sx2, endX) && eq(sy2, endY)) {
          ring.push([sx2, sy2]); endX = sx1; endY = sy1; used.add(i); found = true; break;
        }
      }
      if (!found) break;
    }
    return ring.length >= 3 ? ring : null;
  }

  // Flat batching: Map<flatName, {positions, uvs, normals, colors}>
  interface FlatBatch { positions: number[]; uvs: number[]; normals: number[]; colors: number[]; }
  const floorBatches = new Map<string, FlatBatch>();
  const ceilBatches = new Map<string, FlatBatch>();
  const untexturedFloors: { positions: number[]; normals: number[]; colors: number[] } = { positions: [], normals: [], colors: [] };
  const untexturedCeils: { positions: number[]; normals: number[]; colors: number[] } = { positions: [], normals: [], colors: [] };

  function getFlatBatch(map: Map<string, FlatBatch>, name: string): FlatBatch {
    if (!map.has(name)) map.set(name, { positions: [], uvs: [], normals: [], colors: [] });
    return map.get(name)!;
  }

  for (const [secIdx, segs] of sectorLines.entries()) {
    if (secIdx < 0 || secIdx >= sectors.length) continue;
    const sec = sectors[secIdx];
    const floorH = sec.floorH * S;
    const ceilH = sec.ceilH * S;
    const light = Math.max(0.15, sec.light / 255);

    const ring = buildRing(segs);
    if (!ring || ring.length < 3) continue;

    // Transform ring to Three.js coords
    const ring3: Array<[number, number]> = ring.map(([px, py]) => [
      (px - cx) * S, -(py - cy) * S,
    ]);
    // Keep original doom coords for UV mapping
    const ringDoom: Array<[number, number]> = ring.map(([px, py]) => [px, py]);

    const triIndices = triangulate2D(ring3);

    for (let t = 0; t < triIndices.length; t += 3) {
      const ai = triIndices[t], bi = triIndices[t + 1], ci = triIndices[t + 2];
      const a = ring3[ai], b = ring3[bi], c = ring3[ci];
      const ad = ringDoom[ai], bd = ringDoom[bi], cd = ringDoom[ci];
      if (!a || !b || !c || !ad || !bd || !cd) continue;

      // Floor
      const floorFlat = sec.floorFlat;
      const floorTex = floorFlat && floorFlat !== '-' && floorFlat !== 'F_SKY1' ? texMgr?.getFlatTexture(floorFlat) : null;
      if (floorTex) {
        const batch = getFlatBatch(floorBatches, floorFlat);
        batch.positions.push(a[0], floorH, a[1], b[0], floorH, b[1], c[0], floorH, c[1]);
        batch.normals.push(0, 1, 0, 0, 1, 0, 0, 1, 0);
        // UV: tile every 64 doom units
        batch.uvs.push(ad[0] / 64, ad[1] / 64, bd[0] / 64, bd[1] / 64, cd[0] / 64, cd[1] / 64);
        for (let i = 0; i < 3; i++) batch.colors.push(light, light, light);
      } else {
        const r = light * 0.6 + 0.08, g = light * 0.55 + 0.05, b2 = light * 0.45;
        untexturedFloors.positions.push(a[0], floorH, a[1], b[0], floorH, b[1], c[0], floorH, c[1]);
        untexturedFloors.normals.push(0, 1, 0, 0, 1, 0, 0, 1, 0);
        untexturedFloors.colors.push(r, g, b2, r, g, b2, r, g, b2);
      }

      // Ceiling (skip sky ceilings)
      const ceilFlat = sec.ceilFlat;
      if (ceilFlat === 'F_SKY1') continue;
      const ceilTex = ceilFlat && ceilFlat !== '-' ? texMgr?.getFlatTexture(ceilFlat) : null;
      if (ceilTex) {
        const batch = getFlatBatch(ceilBatches, ceilFlat);
        // Reversed winding for ceiling (face down)
        batch.positions.push(c[0], ceilH, c[1], b[0], ceilH, b[1], a[0], ceilH, a[1]);
        batch.normals.push(0, -1, 0, 0, -1, 0, 0, -1, 0);
        batch.uvs.push(cd[0] / 64, cd[1] / 64, bd[0] / 64, bd[1] / 64, ad[0] / 64, ad[1] / 64);
        for (let i = 0; i < 3; i++) batch.colors.push(light, light, light);
      } else {
        const r = light * 0.5 + 0.15, g = light * 0.45 + 0.1, b2 = light * 0.55 + 0.05;
        untexturedCeils.positions.push(c[0], ceilH, c[1], b[0], ceilH, b[1], a[0], ceilH, a[1]);
        untexturedCeils.normals.push(0, -1, 0, 0, -1, 0, 0, -1, 0);
        untexturedCeils.colors.push(r, g, b2, r, g, b2, r, g, b2);
      }
    }
  }

  // Create textured floor meshes
  for (const [flatName, batch] of floorBatches) {
    if (batch.positions.length === 0) continue;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(batch.positions, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(batch.normals, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(batch.uvs, 2));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(batch.colors, 3));
    const tex = texMgr?.getFlatTexture(flatName);
    group.add(new THREE.Mesh(geo, new THREE.MeshPhongMaterial({ map: tex, vertexColors: true, side: THREE.DoubleSide })));
  }
  for (const [flatName, batch] of ceilBatches) {
    if (batch.positions.length === 0) continue;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(batch.positions, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(batch.normals, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(batch.uvs, 2));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(batch.colors, 3));
    const tex = texMgr?.getFlatTexture(flatName);
    group.add(new THREE.Mesh(geo, new THREE.MeshPhongMaterial({ map: tex, vertexColors: true, side: THREE.DoubleSide })));
  }

  // Create untextured floor/ceiling meshes
  function makeUntexturedMesh(data: { positions: number[]; normals: number[]; colors: number[] }) {
    if (data.positions.length === 0) return;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(data.positions, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(data.normals, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(data.colors, 3));
    group.add(new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide })));
  }
  makeUntexturedMesh(untexturedFloors);
  makeUntexturedMesh(untexturedCeils);

  // ── Things (monsters, items, decorations) ──
  for (const thing of things) {
    const tx = (thing.x - cx) * S;
    const tz = -(thing.y - cy) * S;

    // Skip player starts
    if (thing.type >= 1 && thing.type <= 4) continue;
    if (thing.type === 11) continue; // Deathmatch start

    // Find the floor height at this thing's position (approximate: use nearest sector)
    let thingFloor = 0;
    let minDist = Infinity;
    for (const line of linedefs) {
      const va = vertexes[line.v1], vb = vertexes[line.v2];
      if (!va || !vb) continue;
      const ldx = vb.x - va.x, ldy = vb.y - va.y;
      const lenSq = ldx * ldx + ldy * ldy;
      if (lenSq < 1) continue;
      let t = ((thing.x - va.x) * ldx + (thing.y - va.y) * ldy) / lenSq;
      t = Math.max(0, Math.min(1, t));
      const px = va.x + t * ldx, py = va.y + t * ldy;
      const d = Math.hypot(thing.x - px, thing.y - py);
      if (d < minDist) {
        const sIdx = line.right >= 0 ? sidedefs[line.right]?.sector : -1;
        if (sIdx >= 0 && sIdx < sectors.length) {
          minDist = d;
          thingFloor = sectors[sIdx].floorH;
        }
      }
    }
    const ty = thingFloor * S;

    const monsterType = THING_MONSTERS[thing.type];
    const itemType = THING_ITEMS[thing.type];
    const thingCategory = monsterType || itemType;

    // Try sprite texture first
    const spriteInfo = texMgr?.getSpriteTexture(thing.type);
    if (spriteInfo) {
      const sprW = spriteInfo.width * S;
      const sprH = spriteInfo.height * S;
      const planeGeo = new THREE.PlaneGeometry(sprW, sprH);
      const spriteMat = new THREE.MeshBasicMaterial({
        map: spriteInfo.texture,
        transparent: true,
        alphaTest: 0.1,
        side: THREE.DoubleSide,
      });
      const sprite = new THREE.Mesh(planeGeo, spriteMat);
      sprite.position.set(tx, ty + sprH / 2, tz);
      // Face towards camera (billboard setup done per-frame would be ideal,
      // but for a static viewer, face towards center)
      sprite.lookAt(0, ty + sprH / 2, 0);
      group.add(sprite);
      continue;
    }

    // Fallback: colored box
    if (thingCategory) {
      const color = THING_COLORS[thingCategory] ?? 0x888888;
      const size = monsterType ? (monsterType === 'boss' ? 1.5 : monsterType === 'tank' ? 1.2 : 0.8) : 0.5;
      const h = monsterType ? size * 1.5 : size;
      const boxGeo = new THREE.BoxGeometry(size * S * 64, h * S * 64, size * S * 64);
      const boxMat = new THREE.MeshPhongMaterial({
        color, emissive: color, emissiveIntensity: 0.3,
      });
      const box = new THREE.Mesh(boxGeo, boxMat);
      box.position.set(tx, ty + (h * S * 64) / 2, tz);
      group.add(box);
    }
  }

  // ── Wireframe overlay ──
  const wirePositions: number[] = [];
  for (const line of linedefs) {
    const va = vertexes[line.v1], vb = vertexes[line.v2];
    if (!va || !vb) continue;
    const x1 = (va.x - cx) * S, z1 = -(va.y - cy) * S;
    const x2 = (vb.x - cx) * S, z2 = -(vb.y - cy) * S;
    const fSide = line.right >= 0 ? sidedefs[line.right] : null;
    const fSec = fSide ? sectors[fSide.sector] : null;
    const fF = (fSec?.floorH ?? 0) * S, fC = (fSec?.ceilH ?? 128) * S;
    wirePositions.push(x1, fF, z1, x2, fF, z2);
    wirePositions.push(x1, fC, z1, x2, fC, z2);
  }
  if (wirePositions.length > 0) {
    const wGeo = new THREE.BufferGeometry();
    wGeo.setAttribute('position', new THREE.Float32BufferAttribute(wirePositions, 3));
    const wMat = new THREE.LineBasicMaterial({ color: 0x00ff88, opacity: 0.12, transparent: true });
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
  const wadLoaderRef = useRef<WADLoaderMV | null>(null);
  const texMgrRef = useRef<WADTextureManagerMV | null>(null);
  const animRef = useRef<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [status, setStatus] = useState('Drop a .gltf, .glb, .wad, or .vox file here, or click Open');
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
    const THREE = await loadTHREE();
    await clearModel();
    setStatus('Parsing WAD…');
    setLoading(true);

    try {
      const buf = await file.arrayBuffer();
      const loader = new WADLoaderMV();
      loader.load(buf);

      // Initialize texture manager
      const texMgr = new WADTextureManagerMV(loader, THREE);
      texMgr.init();

      wadLoaderRef.current = loader;
      texMgrRef.current = texMgr;

      const maps = loader.getMapNames();
      setWadMaps(maps);
      setFileType('wad');
      setLoading(false);

      if (maps.length > 0) {
        setCurrentMap(maps[0]);
      } else {
        setStatus(`WAD loaded: ${loader.directory.length} lumps. No maps found.`);
      }
    } catch (err) {
      setStatus(`Error: ${(err as Error).message || 'Invalid WAD file'}`);
      setLoading(false);
    }
  }, [clearModel]);

  // ── VOX load ───────────────────────────────────────────────────────────────
  const loadVOX = useCallback(async (file: File) => {
    const THREE = await loadTHREE();
    const { VOXLoader, VOXMesh } = await loadVOXLoader();
    await clearModel();

    const url = URL.createObjectURL(file);
    setStatus('Loading VOX model…');
    setLoading(true);

    const loader = new VOXLoader();
    loader.load(
      url,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (chunks: any) => {
        URL.revokeObjectURL(url);
        const group = new THREE.Group();

        for (const chunk of chunks) {
          const mesh = new VOXMesh(chunk);
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          group.add(mesh);
        }

        modelRef.current = group;
        (sceneRef.current as {add:(o:unknown)=>void}).add(group);

        if (cameraRef.current && controlsRef.current) {
          fitCameraToObject(cameraRef.current, group, controlsRef.current, THREE);
        }

        // Count voxels
        let tris = 0;
        group.traverse((o: unknown) => {
          const m = o as {isMesh?:boolean; geometry?:{index?:{count:number};attributes?:{position?:{count:number}}}};
          if (!m.isMesh || !m.geometry) return;
          tris += m.geometry.index
            ? m.geometry.index.count / 3
            : (m.geometry.attributes?.position?.count ?? 0) / 3;
        });
        setStatus(`${Math.round(tris).toLocaleString()} triangles · ${chunks.length} chunk${chunks.length !== 1 ? 's' : ''}`);
        setFileType('vox');
        setLoading(false);
      },
      undefined,
      (err: unknown) => {
        URL.revokeObjectURL(url);
        setStatus(`Error loading VOX: ${(err as Error).message ?? err}`);
        setLoading(false);
      }
    );
  }, [clearModel]);

  // ── Render WAD map ─────────────────────────────────────────────────────────
  const renderWadMap = useCallback(async (mapName: string) => {
    if (!wadLoaderRef.current || !sceneRef.current) return;
    const THREE = await loadTHREE();

    await clearModel();

    const group = buildWadMapGeometry(wadLoaderRef.current, texMgrRef.current, mapName, THREE);
    if (!group) {
      setStatus(`Could not parse map ${mapName}`);
      return;
    }

    modelRef.current = group;
    (sceneRef.current as {add:(o:unknown)=>void}).add(group);

    if (cameraRef.current && controlsRef.current) {
      fitCameraToObject(cameraRef.current, group, controlsRef.current, THREE);
    }

    const loader = wadLoaderRef.current;
    const texCount = texMgrRef.current ? Object.keys(texMgrRef.current.textureDefs).length : 0;
    const flatCount = texMgrRef.current ? Object.keys(texMgrRef.current.flatLumps).length : 0;
    setStatus(`Map: ${mapName} · ${loader.directory.length} lumps · ${texCount} wall textures · ${flatCount} flats`);
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
    } else if (name.endsWith('.vox')) {
      loadVOX(file);
    } else {
      setStatus(`Unsupported file type. Drop a .gltf, .glb, .wad, or .vox file.`);
    }
  }, [loadGLTF, loadWAD, loadVOX]);

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
        <input ref={fileInputRef} type="file" accept=".gltf,.glb,.wad,.vox" style={{ display: 'none' }} onChange={onFileInput} />
        <button style={BTN} onClick={() => fileInputRef.current?.click()}>📂 Open</button>

        {/* Separator */}
        <div style={{ width: 1, height: 18, background: '#444', margin: '0 2px' }} />

        {/* Camera mode */}
        <button style={cameraMode === 'orbit' ? BTN_ACTIVE : BTN} onClick={() => switchCameraMode('orbit')}>🌐 Orbit</button>
        <button style={cameraMode === 'fly'   ? BTN_ACTIVE : BTN} onClick={() => switchCameraMode('fly')}>✈️ Fly</button>

        {/* Separator */}
        <div style={{ width: 1, height: 18, background: '#444', margin: '0 2px' }} />

        {/* Tools */}
        {(fileType === 'gltf' || fileType === 'vox') && (
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
            <div style={{ fontSize: 24, color: '#aaccff' }}>Drop .gltf / .glb / .wad / .vox here</div>
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
            <div style={{ fontSize: 11, color: '#3a3a3a' }}>.gltf · .glb · .wad · .vox</div>
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
