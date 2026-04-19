// Full-screen screensaver overlay — renders selected hack on a canvas
// Dismisses on any user input (mouse, keyboard, touch)

import { useEffect, useRef, useCallback } from 'react';
import { useScreensaverStore } from '../os/screensaverStore';
import { getHackById, getRandomHack } from '../screensavers';
import type { ScreensaverHack } from '../screensavers/types';

export function ScreensaverOverlay() {
  const { isActive, selectedHackId, deactivate } = useScreensaverStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hackRef = useRef<ScreensaverHack | null>(null);
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  const dismiss = useCallback(() => {
    deactivate();
  }, [deactivate]);

  useEffect(() => {
    if (!isActive) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = w;
    canvas.height = h;

    // Pick the hack
    const hack =
      selectedHackId === 'random'
        ? getRandomHack()
        : getHackById(selectedHackId) ?? getRandomHack();
    hackRef.current = hack;
    hack.init(canvas, w, h);
    lastTimeRef.current = performance.now();

    // Animation loop
    const loop = (now: number) => {
      const dt = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;
      hack.draw(now, dt);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);

    // Resize handler
    const onResize = () => {
      const nw = window.innerWidth;
      const nh = window.innerHeight;
      canvas.width = nw;
      canvas.height = nh;
      if (hack.resize) hack.resize(nw, nh);
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', onResize);
      hack.destroy();
      hackRef.current = null;
    };
  }, [isActive, selectedHackId]);

  if (!isActive) return null;

  return (
    <div
      className="screensaver-overlay"
      onMouseDown={dismiss}
      onTouchStart={dismiss}
    >
      <canvas ref={canvasRef} className="screensaver-canvas" />
    </div>
  );
}
