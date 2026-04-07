import { useState } from 'react';
import { novaContext } from '../os/context';

interface AppItem {
  id: string;
  name: string;
  icon: string;
  description: string;
  category: string;
}

const APPS: AppItem[] = [
  {
    id: 'hypernova',
    name: 'hyperNova',
    icon: '🃏',
    description: 'HyperCard-like stack editor — build interactive cards & mini-apps',
    category: 'Creativity',
  },
  {
    id: 'game-launcher',
    name: 'Game Launcher',
    icon: '🎮',
    description: 'Browse and launch Nova64 games',
    category: 'Entertainment',
  },
  {
    id: 'studio',
    name: 'Game Studio',
    icon: '💻',
    description: 'Code editor with live preview',
    category: 'Development',
  },
  {
    id: 'paint',
    name: 'Paint',
    icon: '🎨',
    description: 'Pixel art editor',
    category: 'Graphics',
  },
  {
    id: 'sprite-editor',
    name: 'Sprite Editor',
    icon: '🖼️',
    description: 'Create and export pixel sprites',
    category: 'Graphics',
  },
  {
    id: 'notes',
    name: 'Notes',
    icon: '📝',
    description: 'Text editor and notepad',
    category: 'Productivity',
  },
  {
    id: 'docs',
    name: 'Documentation',
    icon: '📚',
    description: 'Nova64 API reference',
    category: 'Reference',
  },
  {
    id: 'nova64-console',
    name: 'Nova64 Console',
    icon: '🎮',
    description: 'Full-screen Nova64 game console',
    category: 'Entertainment',
  },
  {
    id: 'cart-runner',
    name: 'Cart Runner',
    icon: '🕹️',
    description: 'Run Nova64 game carts in a window',
    category: 'Entertainment',
  },
  {
    id: 'model-viewer',
    name: 'Model Viewer',
    icon: '📦',
    description: 'View 3D models and assets',
    category: 'Development',
  },
  {
    id: 'demoscene',
    name: 'DemoScene',
    icon: '💿',
    description: 'Tron Odyssey interactive demo',
    category: 'Entertainment',
  },
  {
    id: 'com.nova64.profiler',
    name: 'System Profiler',
    icon: '💻',
    description: 'System information and performance',
    category: 'System',
  },
];

interface Props {
  onClose: () => void;
}

export function ApplicationLauncher({ onClose }: Props) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredApps = APPS.filter(app =>
    app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    app.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleLaunchApp = (appId: string) => {
    novaContext.launchApp(appId);
    onClose();
  };

  return (
    <div className="app-launcher-overlay" onClick={onClose}>
      <div className="app-launcher" onClick={(e) => e.stopPropagation()}>
        <div className="app-launcher-header">
          <input
            type="text"
            className="app-launcher-search"
            placeholder="Type to search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
          />
        </div>
        
        <div className="app-launcher-content">
          <div className="app-launcher-grid">
            {filteredApps.map((app) => (
              <div
                key={app.id}
                className="app-launcher-item"
                onClick={() => handleLaunchApp(app.id)}
              >
                <div className="app-launcher-icon">{app.icon}</div>
                <div className="app-launcher-name">{app.name}</div>
                <div className="app-launcher-description">{app.description}</div>
              </div>
            ))}
          </div>
          
          {filteredApps.length === 0 && (
            <div className="app-launcher-empty">
              <div style={{ fontSize: 48, opacity: 0.3, marginBottom: 16 }}>🔍</div>
              <div style={{ opacity: 0.5 }}>No applications found</div>
            </div>
          )}
        </div>
        
        <div className="app-launcher-footer">
          <button className="app-launcher-close" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
