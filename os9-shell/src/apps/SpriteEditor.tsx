import { useState, useRef, useEffect } from 'react';

interface Color {
  r: number;
  g: number;
  b: number;
  a: number;
}

const PALETTE: Color[] = [
  { r: 0, g: 0, b: 0, a: 255 },       // Black
  { r: 255, g: 255, b: 255, a: 255 }, // White
  { r: 255, g: 0, b: 0, a: 255 },     // Red
  { r: 0, g: 255, b: 0, a: 255 },     // Green
  { r: 0, g: 0, b: 255, a: 255 },     // Blue
  { r: 255, g: 255, b: 0, a: 255 },   // Yellow
  { r: 255, g: 0, b: 255, a: 255 },   // Magenta
  { r: 0, g: 255, b: 255, a: 255 },   // Cyan
  { r: 128, g: 0, b: 0, a: 255 },     // Dark Red
  { r: 0, g: 128, b: 0, a: 255 },     // Dark Green
  { r: 0, g: 0, b: 128, a: 255 },     // Dark Blue
  { r: 128, g: 128, b: 0, a: 255 },   // Olive
  { r: 128, g: 0, b: 128, a: 255 },   // Purple
  { r: 0, g: 128, b: 128, a: 255 },   // Teal
  { r: 128, g: 128, b: 128, a: 255 }, // Gray
  { r: 192, g: 192, b: 192, a: 255 }, // Light Gray
];

type Tool = 'pen' | 'fill' | 'eraser' | 'eyedropper';

export function SpriteEditor() {
  const [gridSize, setGridSize] = useState<number>(16);
  const [pixelSize, setPixelSize] = useState<number>(24);
  const [selectedColor, setSelectedColor] = useState<Color>(PALETTE[0]);
  const [tool, setTool] = useState<Tool>('pen');
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [spriteName, setSpriteName] = useState<string>('sprite-1');
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [pixels, setPixels] = useState<Color[][]>([]);

  // Initialize empty canvas
  useEffect(() => {
    const newPixels: Color[][] = [];
    for (let y = 0; y < gridSize; y++) {
      newPixels[y] = [];
      for (let x = 0; x < gridSize; x++) {
        newPixels[y][x] = { r: 0, g: 0, b: 0, a: 0 }; // Transparent
      }
    }
    setPixels(newPixels);
  }, [gridSize]);

  // Draw the canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw checkerboard background for transparency
    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        if ((x + y) % 2 === 0) {
          ctx.fillStyle = '#DDD';
        } else {
          ctx.fillStyle = '#FFF';
        }
        ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
      }
    }

    // Draw pixels
    pixels.forEach((row, y) => {
      row.forEach((color, x) => {
        if (color.a > 0) {
          ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a / 255})`;
          ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
        }
      });
    });

    // Draw grid
    if (showGrid) {
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
      ctx.lineWidth = 1;
      for (let x = 0; x <= gridSize; x++) {
        ctx.beginPath();
        ctx.moveTo(x * pixelSize, 0);
        ctx.lineTo(x * pixelSize, gridSize * pixelSize);
        ctx.stroke();
      }
      for (let y = 0; y <= gridSize; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y * pixelSize);
        ctx.lineTo(gridSize * pixelSize, y * pixelSize);
        ctx.stroke();
      }
    }
  }, [pixels, gridSize, pixelSize, showGrid]);

  const getPixelCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / pixelSize);
    const y = Math.floor((e.clientY - rect.top) / pixelSize);

    if (x >= 0 && x < gridSize && y >= 0 && y < gridSize) {
      return { x, y };
    }
    return null;
  };

  const setPixel = (x: number, y: number, color: Color) => {
    setPixels(prev => {
      const newPixels = prev.map(row => [...row]);
      newPixels[y][x] = { ...color };
      return newPixels;
    });
  };

  const floodFill = (startX: number, startY: number, targetColor: Color, fillColor: Color) => {
    if (targetColor.r === fillColor.r && targetColor.g === fillColor.g && 
        targetColor.b === fillColor.b && targetColor.a === fillColor.a) {
      return;
    }

    const newPixels = pixels.map(row => [...row]);
    const stack: [number, number][] = [[startX, startY]];

    const colorMatch = (c1: Color, c2: Color) => {
      return c1.r === c2.r && c1.g === c2.g && c1.b === c2.b && c1.a === c2.a;
    };

    while (stack.length > 0) {
      const [x, y] = stack.pop()!;

      if (x < 0 || x >= gridSize || y < 0 || y >= gridSize) continue;
      if (!colorMatch(newPixels[y][x], targetColor)) continue;

      newPixels[y][x] = { ...fillColor };

      stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }

    setPixels(newPixels);
  };

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getPixelCoords(e);
    if (!coords) return;

    setIsDrawing(true);

    switch (tool) {
      case 'pen':
        setPixel(coords.x, coords.y, selectedColor);
        break;
      case 'eraser':
        setPixel(coords.x, coords.y, { r: 0, g: 0, b: 0, a: 0 });
        break;
      case 'fill':
        floodFill(coords.x, coords.y, pixels[coords.y][coords.x], selectedColor);
        break;
      case 'eyedropper': {
        const pickedColor = pixels[coords.y][coords.x];
        if (pickedColor.a > 0) {
          setSelectedColor(pickedColor);
        }
        break;
      }
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    if (tool === 'fill' || tool === 'eyedropper') return;

    const coords = getPixelCoords(e);
    if (!coords) return;

    if (tool === 'pen') {
      setPixel(coords.x, coords.y, selectedColor);
    } else if (tool === 'eraser') {
      setPixel(coords.x, coords.y, { r: 0, g: 0, b: 0, a: 0 });
    }
  };

  const handleCanvasMouseUp = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    if (confirm('Clear the canvas? This cannot be undone.')) {
      const newPixels: Color[][] = [];
      for (let y = 0; y < gridSize; y++) {
        newPixels[y] = [];
        for (let x = 0; x < gridSize; x++) {
          newPixels[y][x] = { r: 0, g: 0, b: 0, a: 0 };
        }
      }
      setPixels(newPixels);
    }
  };

  const exportSprite = () => {
    const canvas = document.createElement('canvas');
    canvas.width = gridSize;
    canvas.height = gridSize;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw pixels at 1:1 scale
    pixels.forEach((row, y) => {
      row.forEach((color, x) => {
        if (color.a > 0) {
          ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a / 255})`;
          ctx.fillRect(x, y, 1, 1);
        }
      });
    });

    // Download
    canvas.toBlob(blob => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${spriteName}.png`;
      a.click();
      URL.revokeObjectURL(url);
    });
  };

  const colorToString = (color: Color) => {
    return `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a / 255})`;
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: 'linear-gradient(180deg, #E0E0E0 0%, #C0C0C0 100%)',
        fontFamily: 'Chicago, "Courier New", monospace',
        overflow: 'hidden',
      }}
    >
      {/* Toolbar */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          padding: 8,
          background: '#D0D0D0',
          borderBottom: '2px solid #000',
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', gap: 4 }}>
          <button
            onClick={() => setTool('pen')}
            style={{
              padding: '6px 12px',
              background: tool === 'pen' ? '#000' : '#FFF',
              color: tool === 'pen' ? '#FFF' : '#000',
              border: '2px solid #000',
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
          >
            ✏️ Pen
          </button>
          <button
            onClick={() => setTool('fill')}
            style={{
              padding: '6px 12px',
              background: tool === 'fill' ? '#000' : '#FFF',
              color: tool === 'fill' ? '#FFF' : '#000',
              border: '2px solid #000',
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
          >
            🪣 Fill
          </button>
          <button
            onClick={() => setTool('eraser')}
            style={{
              padding: '6px 12px',
              background: tool === 'eraser' ? '#000' : '#FFF',
              color: tool === 'eraser' ? '#FFF' : '#000',
              border: '2px solid #000',
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
          >
            🧹 Eraser
          </button>
          <button
            onClick={() => setTool('eyedropper')}
            style={{
              padding: '6px 12px',
              background: tool === 'eyedropper' ? '#000' : '#FFF',
              color: tool === 'eyedropper' ? '#FFF' : '#000',
              border: '2px solid #000',
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
          >
            💧 Pick
          </button>
        </div>

        <div style={{ width: 2, height: 30, background: '#000' }} />

        <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <input
            type="checkbox"
            checked={showGrid}
            onChange={e => setShowGrid(e.target.checked)}
          />
          Show Grid
        </label>

        <div style={{ width: 2, height: 30, background: '#000' }} />

        <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          Size:
          <select
            value={gridSize}
            onChange={e => setGridSize(Number(e.target.value))}
            style={{ padding: 4, border: '2px solid #000' }}
          >
            <option value={8}>8x8</option>
            <option value={16}>16x16</option>
            <option value={32}>32x32</option>
            <option value={64}>64x64</option>
          </select>
        </label>

        <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          Zoom:
          <select
            value={pixelSize}
            onChange={e => setPixelSize(Number(e.target.value))}
            style={{ padding: 4, border: '2px solid #000' }}
          >
            <option value={12}>1x</option>
            <option value={24}>2x</option>
            <option value={36}>3x</option>
            <option value={48}>4x</option>
          </select>
        </label>

        <div style={{ flex: 1 }} />

        <button
          onClick={clearCanvas}
          style={{
            padding: '6px 12px',
            background: '#FFF',
            border: '2px solid #000',
            cursor: 'pointer',
            fontWeight: 'bold',
          }}
        >
          🗑️ Clear
        </button>

        <button
          onClick={exportSprite}
          style={{
            padding: '6px 12px',
            background: '#00DD00',
            border: '2px solid #000',
            cursor: 'pointer',
            fontWeight: 'bold',
          }}
        >
          💾 Export PNG
        </button>
      </div>

      {/* Main content */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          gap: 16,
          padding: 16,
          overflow: 'auto',
        }}
      >
        {/* Canvas area */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            background: '#A0A0A0',
            border: '2px solid #000',
            padding: 16,
          }}
        >
          <canvas
            ref={canvasRef}
            width={gridSize * pixelSize}
            height={gridSize * pixelSize}
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onMouseLeave={handleCanvasMouseUp}
            style={{
              cursor: tool === 'eyedropper' ? 'crosshair' : 'pointer',
              border: '2px solid #000',
              background: '#FFF',
            }}
          />
        </div>

        {/* Sidebar */}
        <div
          style={{
            width: 200,
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          {/* Current color */}
          <div
            style={{
              background: '#FFF',
              border: '2px solid #000',
              padding: 12,
            }}
          >
            <div style={{ fontWeight: 'bold', marginBottom: 8 }}>Current Color</div>
            <div
              style={{
                width: '100%',
                height: 60,
                background: colorToString(selectedColor),
                border: '2px solid #000',
                boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.5)',
              }}
            />
            <div style={{ marginTop: 8, fontSize: 11 }}>
              RGB: {selectedColor.r}, {selectedColor.g}, {selectedColor.b}
            </div>
          </div>

          {/* Color palette */}
          <div
            style={{
              background: '#FFF',
              border: '2px solid #000',
              padding: 12,
              flex: 1,
              overflow: 'auto',
            }}
          >
            <div style={{ fontWeight: 'bold', marginBottom: 8 }}>Palette</div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: 4,
              }}
            >
              {PALETTE.map((color, i) => (
                <div
                  key={i}
                  onClick={() => setSelectedColor(color)}
                  style={{
                    width: 36,
                    height: 36,
                    background: colorToString(color),
                    border:
                      selectedColor === color
                        ? '3px solid #000'
                        : '2px solid #000',
                    cursor: 'pointer',
                    boxSizing: 'border-box',
                  }}
                  title={`RGB: ${color.r}, ${color.g}, ${color.b}`}
                />
              ))}
            </div>

            {/* Transparent option */}
            <div style={{ marginTop: 12 }}>
              <div
                onClick={() => setSelectedColor({ r: 0, g: 0, b: 0, a: 0 })}
                style={{
                  width: '100%',
                  height: 36,
                  background:
                    'repeating-conic-gradient(#DDD 0% 25%, #FFF 0% 50%) 50% / 8px 8px',
                  border:
                    selectedColor.a === 0
                      ? '3px solid #000'
                      : '2px solid #000',
                  cursor: 'pointer',
                  boxSizing: 'border-box',
                }}
                title="Transparent"
              />
              <div style={{ fontSize: 11, marginTop: 4, textAlign: 'center' }}>
                Transparent
              </div>
            </div>
          </div>

          {/* Export settings */}
          <div
            style={{
              background: '#FFF',
              border: '2px solid #000',
              padding: 12,
            }}
          >
            <div style={{ fontWeight: 'bold', marginBottom: 8 }}>Export</div>
            <input
              type="text"
              value={spriteName}
              onChange={e => setSpriteName(e.target.value)}
              placeholder="sprite-name"
              style={{
                width: '100%',
                padding: 4,
                border: '2px solid #000',
                fontFamily: 'inherit',
              }}
            />
            <div style={{ fontSize: 11, marginTop: 4, color: '#666' }}>
              {gridSize}x{gridSize} PNG
            </div>
          </div>
        </div>
      </div>

      {/* Status bar */}
      <div
        style={{
          padding: 8,
          background: '#D0D0D0',
          borderTop: '2px solid #000',
          fontSize: 12,
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        <span>🎨 Sprite Editor • Tool: {tool}</span>
        <span>Canvas: {gridSize}x{gridSize}px</span>
      </div>
    </div>
  );
}
