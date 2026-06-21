// story-video-demo — a short slide story that ends with a fullscreen video.
//
// Web backend only: nova64.story (slide overlay) and nova64.video.playFullscreen
// (HTML5 <video> overlay) are DOM-based, so this runs on the threejs/babylon
// web console, not the RetroArch core (which has no mp4 decoder).
//
// Open: http://localhost:3000/console.html?demo=story-video-demo
//
// The story auto-advances hands-free; then the outro video plays fullscreen
// (public-domain "Big Buck Bunny" clip at public/assets/sample.mp4), and the
// cart shows "THE END". Press Enter to advance slides manually, Escape/Enter
// to skip the video.

let screen = 'story';
let outroStarted = false;

const SLIDES = [
  {
    image: '/assets/novaOS/novaMascot.png',
    text: 'NOVA64 // a short tale before the show.',
    prompt: 'Enter — or just wait',
  },
  {
    image: '/assets/novaOS/novaMascot.png',
    text: 'Our hero reaches the final gate.',
    prompt: 'Enter — or just wait',
  },
  {
    image: '/assets/novaOS/novaMascot.png',
    text: 'Beyond it waits a vision. Roll the tape…',
    prompt: 'Enter to play the outro',
  },
];

export function init() {
  runStory();
}

function runStory() {
  screen = 'story';
  outroStarted = false;
  nova64.story
    .play(SLIDES, {
      transition: 'pixel-melt',
      autoAdvance: 3.0, // hands-free: advance every 3s (Enter still works)
    })
    .then(({ finished }) => {
      if (finished) playOutro();
    });
}

function playOutro() {
  if (outroStarted) return;
  outroStarted = true;
  screen = 'video';
  nova64.video
    .playFullscreen('/assets/sample.mp4', {
      muted: true,
      onFinish: () => {
        screen = 'done';
      },
    })
    .then(() => {
      screen = 'done';
    });
}

export function update(dt) {
  // Drive the story helper so transitions animate and autoAdvance fires.
  if (screen === 'story') nova64.story._tick?.(dt);
}

export function draw() {
  // story.play() and video.playFullscreen() paint their own overlays; the cart
  // only needs to draw the final "THE END" card.
  if (screen === 'story' || screen === 'video') return;
  const W = width();
  const H = height();
  fill(0, 0, W, H, 0x05030fff);
  drawText('THE END', W / 2 - 30, H / 2 - 8, 0xffffff, 18);
  drawText('story → video demo', 8, H - 14, 0x4488aa, 9);
}

// Dev hooks: replay the story or jump straight to the video from the console.
globalThis.__STORY_VIDEO_DEBUG = { replayStory: runStory, playVideo: playOutro };
