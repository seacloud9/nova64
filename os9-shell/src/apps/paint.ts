// Simple Paint App
import type { Nova64App } from '../types';
import { novaContext } from '../os/context';

const paintApp: Nova64App = {
  id: 'com.nova64.paint',
  name: 'Paint',
  icon: '🎨',

  mount(el: HTMLElement) {
    const canvas = document.createElement('canvas');
    canvas.width = el.clientWidth || 600;
    canvas.height = el.clientHeight || 400;
    canvas.style.display = 'block';
    canvas.style.cursor = 'crosshair';
    canvas.style.background = '#FFFFFF';

    const canvasCtx = canvas.getContext('2d')!;
    canvasCtx.strokeStyle = '#000000';
    canvasCtx.lineWidth = 2;
    canvasCtx.lineCap = 'round';

    let isDrawing = false;
    let lastX = 0;
    let lastY = 0;

    canvas.addEventListener('mousedown', (e) => {
      isDrawing = true;
      const rect = canvas.getBoundingClientRect();
      lastX = e.clientX - rect.left;
      lastY = e.clientY - rect.top;
    });

    canvas.addEventListener('mousemove', (e) => {
      if (!isDrawing) return;

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      canvasCtx.beginPath();
      canvasCtx.moveTo(lastX, lastY);
      canvasCtx.lineTo(x, y);
      canvasCtx.stroke();

      lastX = x;
      lastY = y;
    });

    canvas.addEventListener('mouseup', () => {
      isDrawing = false;
    });

    canvas.addEventListener('mouseleave', () => {
      isDrawing = false;
    });

    const toolbar = document.createElement('div');
    toolbar.style.cssText = `
      padding: 8px;
      background: #DDDDDD;
      border-bottom: 1px solid #999;
      display: flex;
      gap: 8px;
      align-items: center;
    `;

    const clearBtn = document.createElement('button');
    clearBtn.textContent = 'Clear';
    clearBtn.className = 'button';
    clearBtn.onclick = () => {
      canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
    };

    const colorInput = document.createElement('input');
    colorInput.type = 'color';
    colorInput.value = '#000000';
    colorInput.onchange = () => {
      canvasCtx.strokeStyle = colorInput.value;
    };

    const sizeInput = document.createElement('input');
    sizeInput.type = 'range';
    sizeInput.min = '1';
    sizeInput.max = '20';
    sizeInput.value = '2';
    sizeInput.style.width = '100px';
    sizeInput.oninput = () => {
      canvasCtx.lineWidth = parseInt(sizeInput.value);
    };

    const sizeLabel = document.createElement('span');
    sizeLabel.textContent = 'Size: 2';
    sizeLabel.style.fontSize = '11px';
    sizeInput.oninput = () => {
      canvasCtx.lineWidth = parseInt(sizeInput.value);
      sizeLabel.textContent = `Size: ${sizeInput.value}`;
    };

    toolbar.appendChild(clearBtn);
    toolbar.appendChild(document.createTextNode('Color: '));
    toolbar.appendChild(colorInput);
    toolbar.appendChild(sizeLabel);
    toolbar.appendChild(sizeInput);

    el.style.display = 'flex';
    el.style.flexDirection = 'column';
    el.style.height = '100%';
    el.appendChild(toolbar);
    el.appendChild(canvas);
  },

  unmount() {
    // Cleanup
  },

  getInfo() {
    return {
      name: 'Paint',
      version: '1.0',
      description: 'Simple drawing application',
      author: 'nova64 OS',
      icon: '🎨',
    };
  },
};

novaContext.registerApp(paintApp);

export default paintApp;
