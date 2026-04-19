// Screensaver hack interface — each hack is a standalone canvas renderer
export interface ScreensaverHack {
  id: string;
  name: string;
  category: 'classic' | 'gl' | 'particle' | 'retro';
  init(canvas: HTMLCanvasElement, width: number, height: number): void;
  draw(time: number, deltaTime: number): void;
  resize?(width: number, height: number): void;
  destroy(): void;
}
