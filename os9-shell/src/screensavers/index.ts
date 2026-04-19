// Screensaver hack registry
import type { ScreensaverHack } from './types';
import { matrixRain } from './matrix';
import { starfield } from './starfield';
import { plasma } from './plasma';
import { bouncingLogo } from './bouncing-logo';

export const screensaverHacks: ScreensaverHack[] = [
  matrixRain,
  starfield,
  plasma,
  bouncingLogo,
];

export function getHackById(id: string): ScreensaverHack | undefined {
  return screensaverHacks.find((h) => h.id === id);
}

export function getRandomHack(): ScreensaverHack {
  return screensaverHacks[Math.floor(Math.random() * screensaverHacks.length)];
}
