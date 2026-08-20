import { segments } from './paths.js';

/**
 * Build a sorted tree from a flat list of entries.
 * @param {{path: string, type?: 'file'|'dir'}[]} entries
 * @returns {TreeNode} root node with children
 *
 * TreeNode: { name, path, type: 'dir'|'file', children? }
 * Directories sort before files; each group is sorted case-insensitively.
 */
export function buildFileTree(entries) {
  const root = { name: '', path: '', type: 'dir', children: [] };
  const dirIndex = new Map([['', root]]);

  const ensureDir = relPath => {
    if (dirIndex.has(relPath)) return dirIndex.get(relPath);
    const segs = segments(relPath);
    let parentPath = '';
    let node = root;
    for (let i = 0; i < segs.length; i++) {
      const curPath = segs.slice(0, i + 1).join('/');
      let child = dirIndex.get(curPath);
      if (!child) {
        child = { name: segs[i], path: curPath, type: 'dir', children: [] };
        node.children.push(child);
        dirIndex.set(curPath, child);
      }
      node = child;
      parentPath = curPath;
    }
    void parentPath;
    return node;
  };

  for (const entry of entries || []) {
    const segs = segments(entry.path);
    if (segs.length === 0) continue;
    if (entry.type === 'dir') {
      ensureDir(entry.path);
      continue;
    }
    const parent = ensureDir(segs.slice(0, -1).join('/'));
    parent.children.push({ name: segs[segs.length - 1], path: entry.path, type: 'file' });
  }

  sortTree(root);
  return root;
}

function sortTree(node) {
  if (!node.children) return;
  node.children.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
  });
  for (const child of node.children) sortTree(child);
}
