// Paint App
import type { Nova64App } from '../types';
import { novaContext } from '../os/context';
import { createRoot } from 'react-dom/client';
import { useState, useRef, useEffect } from 'react';

function PaintApp() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#FF00FF');
  const [brushSize, setBrushSize] = useState(4);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    ctx.beginPath();
    ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  };

  const COLORS = ['#FF00FF', '#00FFFF', '#FFFF00', '#FF0000', '#00FF00', '#0000FF', '#FFFFFF', '#000000'];

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      <div style={{ padding: 12, background: '#2A2A2A', borderBottom: '2px solid #000', display: 'flex', gap: 12, alignItems: 'center' }}>
        <span style={{ fontSize: 24 }}>🎨</span>
        {COLORS.map(c => <button key={c} onClick={() => setColor(c)} style={{ width: 30, height: 30, background: c, border: color === c ? '3px solid #FFF' : '2px solid #000', borderRadius: 6, cursor: 'pointer' }} />)}
        <input type="range" min="1" max="30" value={brushSize} onChange={(e) => setBrushSize(Number(e.target.value))} style={{ width: 100 }} />
      </div>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <canvas ref={canvasRef} width={800} height={600} onMouseDown={() => setIsDrawing(true)} onMouseMove={draw} onMouseUp={() => setIsDrawing(false)} onMouseLeave={() => setIsDrawing(false)} style={{ border: '4px solid #000', borderRadius: 12, background: '#FFF', boxShadow: '0 12px 40px rgba(0,0,0,0.6)' }} />
      </div>
    </div>
  );
}

const paintApp: Nova64App = {
  id: 'paint',
  name: 'Paint',
  icon: '🎨',
  mount(container) {
    const root = createRoot(container);
    root.render(<PaintApp />);
    return () => root.unmount();
  },
  unmount() {},
  getInfo() {
    return { name: 'Paint', version: '2.0', description: 'Pixel art editor', author: 'nova64 OS', icon: '🎨' };
  },
};

novaContext.registerApp(paintApp);
export default paintApp;
