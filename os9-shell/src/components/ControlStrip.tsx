import { useUIStore } from '../os/stores';

export function ControlStrip() {
  const {
    controlStripCollapsed,
    controlStripItems,
    scanlines,
    toggleControlStrip,
    toggleFPS,
    toggleScanlines,
  } = useUIStore();

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const volume = parseFloat(e.target.value);
    // TODO: Update volume in preferences
    console.log('Volume:', volume);
  };

  const handleBrightnessChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const brightness = parseFloat(e.target.value);
    document.documentElement.style.filter = `brightness(${brightness})`;
  };

  return (
    <div className={`control-strip ${controlStripCollapsed ? 'collapsed' : ''}`}>
      <div className="control-strip-toggle" onClick={toggleControlStrip}>
        {controlStripCollapsed ? '▲' : '▼'}
      </div>

      {!controlStripCollapsed && (
        <>
          <div className="control-strip-item">
            <span className="control-strip-icon">🔊</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              defaultValue="0.7"
              onChange={handleVolumeChange}
              style={{ width: 60 }}
            />
          </div>

          <div className="control-strip-item">
            <span className="control-strip-icon">☀️</span>
            <input
              type="range"
              min="0.5"
              max="1.5"
              step="0.1"
              defaultValue="1"
              onChange={handleBrightnessChange}
              style={{ width: 60 }}
            />
          </div>

          <div className="control-strip-item" onClick={toggleScanlines}>
            <span className="control-strip-icon">📺</span>
            <span className="control-strip-label">{scanlines ? 'ON' : 'OFF'}</span>
          </div>

          <div className="control-strip-item" onClick={toggleFPS}>
            <span className="control-strip-icon">⚡</span>
            <span className="control-strip-label">FPS</span>
          </div>

          <div className="control-strip-item">
            <span className="control-strip-icon">🌐</span>
            <span className="control-strip-label">Offline</span>
          </div>

          {controlStripItems.map((item) => (
            <div
              key={item.id}
              className="control-strip-item"
              onClick={item.onClick}
            >
              <span className="control-strip-icon">{item.icon}</span>
              <span className="control-strip-label">{item.label}</span>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
