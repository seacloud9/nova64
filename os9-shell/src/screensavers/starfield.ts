// Classic 3D starfield screensaver
import type { ScreensaverHack } from './types';

interface Star {
  x: number;
  y: number;
  z: number;
}

class Starfield implements ScreensaverHack {
  id = 'starfield';
  name = 'Starfield';
  category = 'classic' as const;

  private ctx: CanvasRenderingContext2D | null = null;
  private w = 0;
  private h = 0;
  private stars: Star[] = [];
  private numStars = 400;
  private speed = 2;

  init(canvas: HTMLCanvasElement, width: number, height: number) {
    this.ctx = canvas.getContext('2d')!;
    this.w = width;
    this.h = height;
    this.stars = Array.from({ length: this.numStars }, () => this.newStar());
  }

  private newStar(): Star {
    return {
      x: (Math.random() - 0.5) * this.w * 2,
      y: (Math.random() - 0.5) * this.h * 2,
      z: Math.random() * 1000 + 1,
    };
  }

  draw(_time: number, dt: number) {
    const ctx = this.ctx;
    if (!ctx) return;

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, this.w, this.h);

    const cx = this.w / 2;
    const cy = this.h / 2;
    const moveAmount = this.speed * dt * 300;

    for (const star of this.stars) {
      // Move star toward camera
      star.z -= moveAmount;
      if (star.z <= 1) {
        Object.assign(star, this.newStar());
        star.z = 1000;
        continue;
      }

      // Project to 2D
      const sx = (star.x / star.z) * 300 + cx;
      const sy = (star.y / star.z) * 300 + cy;

      // Off screen? Reset
      if (sx < 0 || sx > this.w || sy < 0 || sy > this.h) {
        Object.assign(star, this.newStar());
        star.z = 1000;
        continue;
      }

      // Size and brightness based on depth
      const size = Math.max(0.5, (1 - star.z / 1000) * 3);
      const brightness = Math.floor((1 - star.z / 1000) * 255);

      // Draw trail
      const prevZ = star.z + moveAmount;
      const psx = (star.x / prevZ) * 300 + cx;
      const psy = (star.y / prevZ) * 300 + cy;

      ctx.strokeStyle = `rgb(${brightness},${brightness},${brightness})`;
      ctx.lineWidth = size;
      ctx.beginPath();
      ctx.moveTo(psx, psy);
      ctx.lineTo(sx, sy);
      ctx.stroke();

      // Draw star point
      ctx.fillStyle = `rgb(${brightness},${brightness},${brightness})`;
      ctx.beginPath();
      ctx.arc(sx, sy, size * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  resize(width: number, height: number) {
    this.w = width;
    this.h = height;
  }

  destroy() {
    this.ctx = null;
    this.stars = [];
  }
}

export const starfield = new Starfield();
