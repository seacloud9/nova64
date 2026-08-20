import assert from 'node:assert/strict';
import {
  normalizeRelative,
  isSafeRelative,
  basename,
  dirname,
  extname,
  joinRelative,
  buildFileTree,
  Workspace,
  MemoryFileSystem,
} from '../index.js';

let n = 0;
const t = (name, fn) => {
  fn();
  n++;
  console.log(`✅ ${name}`);
};

// ── path safety ─────────────────────────────────────────────────────────────
t('normalizeRelative cleans . and slashes', () => {
  assert.equal(normalizeRelative('a/./b//c'), 'a/b/c');
  assert.equal(normalizeRelative('a/b/../c'), 'a/c');
  assert.equal(normalizeRelative(''), '');
});
t('normalizeRelative rejects traversal above root', () => {
  assert.throws(() => normalizeRelative('../secret'));
  assert.throws(() => normalizeRelative('a/../../b'));
});
t('normalizeRelative rejects absolute + drive + UNC', () => {
  assert.throws(() => normalizeRelative('/etc/passwd'));
  assert.throws(() => normalizeRelative('C:/Windows'));
  assert.throws(() => normalizeRelative('\\\\server\\share'));
});
t('isSafeRelative reflects the guard', () => {
  assert.equal(isSafeRelative('a/b.js'), true);
  assert.equal(isSafeRelative('../x'), false);
});
t('basename/dirname/extname', () => {
  assert.equal(basename('a/b/c.js'), 'c.js');
  assert.equal(dirname('a/b/c.js'), 'a/b');
  assert.equal(extname('a/b/c.js'), '.js');
  assert.equal(extname('a/b/noext'), '');
  assert.equal(joinRelative('a', 'b', 'c.js'), 'a/b/c.js');
});

// ── file tree ───────────────────────────────────────────────────────────────
t('buildFileTree nests + sorts dirs before files', () => {
  const tree = buildFileTree([
    { path: 'z.js', type: 'file' },
    { path: 'src/main.js', type: 'file' },
    { path: 'src/api/a.js', type: 'file' },
    { path: 'README.md', type: 'file' },
  ]);
  assert.equal(tree.type, 'dir');
  // dirs (src) before files (README.md, z.js)
  assert.deepEqual(tree.children.map(c => c.name), ['src', 'README.md', 'z.js']);
  const src = tree.children[0];
  assert.deepEqual(src.children.map(c => c.name), ['api', 'main.js']);
});

// ── workspace tabs + dirty ──────────────────────────────────────────────────
t('openTab creates a clean tab', () => {
  const ws = new Workspace({ root: '/tmp/proj' });
  ws.openTab('code.js', 'init()');
  assert.equal(ws.activePath, 'code.js');
  assert.equal(ws.isDirty('code.js'), false);
  assert.equal(ws.name, 'proj');
});
t('editing marks dirty; markSaved clears it', () => {
  const ws = new Workspace({ root: '/p' });
  ws.openTab('a.js', 'x');
  ws.setContent('a.js', 'x2');
  assert.equal(ws.isDirty('a.js'), true);
  assert.equal(ws.anyDirty(), true);
  ws.markSaved('a.js');
  assert.equal(ws.isDirty('a.js'), false);
  assert.equal(ws.anyDirty(), false);
});
t('closeTab refuses to drop a dirty tab unless forced', () => {
  const ws = new Workspace({ root: '/p' });
  ws.openTab('a.js', 'x');
  ws.setContent('a.js', 'y');
  assert.equal(ws.closeTab('a.js'), false);
  assert.equal(ws.tabs.has('a.js'), true);
  assert.equal(ws.closeTab('a.js', { force: true }), true);
  assert.equal(ws.tabs.has('a.js'), false);
});
t('active tab falls back when the active one closes', () => {
  const ws = new Workspace({ root: '/p' });
  ws.openTab('a.js', '1');
  ws.openTab('b.js', '2');
  assert.equal(ws.activePath, 'b.js');
  ws.closeTab('b.js', { force: true });
  assert.equal(ws.activePath, 'a.js');
});
t('listTabs reports order/dirty/active', () => {
  const ws = new Workspace({ root: '/p' });
  ws.openTab('a.js', '1');
  ws.openTab('b.js', '2');
  ws.setContent('a.js', '1!');
  const tabs = ws.listTabs();
  assert.deepEqual(tabs.map(x => x.path), ['a.js', 'b.js']);
  assert.equal(tabs.find(x => x.path === 'a.js').dirty, true);
  assert.equal(tabs.find(x => x.path === 'b.js').active, true);
});
t('serialize captures session', () => {
  const ws = new Workspace({ root: '/p' });
  ws.openTab('a.js', '1');
  ws.openTab('b.js', '2');
  assert.deepEqual(ws.serialize(), { root: '/p', open: ['a.js', 'b.js'], active: 'b.js' });
});

// ── memory filesystem ───────────────────────────────────────────────────────
t('MemoryFileSystem round-trips + enforces path safety', async () => {
  const fs = new MemoryFileSystem({ 'src/a.js': 'A' });
  assert.equal(await fs.read('src/a.js'), 'A');
  await fs.write('src/b.js', 'B');
  assert.equal(await fs.exists('src/b.js'), true);
  await fs.move('src/b.js', 'src/c.js');
  assert.equal(await fs.exists('src/b.js'), false);
  assert.equal(await fs.read('src/c.js'), 'B');
  const list = await fs.list();
  assert.ok(list.some(e => e.path === 'src' && e.type === 'dir'));
  await assert.rejects(() => fs.read('../escape'));
});

console.log(`\n📊 workspace-core: ${n} tests passed`);
