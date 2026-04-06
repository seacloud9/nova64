import { useState } from 'react';

const DOC_PAGES = [
  { label: 'API Reference', path: '/docs/api.html' },
  { label: '3D API', path: '/docs/api-3d.html' },
  { label: 'Effects', path: '/docs/api-effects.html' },
  { label: 'Skybox', path: '/docs/api-skybox.html' },
  { label: 'Sprites', path: '/docs/api-sprites.html' },
  { label: 'Voxel', path: '/docs/api-voxel.html' },
  { label: 'Audio', path: '/docs/audio.html' },
  { label: 'Input', path: '/docs/input.html' },
  { label: 'Physics', path: '/docs/physics.html' },
  { label: 'Collision', path: '/docs/collision.html' },
  { label: 'Font', path: '/docs/font.html' },
  { label: 'Storage', path: '/docs/storage.html' },
  { label: 'UI', path: '/docs/ui.html' },
  { label: 'Console', path: '/docs/console.html' },
  { label: 'Editor', path: '/docs/editor.html' },
  { label: 'Screens', path: '/docs/screens.html' },
  { label: 'Assets', path: '/docs/assets.html' },
  { label: 'Framebuffer', path: '/docs/framebuffer.html' },
  { label: 'GPU Systems', path: '/docs/gpu-systems.html' },
  { label: 'Text Input', path: '/docs/textinput.html' },
  { label: 'Fullscreen', path: '/docs/fullscreen-button.html' },
  { label: 'NFT Seed', path: '/docs/api-nft-seed.html' },
  { label: 'WAD System', path: '/docs/wad.html' },
];

export function DocsViewer() {
  const [currentPage, setCurrentPage] = useState(DOC_PAGES[0].path);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#1a1d2e' }}>
      {/* Navigation bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 12px',
        background: 'linear-gradient(180deg, #252840 0%, #1a1d2e 100%)',
        borderBottom: '1px solid #2a324a',
        flexShrink: 0,
        overflowX: 'auto',
      }}>
        <span style={{ fontSize: 14, marginRight: 4 }}>📚</span>
        <select
          value={currentPage}
          onChange={(e) => setCurrentPage(e.target.value)}
          style={{
            background: '#0f1115',
            color: '#00ffff',
            border: '1px solid #2a324a',
            borderRadius: 4,
            padding: '4px 8px',
            fontSize: 12,
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          {DOC_PAGES.map((p) => (
            <option key={p.path} value={p.path}>{p.label}</option>
          ))}
        </select>
      </div>

      {/* Iframe */}
      <iframe
        src={currentPage}
        title="Nova64 Documentation"
        style={{
          flex: 1,
          border: 'none',
          width: '100%',
          background: '#0f1115',
        }}
        sandbox="allow-same-origin allow-scripts allow-popups"
      />
    </div>
  );
}
