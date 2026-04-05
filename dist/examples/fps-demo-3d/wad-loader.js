// WAD File Parser and Level Converter for Nova64
// Supports classic DOOM WAD format (IWAD and PWAD)

// Map DOOM thing types to Neo-Doom enemy types
const THING_MONSTERS = {
  3004: 'grunt',    // Former Human
  9:    'grunt',    // Former Sergeant
  3001: 'grunt',    // Imp
  3006: 'grunt',    // Lost Soul
  65:   'shooter',  // Heavy Weapon Dude (Chaingunner)
  3005: 'shooter',  // Cacodemon
  66:   'shooter',  // Revenant
  68:   'shooter',  // Arachnotron
  71:   'shooter',  // Pain Elemental
  84:   'shooter',  // Wolfenstein SS
  3002: 'tank',     // Demon (Pinky)
  58:   'tank',     // Spectre
  67:   'tank',     // Mancubus
  69:   'tank',     // Hell Knight
  3003: 'boss',     // Baron of Hell
  64:   'boss',     // Arch-Vile
  16:   'boss',     // Cyberdemon
  7:    'boss',     // Spider Mastermind
};

// Map DOOM item types to Neo-Doom pickup types
const THING_ITEMS = {
  2011: 'health', 2012: 'health', 2014: 'health',  // Stimpack, Medikit, Health Bonus
  2015: 'armor',  2018: 'armor',  2019: 'armor',   // Armor Bonus, Green Armor, Blue Armor
  2007: 'ammo',   2008: 'ammo',   2010: 'ammo',    // Clip, Shells, Rocket
  2047: 'ammo',   2048: 'ammo',   2049: 'ammo',    // Cell, Box of Ammo, Box of Shells
  2001: 'ammo',   2002: 'ammo',   2003: 'ammo',    // Shotgun, Chaingun, Rocket Launcher
  2004: 'ammo',   2006: 'ammo',                     // Plasma Rifle, BFG
};

export class WADLoader {
  constructor() {
    this.directory = [];
    this.buffer = null;
  }

  load(arrayBuffer) {
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

  getMapNames() {
    return this.directory
      .filter(e => /^(E\dM\d|MAP\d\d)$/.test(e.name))
      .map(e => e.name);
  }

  getMap(name) {
    const idx = this.directory.findIndex(e => e.name === name);
    if (idx < 0) return null;

    const lumps = {};
    for (let i = idx + 1; i < this.directory.length && i <= idx + 11; i++) {
      const e = this.directory[i];
      if (/^(E\dM\d|MAP\d\d)$/.test(e.name)) break;
      if (e.size > 0) lumps[e.name] = new DataView(this.buffer, e.filepos, e.size);
    }

    return {
      name,
      vertexes: readVerts(lumps.VERTEXES),
      linedefs: readLines(lumps.LINEDEFS),
      sidedefs: readSides(lumps.SIDEDEFS),
      sectors:  readSectors(lumps.SECTORS),
      things:   readThings(lumps.THINGS),
    };
  }
}

// ── Binary lump parsers ──

function readVerts(dv) {
  if (!dv) return [];
  const out = [];
  for (let i = 0; i < dv.byteLength; i += 4)
    out.push({ x: dv.getInt16(i, true), y: dv.getInt16(i + 2, true) });
  return out;
}

function readLines(dv) {
  if (!dv) return [];
  const out = [];
  for (let i = 0; i < dv.byteLength; i += 14)
    out.push({
      v1: dv.getUint16(i, true), v2: dv.getUint16(i + 2, true),
      flags: dv.getUint16(i + 4, true),
      right: dv.getInt16(i + 10, true), left: dv.getInt16(i + 12, true),
    });
  return out;
}

function readSides(dv) {
  if (!dv) return [];
  const out = [];
  for (let i = 0; i < dv.byteLength; i += 30)
    out.push({ sector: dv.getUint16(i + 28, true) });
  return out;
}

function readSectors(dv) {
  if (!dv) return [];
  const out = [];
  for (let i = 0; i < dv.byteLength; i += 26)
    out.push({
      floorH: dv.getInt16(i, true),
      ceilH:  dv.getInt16(i + 2, true),
      light:  dv.getInt16(i + 20, true),
    });
  return out;
}

function readThings(dv) {
  if (!dv) return [];
  const out = [];
  for (let i = 0; i < dv.byteLength; i += 10)
    out.push({
      x: dv.getInt16(i, true), y: dv.getInt16(i + 2, true),
      angle: dv.getUint16(i + 4, true), type: dv.getUint16(i + 6, true),
      flags: dv.getUint16(i + 8, true),
    });
  return out;
}

// ── Convert parsed DOOM map data to Nova64 level geometry ──

export function convertWADMap(map, scale) {
  if (!scale) scale = 1 / 40;
  const { vertexes, linedefs, sidedefs, sectors, things } = map;

  // Find map bounds for centering
  let mnX = Infinity, mxX = -Infinity, mnY = Infinity, mxY = -Infinity;
  for (const v of vertexes) {
    if (v.x < mnX) mnX = v.x; if (v.x > mxX) mxX = v.x;
    if (v.y < mnY) mnY = v.y; if (v.y > mxY) mxY = v.y;
  }
  const cx = (mnX + mxX) / 2, cy = (mnY + mxY) / 2;

  // Find lowest floor as baseline
  let baseFloor = 0;
  for (const s of sectors) if (s.floorH < baseFloor) baseFloor = s.floorH;

  const walls = [];
  const colSegs = [];

  for (const line of linedefs) {
    const va = vertexes[line.v1], vb = vertexes[line.v2];
    if (!va || !vb) continue;

    const x1 = (va.x - cx) * scale, z1 = (va.y - cy) * scale;
    const x2 = (vb.x - cx) * scale, z2 = (vb.y - cy) * scale;
    const len = Math.hypot(x2 - x1, z2 - z1);
    if (len < 0.05) continue;

    const mx = (x1 + x2) / 2, mz = (z1 + z2) / 2;
    const ang = -Math.atan2(z2 - z1, x2 - x1);

    // Determine sector info on each side
    let fSec = null, bSec = null;
    if (line.right >= 0 && sidedefs[line.right]) fSec = sectors[sidedefs[line.right].sector] || null;
    if (line.left  >= 0 && sidedefs[line.left])  bSec = sectors[sidedefs[line.left].sector]  || null;

    const fF = fSec ? (fSec.floorH - baseFloor) * scale : 0;
    const fC = fSec ? (fSec.ceilH  - baseFloor) * scale : 5;
    const bF = bSec ? (bSec.floorH - baseFloor) * scale : 0;
    const bC = bSec ? (bSec.ceilH  - baseFloor) * scale : 5;
    const light = fSec ? Math.max(0.25, fSec.light / 255) : 0.5;

    if (!bSec) {
      // One-sided: solid wall
      const h = fC - fF;
      if (h > 0.05) {
        walls.push({ x: mx, y: fF + h / 2, z: mz, len, h, ang, light });
        rasterSeg(colSegs, x1, z1, x2, z2, 1.0);
      }
    } else {
      // Two-sided: create geometry for height differences
      // Lower wall (step / platform edge)
      const loH = Math.abs(bF - fF);
      if (loH > 0.1) {
        const bot = Math.min(fF, bF);
        walls.push({ x: mx, y: bot + loH / 2, z: mz, len, h: loH, ang, light, step: true });
        if (loH > 1.0) rasterSeg(colSegs, x1, z1, x2, z2, 0.8);
      }
      // Upper wall (ceiling drop)
      const hiH = Math.abs(fC - bC);
      if (hiH > 0.1) {
        const bot = Math.min(fC, bC);
        walls.push({ x: mx, y: bot + hiH / 2, z: mz, len, h: hiH, ang, light, upper: true });
      }
      // Impassable two-sided line (blocking flag)
      if (line.flags & 1) rasterSeg(colSegs, x1, z1, x2, z2, 1.0);
    }
  }

  // Convert things to enemies, items, and player start
  let playerStart = { x: 0, z: 0, angle: Math.PI / 4 };
  const enemies = [], items = [];

  for (const t of things) {
    const tx = (t.x - cx) * scale, tz = (t.y - cy) * scale;
    const ta = ((t.angle - 90) * Math.PI) / 180;

    if (t.type === 1) {
      playerStart = { x: tx, z: tz, angle: ta };
    } else if (THING_MONSTERS[t.type]) {
      enemies.push({ x: tx, z: tz, type: THING_MONSTERS[t.type] });
    } else if (THING_ITEMS[t.type]) {
      items.push({ x: tx, z: tz, type: THING_ITEMS[t.type] });
    }
  }

  return { walls, colSegs, enemies, items, playerStart };
}

// Rasterize a line segment into collision points
function rasterSeg(out, x1, z1, x2, z2, r) {
  const len = Math.hypot(x2 - x1, z2 - z1);
  const steps = Math.max(1, Math.ceil(len / 1.5));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    out.push({ x: x1 + (x2 - x1) * t, z: z1 + (z2 - z1) * t, r });
  }
}
