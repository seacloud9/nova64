// Mobile App entry — lazy-loaded chunk for mobile devices.
// Imports Tailwind + Glass CSS (isolated to this chunk via Vite code-splitting).
import React from 'react';

import './mobile.css';
import './theme/glass.css';

import { tvContext } from './os/context';
import { gameLauncherApp } from './apps/game-launcher';
import { modelViewerApp } from './apps/model-viewer';
import { TVShell } from './TVShell';

// Register mobile apps
tvContext.registerApp(gameLauncherApp);
tvContext.registerApp(modelViewerApp);

export function MobileApp() {
  return (
    <React.Fragment>
      <TVShell />
    </React.Fragment>
  );
}
