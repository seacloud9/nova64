// Compiz-style 3D rotating cube with 4 workspace faces
// Uses CSS3 preserve-3d transforms for hardware-accelerated rotation

import { useEffect, useState, useCallback, type ReactNode } from 'react';
import { useWorkspaceStore, WORKSPACE_COUNT } from '../os/workspaceStore';

interface WorkspaceCubeProps {
  /** Render function receiving workspace index, returns content for that face */
  renderWorkspace: (workspaceId: number) => ReactNode;
}

export function WorkspaceCube({ renderWorkspace }: WorkspaceCubeProps) {
  const { activeWorkspace, isExpoMode, switchWorkspace } = useWorkspaceStore();
  const [cubeSize, setCubeSize] = useState(window.innerWidth);

  // Track viewport width for translateZ calculation
  const handleResize = useCallback(() => {
    setCubeSize(window.innerWidth);
  }, []);

  useEffect(() => {
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [handleResize]);

  const translateZ = cubeSize / 2;
  const cubeRotation = -90 * activeWorkspace;

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

  return (
    <div className="workspace-cube-viewport">
      <div
        className="workspace-cube"
        style={{
          transform: `translateZ(-${translateZ}px) rotateY(${cubeRotation}deg)`,
        }}
      >
        {Array.from({ length: WORKSPACE_COUNT }, (_, i) => (
          <div
            key={i}
            className={`workspace-face workspace-face--${i}${i === activeWorkspace ? ' workspace-face--active' : ''}`}
            style={{
              transform: `rotateY(${i * 90}deg) translateZ(${translateZ}px)`,
            }}
          >
            {renderWorkspace(i)}
          </div>
        ))}
      </div>
    </div>
  );
}
