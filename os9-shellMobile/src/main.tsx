import React from 'react';
import ReactDOM from 'react-dom/client';
import { TVShell } from './TVShell';
import { tvContext } from './os/context';
import { gameLauncherApp } from './apps/game-launcher';

// Theme + Glass CSS
import './theme/glass.css';

// Tailwind
import './index.css';

// ─── Register Phase 1 app ───────────────────────────────────────────────────
// Only ONE app at a time. Future phases will add eMU, Notes, Paint, etc.
tvContext.registerApp(gameLauncherApp);

// ─── Mount ───────────────────────────────────────────────────────────────────
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <TVShell />
  </React.StrictMode>
);
