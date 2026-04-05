// hyperNova – Tween Engine
// GSAP-powered tweening for card objects: fadeIn, fadeOut, tweenTo, etc.
import gsap from 'gsap';

// ---------------------------------------------------------------------------
// Object opacity / transform state (keyed by object DOM id)
// ---------------------------------------------------------------------------

const objectStates = new Map<string, gsap.core.Tween[]>();

function getElement(objectId: string): HTMLElement | null {
  return document.querySelector(`[data-hn-obj="${objectId}"]`);
}

function killTweens(objectId: string) {
  const tweens = objectStates.get(objectId);
  if (tweens) {
    tweens.forEach((t) => t.kill());
    objectStates.delete(objectId);
  }
}

function trackTween(objectId: string, tween: gsap.core.Tween) {
  const existing = objectStates.get(objectId) ?? [];
  existing.push(tween);
  objectStates.set(objectId, existing);
}

// ---------------------------------------------------------------------------
// Public API — exposed to ScriptRunner
// ---------------------------------------------------------------------------

export interface TweenOptions {
  duration?: number;
  delay?: number;
  ease?: string;
  onComplete?: () => void;
}

export function fadeIn(objectId: string, opts: TweenOptions = {}) {
  const el = getElement(objectId);
  if (!el) return;
  killTweens(objectId);
  const tw = gsap.fromTo(
    el,
    { opacity: 0 },
    {
      opacity: 1,
      duration: opts.duration ?? 0.5,
      delay: opts.delay ?? 0,
      ease: opts.ease ?? 'power2.out',
      onComplete: opts.onComplete,
    },
  );
  trackTween(objectId, tw);
}

export function fadeOut(objectId: string, opts: TweenOptions = {}) {
  const el = getElement(objectId);
  if (!el) return;
  killTweens(objectId);
  const tw = gsap.to(el, {
    opacity: 0,
    duration: opts.duration ?? 0.5,
    delay: opts.delay ?? 0,
    ease: opts.ease ?? 'power2.in',
    onComplete: opts.onComplete,
  });
  trackTween(objectId, tw);
}

export interface TweenToProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  opacity?: number;
  scale?: number;
  rotation?: number;
}

export function tweenTo(
  objectId: string,
  props: TweenToProps,
  opts: TweenOptions = {},
) {
  const el = getElement(objectId);
  if (!el) return;
  killTweens(objectId);

  const gsapProps: gsap.TweenVars = {
    duration: opts.duration ?? 0.5,
    delay: opts.delay ?? 0,
    ease: opts.ease ?? 'power2.inOut',
    onComplete: opts.onComplete,
  };

  if (props.x !== undefined) gsapProps.left = props.x;
  if (props.y !== undefined) gsapProps.top = props.y;
  if (props.width !== undefined) gsapProps.width = props.width;
  if (props.height !== undefined) gsapProps.height = props.height;
  if (props.opacity !== undefined) gsapProps.opacity = props.opacity;
  if (props.scale !== undefined) gsapProps.scale = props.scale;
  if (props.rotation !== undefined) gsapProps.rotation = props.rotation;

  const tw = gsap.to(el, gsapProps);
  trackTween(objectId, tw);
}

export function pulse(objectId: string, opts: TweenOptions = {}) {
  const el = getElement(objectId);
  if (!el) return;
  killTweens(objectId);
  const tw = gsap.fromTo(
    el,
    { scale: 1 },
    {
      scale: 1.1,
      duration: opts.duration ?? 0.3,
      delay: opts.delay ?? 0,
      ease: 'power2.inOut',
      yoyo: true,
      repeat: 1,
      onComplete: opts.onComplete,
    },
  );
  trackTween(objectId, tw);
}

export function shake(objectId: string, opts: TweenOptions = {}) {
  const el = getElement(objectId);
  if (!el) return;
  killTweens(objectId);
  const tw = gsap.fromTo(
    el,
    { x: 0 },
    {
      x: 6,
      duration: opts.duration ?? 0.05,
      delay: opts.delay ?? 0,
      ease: 'power1.inOut',
      yoyo: true,
      repeat: 5,
      onComplete: () => {
        gsap.set(el, { x: 0 });
        opts.onComplete?.();
      },
    },
  );
  trackTween(objectId, tw);
}

export function slideIn(
  objectId: string,
  from: 'left' | 'right' | 'top' | 'bottom' = 'left',
  opts: TweenOptions = {},
) {
  const el = getElement(objectId);
  if (!el) return;
  killTweens(objectId);

  const offset = 60;
  const fromVars: gsap.TweenVars = { opacity: 0 };
  if (from === 'left') fromVars.x = -offset;
  else if (from === 'right') fromVars.x = offset;
  else if (from === 'top') fromVars.y = -offset;
  else fromVars.y = offset;

  const tw = gsap.fromTo(el, fromVars, {
    x: 0,
    y: 0,
    opacity: 1,
    duration: opts.duration ?? 0.5,
    delay: opts.delay ?? 0,
    ease: opts.ease ?? 'power2.out',
    onComplete: opts.onComplete,
  });
  trackTween(objectId, tw);
}

// ---------------------------------------------------------------------------
// Timeline for MovieClip playback
// ---------------------------------------------------------------------------

export interface MovieClipTimeline {
  timeline: gsap.core.Timeline;
  isPlaying: boolean;
}

const clipTimelines = new Map<string, MovieClipTimeline>();

export function createClipTimeline(
  symbolInstanceId: string,
  frameDuration: number,
  frameCount: number,
  loop: boolean,
  onFrame: (frame: number) => void,
): MovieClipTimeline {
  // Kill existing
  const existing = clipTimelines.get(symbolInstanceId);
  if (existing) {
    existing.timeline.kill();
  }

  const tl = gsap.timeline({
    repeat: loop ? -1 : 0,
    paused: true,
  });

  for (let i = 0; i < frameCount; i++) {
    tl.call(() => onFrame(i + 1), [], i * frameDuration);
  }
  // Pad total duration
  tl.to({}, { duration: frameDuration }, frameCount * frameDuration);

  const entry: MovieClipTimeline = { timeline: tl, isPlaying: false };
  clipTimelines.set(symbolInstanceId, entry);
  return entry;
}

export function playClip(symbolInstanceId: string) {
  const entry = clipTimelines.get(symbolInstanceId);
  if (entry) {
    entry.timeline.play();
    entry.isPlaying = true;
  }
}

export function stopClip(symbolInstanceId: string) {
  const entry = clipTimelines.get(symbolInstanceId);
  if (entry) {
    entry.timeline.pause();
    entry.isPlaying = false;
  }
}

export function gotoAndPlay(symbolInstanceId: string, frame: number) {
  const entry = clipTimelines.get(symbolInstanceId);
  if (entry) {
    const frameDur = entry.timeline.duration() / entry.timeline.labels.length || 0.083;
    entry.timeline.seek((frame - 1) * frameDur);
    entry.timeline.play();
    entry.isPlaying = true;
  }
}

export function gotoAndStop(symbolInstanceId: string, frame: number) {
  const entry = clipTimelines.get(symbolInstanceId);
  if (entry) {
    const frameDur = entry.timeline.duration() / entry.timeline.labels.length || 0.083;
    entry.timeline.seek((frame - 1) * frameDur);
    entry.timeline.pause();
    entry.isPlaying = false;
  }
}

export function killAllTweens() {
  objectStates.forEach((tweens) => tweens.forEach((t) => t.kill()));
  objectStates.clear();
  clipTimelines.forEach((entry) => entry.timeline.kill());
  clipTimelines.clear();
}
