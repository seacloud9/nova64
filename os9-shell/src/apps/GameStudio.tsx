import { useState, useEffect, useRef, useCallback } from 'react';
import { filesystem } from '../os/filesystem';
import { processCartCode, getNovaBaseUrl } from '../utils/cartCode';
import { EditorView, basicSetup } from 'codemirror';
import { EditorState, Compartment } from '@codemirror/state';
import { javascript } from '@codemirror/lang-javascript';
import { oneDark } from '@codemirror/theme-one-dark';

interface DemoWithPath { name: string; path: string; }
interface DemoWithCode { name: string; code: string; }
type DemoExample = DemoWithPath | DemoWithCode;

const DEMO_EXAMPLES: Record<string, DemoExample> = {
  'hello-3d':           { name: '👋 Hello 3D World',    path: '/examples/hello-3d/code.js' },
  'fzero':              { name: '🏎️ F-ZERO Racing',     path: '/examples/f-zero-nova-3d/code.js' },
  'knight':             { name: '⚔️ Knight Platformer', path: '/examples/strider-demo-3d/code.js' },
  'space-combat':       { name: '🚀 Star Fox Nova',     path: '/examples/star-fox-nova-3d/code.js' },
  'space-harrier':      { name: '🛸 Space Harrier',     path: '/examples/space-harrier-3d/code.js' },
  'cyberpunk':          { name: '🌆 Cyberpunk City',    path: '/examples/cyberpunk-city-3d/code.js' },
  'crystal-cathedral':  { name: '🏛️ Crystal Cathedral', path: '/examples/crystal-cathedral-3d/code.js' },
  'mystical-realm':     { name: '🧙 Mystical Realm',    path: '/examples/mystical-realm-3d/code.js' },
  'fps-demo':           { name: '🔫 FPS Demo',          path: '/examples/fps-demo-3d/code.js' },
  'physics-demo':       { name: '⚛️ Physics Demo',      path: '/examples/physics-demo-3d/code.js' },
  'minecraft':          { name: '⛏️ Voxel Realm',       path: '/examples/minecraft-demo/code.js' },
  'voxel-terrain':      { name: '🗻 Voxel Terrain',     path: '/examples/voxel-terrain/code.js' },
  'voxel-creative':     { name: '🏗️ Voxel Creative',   path: '/examples/voxel-creative/code.js' },
  'dungeon-crawler':    { name: '🏰 Dungeon Crawler',   path: '/examples/dungeon-crawler-3d/code.js' },
  'wizardry':           { name: '🧙 Wizardry',          path: '/examples/wizardry-3d/code.js' },
  'nature':             { name: '🌿 Nature Explorer',   path: '/examples/nature-explorer-3d/code.js' },
  'super-plumber':      { name: '🍄 Super Plumber 64',  path: '/examples/super-plumber-64/code.js' },
  'demoscene':          { name: '✨ Demoscene',         path: '/examples/demoscene/code.js' },
  'shooter':            { name: '🎯 Space Shooter',     path: '/examples/shooter-demo-3d/code.js' },
  'audio-lab':          { name: '🎵 Audio Lab',         path: '/examples/audio-lab/code.js' },
  'boids':              { name: '🐦 Boids Flocking',    path: '/examples/boids-flocking/code.js' },
  'particles':          { name: '✨ Particles',         path: '/examples/particles-demo/code.js' },
  'pbr-showcase':       { name: '🌟 PBR Materials',     path: '/examples/pbr-showcase/code.js' },
  'adventure-comic':    { name: '📖 Adventure Comic',   path: '/examples/adventure-comic-3d/code.js' },
  'wing-commander':     { name: '🚀 Wing Commander',    path: '/examples/wing-commander-space/code.js' },
};

const STARTER_CODE = `// 🎮 Nova64 Cart
// ─────────────────────────────────────
// init()   → runs once on startup
// update() → runs every frame (dt = seconds)
// draw()   → runs every frame after update

let cube;

export function init() {
  cube = createCube(2, 0x0088ff, [0, 0, -5]);
  setCameraPosition(0, 3, 8);
  setCameraTarget(0, 0, 0);
  setAmbientLight(0xffffff, 0.5);
  createPointLight(0xffffff, 1.5, [3, 5, 3]);
}

export function update(dt) {
  rotateMesh(cube, 0, dt * 0.8, 0);
  if (key('ArrowLeft'))  rotateMesh(cube, 0, -dt * 2, 0);
  if (key('ArrowRight')) rotateMesh(cube, 0,  dt * 2, 0);
}

export function draw() {
  print('Hello, Nova64! \uD83C\uDFAE', 10, 10, 0xffffff);
  print('\u2190 \u2192 to spin', 10, 26, 0x888888);
}
`;

// ── localStorage helpers ──────────────────────────────────────────────────
const LS_PREFIX = 'nova64_cart_';
const LS_LIST   = 'nova64_cart_list';

function lsLoad(name: string): string | null {
  try { return localStorage.getItem(LS_PREFIX + name); } catch { return null; }
}

function lsSave(name: string, code: string) {
  try {
    localStorage.setItem(LS_PREFIX + name, code);
    const list: string[] = JSON.parse(localStorage.getItem(LS_LIST) || '[]');
    if (!list.includes(name)) {
      localStorage.setItem(LS_LIST, JSON.stringify([...list, name]));
    }
  } catch { /* storage full */ }
}

function lsListCarts(): string[] {
  try { return JSON.parse(localStorage.getItem(LS_LIST) || '[]'); } catch { return []; }
}

// ── Component ─────────────────────────────────────────────────────────────
export function GameStudio() {
  const [code, setCode]           = useState(() => lsLoad('my-game.js') ?? STARTER_CODE);
  const [fileName, setFileName]   = useState('my-game.js');
  const [output, setOutput]       = useState<string[]>([]);
  const [isSaved, setIsSaved]     = useState(false);
  const [showDemos, setShowDemos] = useState(false);
  const [showMyCarts, setShowMyCarts] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [isDemo, setIsDemo]       = useState(false);
  const [demoName, setDemoName]   = useState<string | null>(null);
  const [savedCarts, setSavedCarts] = useState<string[]>(() => lsListCarts());

  // Editor refs
  const editorRef           = useRef<HTMLDivElement | null>(null);
  const editorViewRef       = useRef<EditorView | null>(null);
  const readOnlyCompartment = useRef(new Compartment());

  // Nova64 iframe refs
  const iframeRef       = useRef<HTMLIFrameElement | null>(null);
  const iframeReadyRef  = useRef(false);
  const pendingCodeRef  = useRef<string | null>(null);

  // Toggle editor read-only without recreating it
  const setEditorReadOnly = useCallback((ro: boolean) => {
    editorViewRef.current?.dispatch({
      effects: readOnlyCompartment.current.reconfigure(EditorState.readOnly.of(ro)),
    });
  }, []);

  // ── Initialize CodeMirror (once) ──────────────────────────────────────
  useEffect(() => {
    if (!editorRef.current || editorViewRef.current) return;
    const view = new EditorView({
      state: EditorState.create({
        doc: code,
        extensions: [
          basicSetup,
          javascript(),
          oneDark,
          readOnlyCompartment.current.of(EditorState.readOnly.of(false)),
          EditorView.updateListener.of(u => {
            if (u.docChanged) {
              setCode(u.state.doc.toString());
              setIsSaved(false);
            }
          }),
        ],
      }),
      parent: editorRef.current,
    });
    editorViewRef.current = view;
    return () => { view.destroy(); editorViewRef.current = null; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync editor when code changes externally (demo load / new game)
  useEffect(() => {
    const view = editorViewRef.current;
    if (view && view.state.doc.toString() !== code) {
      view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: code } });
    }
  }, [code]);

  // Auto-save to localStorage (1 s debounce, non-demo only)
  useEffect(() => {
    if (isDemo) return;
    const t = setTimeout(() => {
      lsSave(fileName, code);
      setSavedCarts(lsListCarts());
    }, 1000);
    return () => clearTimeout(t);
  }, [code, fileName, isDemo]);

  // ── Nova64 iframe message handler ─────────────────────────────────────
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'EXECUTE_READY') {
        iframeReadyRef.current = true;
        if (pendingCodeRef.current !== null && iframeRef.current?.contentWindow) {
          iframeRef.current.contentWindow.postMessage(
            { type: 'EXECUTE_CODE', code: pendingCodeRef.current },
            getNovaBaseUrl()
          );
          setOutput(prev => [...prev, '\uD83D\uDD79\uFE0F Running your code\u2026']);
          pendingCodeRef.current = null;
        }
      } else if (e.data?.type === 'EXECUTE_SUCCESS') {
        setOutput(prev => [...prev, '\u2705 Game is running!']);
      } else if (e.data?.type === 'EXECUTE_ERROR') {
        setOutput(prev => [...prev, `\u274C Runtime error: ${e.data.error}`]);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  // iframe onLoad resets ready flag; EXECUTE_READY from main.js re-arms it
  const handleIframeLoad = useCallback(() => { iframeReadyRef.current = false; }, []);

  // ── Actions ───────────────────────────────────────────────────────────
  const saveGame = async () => {
    try {
      lsSave(fileName, code);
      await filesystem.write('/Games/' + fileName, code);
      setSavedCarts(lsListCarts());
      setIsSaved(true);
      setOutput(prev => [...prev, `\u2705 Saved: ${fileName}`]);
      setTimeout(() => setIsSaved(false), 2000);
    } catch (err) {
      setOutput(prev => [...prev, `\u274C Error saving: ${err}`]);
    }
  };

  const runGame = () => {
    const processed = processCartCode(code);
    pendingCodeRef.current = processed;
    if (iframeReadyRef.current && iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        { type: 'EXECUTE_CODE', code: processed }, getNovaBaseUrl()
      );
      setOutput(['\uD83D\uDD79\uFE0F Running your code\u2026']);
      pendingCodeRef.current = null;
    } else if (!showPreview) {
      setShowPreview(true);
      setOutput(['\uD83D\uDD04 Loading Nova64 runtime\u2026']);
    } else {
      setOutput(['\u23F3 Runtime loading, code queued\u2026']);
    }
  };

  const loadDemo = async (key: string) => {
    const demo = DEMO_EXAMPLES[key];
    if (!demo) return;
    setOutput([`\uD83D\uDCDA Loading: ${demo.name}\u2026`]);
    setShowDemos(false);
    try {
      let gameCode: string;
      if ('code' in demo) {
        gameCode = (demo as DemoWithCode).code;
      } else {
        const res = await fetch((demo as DemoWithPath).path);
        if (!res.ok) throw new Error(res.statusText);
        gameCode = await res.text();
      }
      setCode(gameCode);
      setFileName(`${key}.js`);
      setIsDemo(true);
      setDemoName(demo.name);
      setEditorReadOnly(true);
      setOutput([`\uD83D\uDCDA Demo loaded: ${demo.name}`, '\uD83D\uDCD6 Read-only \u2014 click \uD83D\uDD00 Fork to edit']);
    } catch (err) {
      setOutput([`\u274C Failed to load demo: ${(err as Error).message}`]);
    }
  };

  const loadSavedCart = (name: string) => {
    const saved = lsLoad(name);
    if (!saved) return;
    setCode(saved);
    setFileName(name);
    setIsDemo(false);
    setDemoName(null);
    setEditorReadOnly(false);
    setShowMyCarts(false);
    setOutput([`\uD83D\uDCC2 Loaded: ${name}`]);
  };

  const forkDemo = () => {
    const base = fileName.startsWith('fork-') ? fileName : `fork-${fileName}`;
    setFileName(base);
    setIsDemo(false);
    setDemoName(null);
    setEditorReadOnly(false);
    setOutput([`\uD83D\uDD00 Forked \u201C${demoName ?? fileName}\u201D \u2192 \u201C${base}\u201D (now editable)`]);
  };

  const newGame = () => {
    if (!confirm('Create a new game? Unsaved changes will be lost.')) return;
    const saved = lsLoad('my-game.js');
    setCode(saved ?? STARTER_CODE);
    setFileName('my-game.js');
    setIsDemo(false);
    setDemoName(null);
    setEditorReadOnly(false);
    setOutput([]);
  };

  const exportCart = () => {
    const blob = new Blob([code], { type: 'text/javascript' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = fileName.endsWith('.js') ? fileName : `${fileName}.js`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setOutput(prev => [...prev, `\uD83D\uDCE4 Exported: ${a.download}`]);
  };

  // ── Shared button style helpers ───────────────────────────────────────
  const btn = (bg: string, extra?: React.CSSProperties): React.CSSProperties => ({
    padding: '6px 14px',
    background: bg,
    border: '2px solid #000',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: 12,
    color: '#FFF',
    fontWeight: 'bold',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2), 0 2px 4px rgba(0,0,0,0.3)',
    ...extra,
  });

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#1E1E1E' }}>
      <style>{`
        .cm-editor { height: 100%; font-size: 13px; }
        .cm-scroller { overflow: auto; font-family: Monaco, Menlo, "Courier New", monospace; }
        .cm-content { padding: 12px; }
        .cm-gutters { background: #1E1E1E; border-right: 1px solid #333; }
        .nova-readonly .cm-editor { opacity: 0.92; cursor: default; }
        .nova-readonly .cm-cursor { display: none !important; }
      `}</style>

      {/* ── Toolbar ──────────────────────────────────────────────────────── */}
      <div style={{
        padding: '10px 14px',
        background: 'linear-gradient(180deg, #4A4A4A 0%, #2A2A2A 100%)',
        borderBottom: '3px solid #000',
        display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1), 0 4px 8px rgba(0,0,0,0.5)',
      }}>
        <span style={{ fontSize: 18, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }}>💻</span>

        {/* Filename / read-only badge */}
        {isDemo ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{
              padding: '6px 12px', background: '#1A1A1A', border: '2px solid #555',
              borderRadius: 6, fontFamily: 'Monaco, monospace', fontSize: 13,
              color: '#AAAAAA', maxWidth: 200, overflow: 'hidden',
              textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{demoName ?? fileName}</span>
            <span style={{
              padding: '3px 9px', background: 'rgba(255,170,0,0.15)',
              border: '1px solid #FF8800', borderRadius: 4,
              fontSize: 11, color: '#FFAA00', fontWeight: 'bold',
            }}>📖 READ ONLY</span>
          </div>
        ) : (
          <input
            type="text"
            value={fileName}
            onChange={e => setFileName(e.target.value)}
            style={{
              padding: '6px 12px', border: '2px solid #000', borderRadius: 6,
              fontFamily: 'Monaco, monospace', width: 200,
              background: 'linear-gradient(180deg, #FFF 0%, #F0F0F0 100%)',
              boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)',
              fontSize: 13, fontWeight: 'bold',
            }}
          />
        )}

        <div style={{ flex: 1 }} />

        {/* Demos */}
        <button
          onClick={() => { setShowDemos(p => !p); setShowMyCarts(false); }}
          style={btn('linear-gradient(180deg, #9B59B6 0%, #8E44AD 100%)')}
        >📚 Demos</button>

        {/* My Carts */}
        <button
          onClick={() => { setShowMyCarts(p => !p); setShowDemos(false); }}
          style={btn('linear-gradient(180deg, #2E86AB 0%, #1B6CA8 100%)')}
        >📂 My Carts{savedCarts.length > 0 ? ` (${savedCarts.length})` : ''}</button>

        {/* Fork — demo mode only */}
        {isDemo && (
          <button onClick={forkDemo}
            style={btn('linear-gradient(180deg, #F39C12 0%, #D68910 100%)')}
          >🔀 Fork</button>
        )}

        {/* New */}
        <button onClick={newGame}
          style={btn('linear-gradient(180deg, #606060 0%, #404040 100%)')}
        >📄 New</button>

        {/* Save — hidden in demo mode */}
        {!isDemo && (
          <button onClick={saveGame}
            style={btn(isSaved
              ? 'linear-gradient(180deg, #90EE90 0%, #60DD60 100%)'
              : 'linear-gradient(180deg, #6FA3EF 0%, #4A7FD0 100%)')}
          >💾 {isSaved ? 'Saved!' : 'Save'}</button>
        )}

        {/* Export */}
        <button onClick={exportCart}
          style={btn('linear-gradient(180deg, #27AE60 0%, #1E8449 100%)')}
        >📤 Export</button>

        {/* Run */}
        <button onClick={runGame} style={{
          padding: '8px 20px',
          background: 'linear-gradient(135deg, #FF6B6B 0%, #FF5252 100%)',
          border: '3px solid #000', borderRadius: 8, cursor: 'pointer',
          fontSize: 13, fontWeight: 'bold', color: '#FFF',
          textShadow: '0 2px 4px rgba(0,0,0,0.4)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.4), 0 3px 6px rgba(0,0,0,0.4)',
        }}>▶️ RUN</button>
      </div>

      {/* ── Demo Selector ─────────────────────────────────────────────────── */}
      {showDemos && (
        <div style={{
          background: 'linear-gradient(180deg, #2A2A2A 0%, #1A1A1A 100%)',
          borderBottom: '2px solid #000', padding: '10px 14px',
          display: 'flex', flexWrap: 'wrap', gap: 8,
          maxHeight: 160, overflowY: 'auto',
          boxShadow: 'inset 0 4px 8px rgba(0,0,0,0.4)',
        }}>
          {Object.entries(DEMO_EXAMPLES).map(([key, demo]) => (
            <button key={key} onClick={() => loadDemo(key)} style={{
              padding: '7px 13px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              border: '2px solid #000', borderRadius: 8, cursor: 'pointer',
              fontSize: 12, fontWeight: 'bold', color: '#FFF',
              textShadow: '0 1px 2px rgba(0,0,0,0.4)',
              boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
            }}>{demo.name}</button>
          ))}
        </div>
      )}

      {/* ── My Carts Panel ───────────────────────────────────────────────── */}
      {showMyCarts && (
        <div style={{
          background: 'linear-gradient(180deg, #1A2A3A 0%, #0A1520 100%)',
          borderBottom: '2px solid #000', padding: '10px 14px',
          maxHeight: 140, overflowY: 'auto',
          boxShadow: 'inset 0 4px 8px rgba(0,0,0,0.4)',
        }}>
          {savedCarts.length === 0 ? (
            <span style={{ color: '#445566', fontSize: 12, fontStyle: 'italic' }}>
              No saved carts yet — write some code and it auto-saves!
            </span>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {savedCarts.map(name => (
                <button key={name} onClick={() => loadSavedCart(name)} style={{
                  padding: '7px 13px',
                  background: name === fileName && !isDemo
                    ? 'linear-gradient(135deg, #00AAAA 0%, #007788 100%)'
                    : 'linear-gradient(135deg, #2E86AB 0%, #1B5E82 100%)',
                  border: '2px solid #000', borderRadius: 8, cursor: 'pointer',
                  fontSize: 12, fontWeight: 'bold', color: '#FFF',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                }}>📝 {name}</button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Main Area: Editor + Right Panel ─────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Code editor */}
        <div
          ref={editorRef}
          className={isDemo ? 'nova-readonly' : ''}
          style={{ flex: 1, overflow: 'auto', background: '#1E1E1E' }}
        />

        {/* Right panel */}
        <div style={{
          width: 480, borderLeft: '3px solid #000',
          background: 'linear-gradient(180deg, #1a1a1a 0%, #0a0a0a 100%)',
          display: 'flex', flexDirection: 'column',
          boxShadow: 'inset 4px 0 8px rgba(0,0,0,0.5)',
        }}>
          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '2px solid #000', background: '#0a0a0a' }}>
            {(['PREVIEW', 'CONSOLE'] as const).map(tab => {
              const active = tab === 'PREVIEW' ? showPreview : !showPreview;
              const color  = tab === 'PREVIEW' ? '#00FFFF' : '#00FF00';
              return (
                <button key={tab}
                  onClick={() => setShowPreview(tab === 'PREVIEW')}
                  style={{
                    flex: 1, padding: '10px 16px',
                    background: active ? 'linear-gradient(180deg, #2A2A2A 0%, #1A1A1A 100%)' : 'transparent',
                    border: 'none',
                    borderRight: tab === 'PREVIEW' ? '1px solid #000' : 'none',
                    borderBottom: active ? `3px solid ${color}` : 'none',
                    color: active ? color : '#666',
                    fontSize: 12, fontWeight: 'bold', cursor: 'pointer',
                    textShadow: active ? `0 0 10px ${color}` : 'none',
                  }}>
                  {tab === 'PREVIEW' ? '🎮 PREVIEW' : '📟 CONSOLE'}
                </button>
              );
            })}
          </div>

          {/* Content */}
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {showPreview ? (
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <iframe
                  ref={iframeRef}
                  src={`${getNovaBaseUrl()}/console.html?studio=1`}
                  onLoad={handleIframeLoad}
                  style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
                  allow="fullscreen"
                  title="Nova64 Preview"
                />
              </div>
            ) : (
              <div style={{
                flex: 1, color: '#00FF00',
                fontFamily: 'Monaco, Menlo, monospace',
                fontSize: 12, padding: 16, overflow: 'auto',
              }}>
                {output.length === 0 ? (
                  <div style={{ color: '#006600' }}>
                    <div style={{ marginBottom: 10, fontStyle: 'italic' }}>&gt; Game Studio Ready</div>
                    {[
                      ['📚 Demos', 'Browse example carts (read-only, runnable)'],
                      ['🔀 Fork',  'Copy a demo into your own editable cart'],
                      ['📂 My Carts', 'Load previously saved carts'],
                      ['📤 Export', 'Download your cart as a .js file'],
                      ['▶️ RUN', 'Preview in the Nova64 runtime'],
                    ].map(([cmd, desc]) => (
                      <div key={cmd} style={{ marginBottom: 6, color: '#00AAAA' }}>
                        💡 <strong>{cmd}</strong> — {desc}
                      </div>
                    ))}
                  </div>
                ) : (
                  output.map((line, i) => (
                    <div key={i} style={{
                      marginBottom: 5, paddingLeft: 8, borderLeft: '2px solid #003300',
                    }}>
                      <span style={{ color: '#00AA00', marginRight: 8 }}>&gt;</span>
                      {line}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Status Bar ───────────────────────────────────────────────────── */}
      <div style={{
        padding: '7px 14px',
        background: 'linear-gradient(180deg, #4A4A4A 0%, #2A2A2A 100%)',
        borderTop: '3px solid #000',
        fontSize: 11, display: 'flex', justifyContent: 'space-between',
        color: '#CCCCCC', fontWeight: 'bold',
        boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.5)',
      }}>
        <span style={{ color: '#00DD00' }}>⚡ nova64 Game Studio v2.0</span>
        <span>
          📝 {code.split('\n').length} lines &nbsp;|&nbsp;
          🔤 {code.length} chars &nbsp;|&nbsp;
          {isDemo
            ? <span style={{ color: '#FFAA00' }}>📖 Demo (read-only)</span>
            : isSaved
              ? <span style={{ color: '#00DD00' }}>✓ Saved</span>
              : <span style={{ color: '#FFAA00' }}>● Auto-saving…</span>
          }
        </span>
      </div>
    </div>
  );
}
