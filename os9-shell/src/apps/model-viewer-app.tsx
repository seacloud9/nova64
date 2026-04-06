import { createRoot } from 'react-dom/client';
import { ModelViewer } from './ModelViewer';
import type { Nova64App, NovaContext } from '../types';

const modelViewerApp: Nova64App = {
  id: 'model-viewer',
  name: 'Model Viewer',
  icon: '📦',
  mount(container: HTMLElement, _ctx: NovaContext) {
    container.style.padding = '0';
    container.style.overflow = 'hidden';
    const root = createRoot(container);
    root.render(<ModelViewer />);
    (this as unknown as { _root: typeof root })._root = root;
  },
  unmount() {
    (this as unknown as { _root?: { unmount: () => void } })._root?.unmount();
  },
};

import { novaContext } from '../os/context';
novaContext.registerApp(modelViewerApp);
