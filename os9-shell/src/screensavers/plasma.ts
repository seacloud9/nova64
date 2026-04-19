// Classic plasma effect screensaver — sine-based color cycling
import type { ScreensaverHack } from './types';

class Plasma implements ScreensaverHack {
  id = 'plasma';
  name = 'Plasma';
  category = 'classic' as const;

  private ctx: CanvasRenderingContext2D | null = null;
  private w = 0;
  private h = 0;
  private imgData: ImageData | null = null;
  // Render at lower resolution for performance, then scale up
  private scale = 4;

  init(canvas: HTMLCanvasElement, width: number, height: number) {
    this.ctx = canvas.getContext('2d')!;
    this.w = width;
    this.h = height;
    this.ctx.imageSmoothingEnabled = false;
    const sw = Math.ceil(width / this.scale);
    const sh = Math.ceil(height / this.scale);
    this.imgData = this.ctx.createImageData(sw, sh);
  }

  draw(time: number, _dt: number) {
    const ctx = this.ctx;
    const img = this.imgData;
    if (!ctx || !img) return;

    const t = time * 0.001;
    const sw = img.width;
    const sh = img.height;
    const data = img.data;

    for (let y = 0; y < sh; y++) {
      for (let x = 0; x < sw; x++) {
        const v1 = Math.sin(x * 0.05 + t);
        const v2 = Math.sin(y * 0.05 + t * 0.7);
        const v3 = Math.sin((x * 0.05 + y * 0.05) + t * 0.5);
        const v4 = Math.sin(Math.sqrt(
          (x - sw / 2) * (x - sw / 2) + (y - sh / 2) * (y - sh / 2)
        ) * 0.1 - t);

        const v = (v1 + v2 + v3 + v4) * 0.25; // -1 to 1

        const idx = (y * sw + x) * 4;
        data[idx] = Math.floor((Math.sin(v * Math.PI) * 0.5 + 0.5) * 255);
        data[idx + 1] = Math.floor((Math.sin(v * Math.PI + 2.094) * 0.5 + 0.5) * 255);
        data[idx + 2] = Math.floor((Math.sin(v * Math.PI + 4.189) * 0.5 + 0.5) * 255);
        data[idx + 3] = 255;
      }
    }

    ctx.putImageData(img, 0, 0);
    // Scale up to fill canvas
    ctx.drawImage(ctx.canvas, 0, 0, sw, sh, 0, 0, this.w, this.h);
  }

  resize(width: number, height: number) {
    this.w = width;
    this.h = height;
    if (this.ctx) {
      const sw = Math.ceil(width / this.scale);
      const sh = Math.ceil(height / this.scale);
      this.imgData = this.ctx.createImageData(sw, sh);
    }
  }

  destroy() {
    this.ctx = null;
    this.imgData = null;
  }
}

export const plasma = new Plasma();
