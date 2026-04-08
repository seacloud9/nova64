// Desktop entry — registers all OS apps and renders the Mac OS 9 shell.
// This module is only loaded on non-mobile devices (dynamic import in main.tsx).

import './apps/notes';
import './apps/paint';
import './apps/profiler';
import './apps/game-launcher-app';
import './apps/game-studio-app';
import './apps/docs-app';
import './apps/sprite-editor-app';
import './apps/demoscene-app';
import './apps/hypernova';
import './apps/Finder';
import './apps/cart-runner-app';
import './apps/model-viewer-app';
import './apps/emu-app';
import './apps/appearance-app';

import { App } from './components/App';
import { novaContext } from './os/context';
import { useAppStore } from './os/stores';

// Log registered apps after a brief delay
setTimeout(() => {
  const apps = useAppStore.getState().apps;
  console.log('📱 Total registered apps:', apps.size);
  console.log('📱 Registered app IDs:', Array.from(apps.keys()));
}, 100);

export { novaContext };
export function DesktopApp() {
  return <App />;
}
