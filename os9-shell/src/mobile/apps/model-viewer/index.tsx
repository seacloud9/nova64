// Model Viewer — wraps the existing ModelViewer React component for the mobile shell.
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import type { TVApp } from '../../types';
import { ModelViewer } from '../../../apps/ModelViewer';

let reactRoot: Root | null = null;

export const modelViewerApp: TVApp = {
  id: 'model-viewer',
  name: 'Model Viewer',
  icon: '🦊',
  category: 'Tools',
  description: 'Load and inspect 3D models (GLB/GLTF)',

  mount(el) {
    reactRoot = createRoot(el);
    reactRoot.render(<ModelViewer />);
  },

  unmount() {
    reactRoot?.unmount();
    reactRoot = null;
  },
};
