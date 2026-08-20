import { normalizeRelative, dirname } from './paths.js';

/**
 * The filesystem contract host adapters implement (Electron → real disk,
 * VS Code → workspace.fs, os9-shell → IndexedDB). All paths are safe
 * workspace-relative paths. Methods are async.
 *
 * @typedef {Object} NovaFileSystem
 * @property {(path:string)=>Promise<string>} read
 * @property {(path:string, data:string)=>Promise<void>} write
 * @property {(path?:string)=>Promise<{path:string,type:'file'|'dir'}[]>} list  // recursive from root
 * @property {(path:string)=>Promise<void>} mkdir
 * @property {(path:string)=>Promise<void>} remove
 * @property {(from:string, to:string)=>Promise<void>} move
 * @property {(path:string)=>Promise<boolean>} exists
 */

/**
 * In-memory NovaFileSystem — used by tests and as a reference implementation.
 * Enforces the same relative-path safety host adapters must enforce.
 */
export class MemoryFileSystem {
  constructor(initial = {}) {
    /** @type {Map<string,string>} */
    this.files = new Map();
    /** @type {Set<string>} */
    this.dirs = new Set(['']);
    for (const [path, content] of Object.entries(initial)) {
      this.#writeSync(path, content);
    }
  }

  #ensureDirs(rel) {
    let d = dirname(rel);
    const chain = [];
    while (d) {
      chain.push(d);
      d = dirname(d);
    }
    for (const dir of chain) this.dirs.add(dir);
  }

  #writeSync(path, data) {
    const rel = normalizeRelative(path);
    this.files.set(rel, String(data));
    this.#ensureDirs(rel);
  }

  async read(path) {
    const rel = normalizeRelative(path);
    if (!this.files.has(rel)) throw new Error(`ENOENT: ${rel}`);
    return this.files.get(rel);
  }

  async write(path, data) {
    this.#writeSync(path, data);
  }

  async list() {
    const out = [];
    for (const dir of this.dirs) if (dir) out.push({ path: dir, type: 'dir' });
    for (const path of this.files.keys()) out.push({ path, type: 'file' });
    return out;
  }

  async mkdir(path) {
    const rel = normalizeRelative(path);
    this.dirs.add(rel);
    this.#ensureDirs(rel);
  }

  async remove(path) {
    const rel = normalizeRelative(path);
    this.files.delete(rel);
    this.dirs.delete(rel);
    for (const f of [...this.files.keys()]) {
      if (f.startsWith(rel + '/')) this.files.delete(f);
    }
  }

  async move(from, to) {
    const relFrom = normalizeRelative(from);
    const relTo = normalizeRelative(to);
    if (!this.files.has(relFrom)) throw new Error(`ENOENT: ${relFrom}`);
    this.files.set(relTo, this.files.get(relFrom));
    this.files.delete(relFrom);
    this.#ensureDirs(relTo);
  }

  async exists(path) {
    const rel = normalizeRelative(path);
    return this.files.has(rel) || this.dirs.has(rel);
  }
}
