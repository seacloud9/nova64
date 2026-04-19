// Bouncing logo screensaver — NovaOS logo bounces off edges, changes color
import type { ScreensaverHack } from './types';

class BouncingLogo implements ScreensaverHack {
  id = 'bouncing-logo';
  name = 'Bouncing Logo';
  category = 'retro' as const;

  private ctx: CanvasRenderingContext2D | null = null;
  private w = 0;
  private h = 0;
  private x = 100;
  private y = 100;
  private vx = 150;
  private vy = 100;
  private hue = 0;
  private logoW = 180;
  private logoH = 60;

  init(canvas: HTMLCanvasElement, width: number, height: number) {
    this.ctx = canvas.getContext('2d')!;
    this.w = width;
    this.h = height;
    this.x = Math.random() * (width - this.logoW);
    this.y = Math.random() * (height - this.logoH);
    this.vx = (Math.random() > 0.5 ? 1 : -1) * (120 + Math.random() * 80);
    this.vy = (Math.random() > 0.5 ? 1 : -1) * (80 + Math.random() * 60);
    this.hue = Math.random() * 360;
  }

  draw(_time: number, dt: number) {
    const ctx = this.ctx;
    if (!ctx) return;

    // Fade background for trail effect
    ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
    ctx.fillRect(0, 0, this.w, this.h);

    // Move
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Bounce off edges
    if (this.x <= 0 || this.x + this.logoW >= this.w) {
      this.vx *= -1;
      this.x = Math.max(0, Math.min(this.x, this.w - this.logoW));
      this.hue = (this.hue + 60 + Math.random() * 60) % 360;
    }
    if (this.y <= 0 || this.y + this.logoH >= this.h) {
      this.vy *= -1;
      this.y = Math.max(0, Math.min(this.y, this.h - this.logoH));
      this.hue = (this.hue + 60 + Math.random() * 60) % 360;
    }

    // Draw logo
    const color = `hsl(${this.hue}, 100%, 60%)`;
    const glow = `hsl(${this.hue}, 100%, 80%)`;

    // Glow
    ctx.shadowColor = glow;
    ctx.shadowBlur = 20;

    // Box
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(this.x, this.y, this.logoW, this.logoH, 8);
    ctx.stroke();

    // Text
    ctx.shadowBlur = 10;
    ctx.fillStyle = color;
    ctx.font = 'bold 28px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('NOVA64', this.x + this.logoW / 2, this.y + this.logoH / 2);

    ctx.shadowBlur = 0;
  }

  resize(width: number, height: number) {
    this.w = width;
    this.h = height;
  }

  destroy() {
    this.ctx = null;
  }
}

export const bouncingLogo = new BouncingLogo();
