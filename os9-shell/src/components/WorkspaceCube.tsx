// Compiz-style workspace transition — 3D rotate only during switch.
// All workspace layers stay mounted (stable DOM) so imperative app.mount()
// content survives transitions. Only CSS classes change.

import { useEffect, useState, useRef, type ReactNode } from 'react';
import { useWorkspaceStore, WORKSPACE_COUNT } from '../os/workspaceStore';

interface WorkspaceCubeProps {
  renderWorkspace: (workspaceId: number) => ReactNode;
}

export function WorkspaceCube({ renderWorkspace }: WorkspaceCubeProps) {
  const { activeWorkspace, isExpoMode, switchWorkspace } =
    useWorkspaceStore();

  const [transitioning, setTransitioning] = useState(false);
  const [fromWs, setFromWs] = useState(activeWorkspace);
  const [toWs, setToWs] = useState(activeWorkspace);
  const [direction, setDirection] = useState<'left' | 'right'>('right');
  const prevRef = useRef(activeWorkspace);

  useEffect(() => {
    if (activeWorkspace === prevRef.current) return;
    const prev = prevRef.current;
    const diff = activeWorkspace - prev;
    const dir = diff > 0 || diff < -2 ? 'right' : 'left';
    setFromWs(prev);
    setToWs(activeWorkspace);
    setDirection(dir);
    setTransitioning(true);
    prevRef.current = activeWorkspace;

    const timer = setTimeout(() => {
      setTransitioning(false);
    }, 600);
    return () => clearTimeout(timer);
  }, [activeWorkspace]);

  if (isExpoMode) {
    return (
      <div className="workspace-expo">
        {Array.from({ length: WORKSPACE_COUNT }, (_, i) => (
          <div
            key={i}
            className={`workspace-expo-cell ${i === activeWorkspace ? 'workspace-expo-cell--active' : ''}`}
            onClick={() => switchWorkspace(i)}
          >
            <div className="workspace-expo-label">Desktop {i + 1}</div>
            <div className="workspace-expo-content">
              {renderWorkspace(i)}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Determine per-layer CSS class
  const getLayerClass = (i: number) => {
    if (transitioning) {
      if (i === fromWs) return 'workspace-layer workspace-cube-face--front';
      if (i === toWs) return `workspace-layer workspace-cube-face--${direction}`;
    } else if (i === activeWorkspace) {
      return 'workspace-layer';
    }
    return 'workspace-layer workspace-layer--hidden';
  };

  const stageClass = transitioning
    ? 'workspace-stage workspace-stage--3d'
    : 'workspace-stage';

  const innerClass = transitioning
    ? `workspace-inner workspace-inner--3d ${
        direction === 'right'
          ? 'workspace-cube--rotate-right'
          : 'workspace-cube--rotate-left'
      }`
    : 'workspace-inner';

  return (
    <div className={stageClass}>
      <div className={innerClass}>
        {Array.from({ length: WORKSPACE_COUNT }, (_, i) => (
          <div key={i} className={getLayerClass(i)}>
            {renderWorkspace(i)}
          </div>
        ))}
      </div>
    </div>
  );
}
