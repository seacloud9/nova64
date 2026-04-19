// Matrix digital rain screensaver
import type { ScreensaverHack } from './types';

class MatrixRain implements ScreensaverHack {
  id = 'matrix';
  name = 'Matrix Rain';
  category = 'classic' as const;

  private ctx: CanvasRenderingContext2D | null = null;
  private w = 0;
  private h = 0;
  private columns: number[] = [];
  private fontSize = 14;
  private chars = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789ABCDEF';

  init(canvas: HTMLCanvasElement, width: number, height: number) {
    this.ctx = canvas.getContext('2d')!;
    this.w = width;
    this.h = height;
    const cols = Math.floor(width / this.fontSize);
    this.columns = Array.from({ length: cols }, () => Math.random() * -20);
  }

  draw(_time: number, _dt: number) {
    const ctx = this.ctx;
    if (!ctx) return;

    // Semi-transparent black for trail effect
    ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
    ctx.fillRect(0, 0, this.w, this.h);

    ctx.font = `${this.fontSize}px monospace`;

    for (let i = 0; i < this.columns.length; i++) {
      const char = this.chars[Math.floor(Math.random() * this.chars.length)];
      const x = i * this.fontSize;
      const y = this.columns[i] * this.fontSize;

      // Bright green for the head, dimmer for the rest
      if (Math.random() > 0.98) {
        ctx.fillStyle = '#fff';
      } else {
        ctx.fillStyle = `hsl(120, 100%, ${30 + Math.random() * 30}%)`;
      }

      ctx.fillText(char, x, y);

      if (y > this.h && Math.random() > 0.975) {
        this.columns[i] = 0;
      }
      this.columns[i]++;
    }
  }

  resize(width: number, height: number) {
    this.w = width;
    this.h = height;
    const cols = Math.floor(width / this.fontSize);
    this.columns = Array.from({ length: cols }, () => Math.random() * -20);
  }

  destroy() {
    this.ctx = null;
    this.columns = [];
  }
}

export const matrixRain = new MatrixRain();
