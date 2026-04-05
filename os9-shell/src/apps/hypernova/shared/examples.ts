// hyperNova – Built-in Example Projects
// A collection of compelling demo stacks that showcase hyperNova's features

import type {
  HyperNovaProject, TextObject, ButtonObject, FieldObject,
  RectObject,
} from './schema';
import { genId } from './schema';

// ---------------------------------------------------------------------------
// Catalog entry
// ---------------------------------------------------------------------------

export interface ExampleEntry {
  id: string;
  name: string;
  description: string;
  icon: string;
  create: () => HyperNovaProject;
}

// ---------------------------------------------------------------------------
// 1. Interactive Story Book
// ---------------------------------------------------------------------------

function createStoryBook(): HyperNovaProject {
  const c1 = genId(), c2 = genId(), c3 = genId(), c4 = genId(), c5 = genId();

  return {
    version: 1,
    name: 'The Lost Astronaut',
    stacks: [{
      id: genId(),
      title: 'Story',
      cards: [
        {
          id: c1, title: 'Cover',
          background: { type: '2d-gradient', color: '#0a0a2e', gradientTo: '#1a0a3e' },
          objects: [
            { id: genId(), type: 'text', x: 120, y: 40, width: 400, height: 60, text: '🚀 The Lost Astronaut', fontSize: 32, color: '#e8d44d', bold: true, italic: false } as TextObject,
            { id: genId(), type: 'text', x: 120, y: 110, width: 400, height: 30, text: 'An Interactive Story', fontSize: 18, color: '#8888cc', bold: false, italic: true } as TextObject,
            { id: genId(), type: 'rect', x: 220, y: 150, width: 200, height: 100, bgColor: '#111133', borderColor: '#4444aa', borderWidth: 2, borderRadius: 12 } as RectObject,
            { id: genId(), type: 'text', x: 230, y: 165, width: 180, height: 70, text: '✨ ★ ✦ ✧\n🌍      🚀\n✧ ★ ✨ ✦', fontSize: 22, color: '#ffffff', bold: false, italic: false } as TextObject,
            { id: genId(), type: 'text', x: 140, y: 270, width: 360, height: 24, text: 'Click below to begin your journey…', fontSize: 14, color: '#6666aa', bold: false, italic: false } as TextObject,
            { id: genId(), type: 'button', x: 240, y: 300, width: 160, height: 40, label: '▶ Begin', bgColor: '#3a6edd', textColor: '#ffffff', script: `goToCard("${c2}");` } as ButtonObject,
          ],
        },
        {
          id: c2, title: 'Chapter 1',
          background: { type: '2d-color', color: '#0d1b2a' },
          objects: [
            { id: genId(), type: 'text', x: 40, y: 20, width: 560, height: 30, text: 'Chapter 1: The Signal', fontSize: 22, color: '#7ec8e3', bold: true, italic: false } as TextObject,
            { id: genId(), type: 'rect', x: 40, y: 60, width: 560, height: 140, bgColor: '#0a1520', borderColor: '#1a3a5a', borderWidth: 1, borderRadius: 8 } as RectObject,
            { id: genId(), type: 'text', x: 55, y: 70, width: 530, height: 120, text: 'Commander Reyes drifted through the silent void. The radio had been dead for 47 hours when a strange pulse appeared on the scanner.\n\n"Unknown origin… but it\'s definitely artificial."\n\nShe had to make a choice.', fontSize: 14, color: '#c0d8e8', bold: false, italic: false } as TextObject,
            { id: genId(), type: 'button', x: 40, y: 220, width: 260, height: 44, label: '🛸 Follow the signal', bgColor: '#1a5a3a', textColor: '#ffffff', script: `goToCard("${c3}");` } as ButtonObject,
            { id: genId(), type: 'button', x: 320, y: 220, width: 280, height: 44, label: '📡 Try to repair the radio', bgColor: '#5a3a1a', textColor: '#ffffff', script: `goToCard("${c4}");` } as ButtonObject,
            { id: genId(), type: 'button', x: 40, y: 310, width: 100, height: 30, label: '← Cover', bgColor: '#2a2a4a', textColor: '#8888cc', script: `goToCard("${c1}");` } as ButtonObject,
          ],
        },
        {
          id: c3, title: 'Follow Signal',
          background: { type: '2d-gradient', color: '#0a1a0a', gradientTo: '#0a2a1a' },
          objects: [
            { id: genId(), type: 'text', x: 40, y: 20, width: 560, height: 30, text: '🛸 The Signal Source', fontSize: 22, color: '#5ae85a', bold: true, italic: false } as TextObject,
            { id: genId(), type: 'rect', x: 40, y: 60, width: 560, height: 160, bgColor: '#061008', borderColor: '#1a5a2a', borderWidth: 1, borderRadius: 8 } as RectObject,
            { id: genId(), type: 'text', x: 55, y: 70, width: 530, height: 140, text: 'The signal led to an enormous structure—a station of impossible geometry, spinning slowly in the dark. Its hull shimmered with bioluminescent patterns.\n\nAs Reyes approached, the station\'s airlocks opened on their own, as if it had been waiting.\n\n"Welcome, traveler," a synthetic voice whispered. "We have been expecting you for a very long time."', fontSize: 13, color: '#a0e8a0', bold: false, italic: false } as TextObject,
            { id: genId(), type: 'button', x: 200, y: 240, width: 240, height: 40, label: '🌟 Enter the station →', bgColor: '#2a7a3a', textColor: '#ffffff', script: `goToCard("${c5}");` } as ButtonObject,
            { id: genId(), type: 'button', x: 40, y: 310, width: 120, height: 30, label: '← Go back', bgColor: '#2a2a4a', textColor: '#8888cc', script: `goToCard("${c2}");` } as ButtonObject,
          ],
        },
        {
          id: c4, title: 'Repair Radio',
          background: { type: '2d-gradient', color: '#2a1a0a', gradientTo: '#1a0a00' },
          objects: [
            { id: genId(), type: 'text', x: 40, y: 20, width: 560, height: 30, text: '📡 Radio Repair', fontSize: 22, color: '#e8a848', bold: true, italic: false } as TextObject,
            { id: genId(), type: 'rect', x: 40, y: 60, width: 560, height: 160, bgColor: '#1a1008', borderColor: '#5a3a1a', borderWidth: 1, borderRadius: 8 } as RectObject,
            { id: genId(), type: 'text', x: 55, y: 70, width: 530, height: 140, text: 'With careful precision, Reyes bypassed the damaged transponder and rerouted power from navigation. The radio crackled to life.\n\n"Mayday, mayday—this is Orbital Relay 7. Do not follow the signal. Repeat, do NOT follow the signal. It\'s a—"\n\nThe transmission cut to static.', fontSize: 13, color: '#e8d0a0', bold: false, italic: false } as TextObject,
            { id: genId(), type: 'button', x: 140, y: 240, width: 180, height: 40, label: '🛸 Follow anyway', bgColor: '#5a3a1a', textColor: '#ffffff', script: `goToCard("${c3}");` } as ButtonObject,
            { id: genId(), type: 'button', x: 340, y: 240, width: 180, height: 40, label: '🏠 Head home', bgColor: '#3a5a7a', textColor: '#ffffff', script: `goToCard("${c5}");` } as ButtonObject,
            { id: genId(), type: 'button', x: 40, y: 310, width: 120, height: 30, label: '← Go back', bgColor: '#2a2a4a', textColor: '#8888cc', script: `goToCard("${c2}");` } as ButtonObject,
          ],
        },
        {
          id: c5, title: 'Ending',
          background: { type: '2d-gradient', color: '#1a0a2e', gradientTo: '#0a0a1a' },
          objects: [
            { id: genId(), type: 'text', x: 80, y: 40, width: 480, height: 40, text: '🌌 To Be Continued…', fontSize: 30, color: '#c8a8ff', bold: true, italic: false } as TextObject,
            { id: genId(), type: 'rect', x: 100, y: 100, width: 440, height: 120, bgColor: '#0a0a20', borderColor: '#4a3a8a', borderWidth: 2, borderRadius: 10 } as RectObject,
            { id: genId(), type: 'text', x: 120, y: 115, width: 400, height: 90, text: 'Commander Reyes\'s journey has only just begun. What secrets does the void hold? What lurks beyond the signal?\n\nThis is where YOUR story continues. Switch to Edit mode and add more cards!', fontSize: 14, color: '#b8a8e8', bold: false, italic: false } as TextObject,
            { id: genId(), type: 'button', x: 220, y: 260, width: 200, height: 40, label: '↺ Read Again', bgColor: '#4a3a8a', textColor: '#ffffff', script: `goToCard("${c1}");` } as ButtonObject,
            { id: genId(), type: 'text', x: 160, y: 320, width: 320, height: 20, text: 'Built with hyperNova • novaOS', fontSize: 11, color: '#3a3a6a', bold: false, italic: false } as TextObject,
          ],
        },
      ],
    }],
    assets: { images: {} },
    library: [],
  };
}

// ---------------------------------------------------------------------------
// 2. Quiz App
// ---------------------------------------------------------------------------

function createQuizApp(): HyperNovaProject {
  const cStart = genId(), cQ1 = genId(), cQ2 = genId(), cQ3 = genId();
  const cWrong = genId(), cResults = genId();

  return {
    version: 1,
    name: 'Space Quiz',
    stacks: [{
      id: genId(),
      title: 'Quiz',
      cards: [
        {
          id: cStart, title: 'Start',
          background: { type: '2d-gradient', color: '#0a0a2a', gradientTo: '#1a1a4a' },
          objects: [
            { id: genId(), type: 'text', x: 140, y: 40, width: 360, height: 50, text: '🧠 Space Quiz', fontSize: 36, color: '#ffd700', bold: true, italic: false } as TextObject,
            { id: genId(), type: 'text', x: 120, y: 100, width: 400, height: 30, text: 'Test your knowledge of the cosmos!', fontSize: 16, color: '#8888cc', bold: false, italic: false } as TextObject,
            { id: genId(), type: 'rect', x: 160, y: 145, width: 320, height: 100, bgColor: '#0a0a30', borderColor: '#3a3a8a', borderWidth: 2, borderRadius: 10 } as RectObject,
            { id: genId(), type: 'text', x: 180, y: 155, width: 280, height: 80, text: '🌟 3 questions\n⏱️ No time limit\n🏆 See your score at the end', fontSize: 14, color: '#a8a8ff', bold: false, italic: false } as TextObject,
            { id: genId(), type: 'button', x: 220, y: 280, width: 200, height: 44, label: '🚀 Start Quiz', bgColor: '#4a7aff', textColor: '#ffffff', script: `goToCard("${cQ1}");` } as ButtonObject,
          ],
        },
        {
          id: cQ1, title: 'Question 1',
          background: { type: '2d-color', color: '#0d1a2d' },
          objects: [
            { id: genId(), type: 'rect', x: 0, y: 0, width: 640, height: 50, bgColor: '#111a30', borderColor: '#1a2a4a', borderWidth: 0, borderRadius: 0 } as RectObject,
            { id: genId(), type: 'text', x: 20, y: 12, width: 200, height: 26, text: 'Question 1 of 3', fontSize: 14, color: '#4a7aff', bold: true, italic: false } as TextObject,
            { id: genId(), type: 'text', x: 40, y: 70, width: 560, height: 50, text: 'What is the largest planet in our solar system?', fontSize: 22, color: '#e0e0ff', bold: true, italic: false } as TextObject,
            { id: genId(), type: 'button', x: 60, y: 140, width: 250, height: 40, label: 'A) Saturn', bgColor: '#1a2a5a', textColor: '#c0c0ff', script: `goToCard("${cWrong}");` } as ButtonObject,
            { id: genId(), type: 'button', x: 330, y: 140, width: 250, height: 40, label: 'B) Jupiter', bgColor: '#1a2a5a', textColor: '#c0c0ff', script: `goToCard("${cQ2}");` } as ButtonObject,
            { id: genId(), type: 'button', x: 60, y: 195, width: 250, height: 40, label: 'C) Neptune', bgColor: '#1a2a5a', textColor: '#c0c0ff', script: `goToCard("${cWrong}");` } as ButtonObject,
            { id: genId(), type: 'button', x: 330, y: 195, width: 250, height: 40, label: 'D) Uranus', bgColor: '#1a2a5a', textColor: '#c0c0ff', script: `goToCard("${cWrong}");` } as ButtonObject,
          ],
        },
        {
          id: cQ2, title: 'Question 2',
          background: { type: '2d-color', color: '#0d1a2d' },
          objects: [
            { id: genId(), type: 'rect', x: 0, y: 0, width: 640, height: 50, bgColor: '#111a30', borderColor: '#1a2a4a', borderWidth: 0, borderRadius: 0 } as RectObject,
            { id: genId(), type: 'text', x: 20, y: 12, width: 200, height: 26, text: 'Question 2 of 3', fontSize: 14, color: '#4a7aff', bold: true, italic: false } as TextObject,
            { id: genId(), type: 'text', x: 40, y: 70, width: 560, height: 50, text: 'How many minutes does light from the Sun take to reach Earth?', fontSize: 20, color: '#e0e0ff', bold: true, italic: false } as TextObject,
            { id: genId(), type: 'button', x: 60, y: 140, width: 250, height: 40, label: 'A) About 8 minutes', bgColor: '#1a2a5a', textColor: '#c0c0ff', script: `goToCard("${cQ3}");` } as ButtonObject,
            { id: genId(), type: 'button', x: 330, y: 140, width: 250, height: 40, label: 'B) About 1 minute', bgColor: '#1a2a5a', textColor: '#c0c0ff', script: `goToCard("${cWrong}");` } as ButtonObject,
            { id: genId(), type: 'button', x: 60, y: 195, width: 250, height: 40, label: 'C) About 30 minutes', bgColor: '#1a2a5a', textColor: '#c0c0ff', script: `goToCard("${cWrong}");` } as ButtonObject,
            { id: genId(), type: 'button', x: 330, y: 195, width: 250, height: 40, label: 'D) About 60 minutes', bgColor: '#1a2a5a', textColor: '#c0c0ff', script: `goToCard("${cWrong}");` } as ButtonObject,
          ],
        },
        {
          id: cQ3, title: 'Question 3',
          background: { type: '2d-color', color: '#0d1a2d' },
          objects: [
            { id: genId(), type: 'rect', x: 0, y: 0, width: 640, height: 50, bgColor: '#111a30', borderColor: '#1a2a4a', borderWidth: 0, borderRadius: 0 } as RectObject,
            { id: genId(), type: 'text', x: 20, y: 12, width: 200, height: 26, text: 'Question 3 of 3', fontSize: 14, color: '#4a7aff', bold: true, italic: false } as TextObject,
            { id: genId(), type: 'text', x: 40, y: 70, width: 560, height: 50, text: 'What galaxy do we live in?', fontSize: 22, color: '#e0e0ff', bold: true, italic: false } as TextObject,
            { id: genId(), type: 'button', x: 60, y: 140, width: 250, height: 40, label: 'A) Andromeda', bgColor: '#1a2a5a', textColor: '#c0c0ff', script: `goToCard("${cWrong}");` } as ButtonObject,
            { id: genId(), type: 'button', x: 330, y: 140, width: 250, height: 40, label: 'B) Triangulum', bgColor: '#1a2a5a', textColor: '#c0c0ff', script: `goToCard("${cWrong}");` } as ButtonObject,
            { id: genId(), type: 'button', x: 60, y: 195, width: 250, height: 40, label: 'C) Milky Way', bgColor: '#1a2a5a', textColor: '#c0c0ff', script: `goToCard("${cResults}");` } as ButtonObject,
            { id: genId(), type: 'button', x: 330, y: 195, width: 250, height: 40, label: 'D) Sombrero', bgColor: '#1a2a5a', textColor: '#c0c0ff', script: `goToCard("${cWrong}");` } as ButtonObject,
          ],
        },
        {
          id: cWrong, title: 'Oops!',
          background: { type: '2d-color', color: '#2a0a0a' },
          objects: [
            { id: genId(), type: 'text', x: 160, y: 100, width: 320, height: 60, text: '❌ Not quite!', fontSize: 36, color: '#ff6666', bold: true, italic: false } as TextObject,
            { id: genId(), type: 'text', x: 140, y: 170, width: 360, height: 30, text: 'That\'s okay — try the quiz again!', fontSize: 18, color: '#e8a0a0', bold: false, italic: false } as TextObject,
            { id: genId(), type: 'button', x: 220, y: 240, width: 200, height: 40, label: '↺ Restart Quiz', bgColor: '#7a2a2a', textColor: '#ffffff', script: `goToCard("${cQ1}");` } as ButtonObject,
          ],
        },
        {
          id: cResults, title: 'Results',
          background: { type: '2d-gradient', color: '#1a1a00', gradientTo: '#0a0a2a' },
          objects: [
            { id: genId(), type: 'text', x: 140, y: 40, width: 360, height: 50, text: '🏆 Quiz Complete!', fontSize: 32, color: '#ffd700', bold: true, italic: false } as TextObject,
            { id: genId(), type: 'rect', x: 160, y: 110, width: 320, height: 120, bgColor: '#1a1a20', borderColor: '#ffd700', borderWidth: 2, borderRadius: 12 } as RectObject,
            { id: genId(), type: 'text', x: 180, y: 125, width: 280, height: 90, text: '⭐⭐⭐\n\nYou answered all 3 correctly!\nYou\'re a space expert!', fontSize: 16, color: '#e8e8a8', bold: false, italic: false } as TextObject,
            { id: genId(), type: 'button', x: 180, y: 260, width: 120, height: 38, label: '↺ Play Again', bgColor: '#4a7aff', textColor: '#ffffff', script: `goToCard("${cStart}");` } as ButtonObject,
            { id: genId(), type: 'button', x: 320, y: 260, width: 140, height: 38, label: '✏️ Edit Quiz', bgColor: '#3a3a6a', textColor: '#c0c0ff', script: '' } as ButtonObject,
            { id: genId(), type: 'text', x: 180, y: 320, width: 280, height: 20, text: 'Switch to Edit mode to customize!', fontSize: 11, color: '#5a5a8a', bold: false, italic: false } as TextObject,
          ],
        },
      ],
    }],
    assets: { images: {} },
    library: [],
  };
}

// ---------------------------------------------------------------------------
// 3. Portfolio / Presentation
// ---------------------------------------------------------------------------

function createPortfolio(): HyperNovaProject {
  const c1 = genId(), c2 = genId(), c3 = genId(), c4 = genId(), c5 = genId();

  return {
    version: 1,
    name: 'Creative Portfolio',
    stacks: [{
      id: genId(),
      title: 'Portfolio',
      cards: [
        {
          id: c1, title: 'Home',
          background: { type: '2d-gradient', color: '#1a1a2e', gradientTo: '#16213e' },
          objects: [
            { id: genId(), type: 'rect', x: 0, y: 0, width: 640, height: 80, bgColor: 'rgba(0,0,0,0.3)', borderColor: 'transparent', borderWidth: 0, borderRadius: 0 } as RectObject,
            { id: genId(), type: 'text', x: 30, y: 22, width: 300, height: 36, text: '◆ NOVA STUDIO', fontSize: 20, color: '#ffffff', bold: true, italic: false } as TextObject,
            { id: genId(), type: 'button', x: 340, y: 25, width: 80, height: 30, label: 'Work', bgColor: 'transparent', textColor: '#8888ff', script: `goToCard("${c2}");` } as ButtonObject,
            { id: genId(), type: 'button', x: 430, y: 25, width: 80, height: 30, label: 'About', bgColor: 'transparent', textColor: '#8888ff', script: `goToCard("${c4}");` } as ButtonObject,
            { id: genId(), type: 'button', x: 520, y: 25, width: 90, height: 30, label: 'Contact', bgColor: 'transparent', textColor: '#8888ff', script: `goToCard("${c5}");` } as ButtonObject,
            { id: genId(), type: 'text', x: 60, y: 120, width: 520, height: 50, text: 'We create digital experiences\nthat inspire and delight.', fontSize: 26, color: '#ffffff', bold: true, italic: false } as TextObject,
            { id: genId(), type: 'text', x: 60, y: 190, width: 400, height: 30, text: 'Design • Development • Innovation', fontSize: 16, color: '#6688cc', bold: false, italic: false } as TextObject,
            { id: genId(), type: 'button', x: 60, y: 250, width: 180, height: 44, label: 'View Our Work →', bgColor: '#4a6aff', textColor: '#ffffff', script: `goToCard("${c2}");` } as ButtonObject,
            { id: genId(), type: 'text', x: 60, y: 325, width: 520, height: 20, text: '© 2026 Nova Studio — Built with hyperNova', fontSize: 10, color: '#3a3a6a', bold: false, italic: false } as TextObject,
          ],
        },
        {
          id: c2, title: 'Work - Project 1',
          background: { type: '2d-color', color: '#111122' },
          objects: [
            { id: genId(), type: 'rect', x: 0, y: 0, width: 640, height: 50, bgColor: 'rgba(0,0,0,0.4)', borderColor: 'transparent', borderWidth: 0, borderRadius: 0 } as RectObject,
            { id: genId(), type: 'text', x: 20, y: 13, width: 200, height: 26, text: '◆ WORK', fontSize: 16, color: '#ffffff', bold: true, italic: false } as TextObject,
            { id: genId(), type: 'button', x: 540, y: 10, width: 80, height: 30, label: '← Home', bgColor: 'transparent', textColor: '#6688cc', script: `goToCard("${c1}");` } as ButtonObject,
            { id: genId(), type: 'rect', x: 30, y: 70, width: 280, height: 180, bgColor: '#1a2a4a', borderColor: '#2a4a7a', borderWidth: 1, borderRadius: 8 } as RectObject,
            { id: genId(), type: 'text', x: 50, y: 85, width: 240, height: 30, text: '🎮 Nova64 Console', fontSize: 18, color: '#4a9eff', bold: true, italic: false } as TextObject,
            { id: genId(), type: 'text', x: 50, y: 120, width: 240, height: 100, text: 'A retro 3D fantasy console for the modern web. Built with Three.js, featuring N64-era aesthetics.', fontSize: 13, color: '#8888bb', bold: false, italic: false } as TextObject,
            { id: genId(), type: 'rect', x: 330, y: 70, width: 280, height: 180, bgColor: '#2a1a2a', borderColor: '#6a3a6a', borderWidth: 1, borderRadius: 8 } as RectObject,
            { id: genId(), type: 'text', x: 350, y: 85, width: 240, height: 30, text: '🃏 hyperNova Editor', fontSize: 18, color: '#cc66ff', bold: true, italic: false } as TextObject,
            { id: genId(), type: 'text', x: 350, y: 120, width: 240, height: 100, text: 'A HyperCard-inspired authoring tool with visual editing, scripting, and symbols.', fontSize: 13, color: '#8888bb', bold: false, italic: false } as TextObject,
            { id: genId(), type: 'button', x: 250, y: 280, width: 140, height: 36, label: 'More Work →', bgColor: '#2a2a5a', textColor: '#aaaaff', script: `goToCard("${c3}");` } as ButtonObject,
          ],
        },
        {
          id: c3, title: 'Work - Project 2',
          background: { type: '2d-color', color: '#111122' },
          objects: [
            { id: genId(), type: 'rect', x: 0, y: 0, width: 640, height: 50, bgColor: 'rgba(0,0,0,0.4)', borderColor: 'transparent', borderWidth: 0, borderRadius: 0 } as RectObject,
            { id: genId(), type: 'text', x: 20, y: 13, width: 200, height: 26, text: '◆ WORK', fontSize: 16, color: '#ffffff', bold: true, italic: false } as TextObject,
            { id: genId(), type: 'button', x: 540, y: 10, width: 80, height: 30, label: '← Home', bgColor: 'transparent', textColor: '#6688cc', script: `goToCard("${c1}");` } as ButtonObject,
            { id: genId(), type: 'rect', x: 30, y: 70, width: 580, height: 200, bgColor: '#0a1a1a', borderColor: '#1a5a4a', borderWidth: 1, borderRadius: 10 } as RectObject,
            { id: genId(), type: 'text', x: 50, y: 85, width: 300, height: 30, text: '🌐 novaOS Shell', fontSize: 20, color: '#4ae8b0', bold: true, italic: false } as TextObject,
            { id: genId(), type: 'text', x: 50, y: 120, width: 540, height: 130, text: 'A complete web-based operating system with window management, file system, applications, and a beautiful retro aesthetic.\n\nFeatures:\n• Draggable, resizable windows with 8-edge resize\n• Desktop icons and control strip\n• Built-in apps: Notes, Paint, Profiler, and more', fontSize: 13, color: '#88ccaa', bold: false, italic: false } as TextObject,
            { id: genId(), type: 'button', x: 220, y: 290, width: 100, height: 34, label: '← Prev', bgColor: '#2a2a5a', textColor: '#aaaaff', script: `goToCard("${c2}");` } as ButtonObject,
            { id: genId(), type: 'button', x: 340, y: 290, width: 100, height: 34, label: 'About →', bgColor: '#2a2a5a', textColor: '#aaaaff', script: `goToCard("${c4}");` } as ButtonObject,
          ],
        },
        {
          id: c4, title: 'About',
          background: { type: '2d-gradient', color: '#1a1a2e', gradientTo: '#0a1a1a' },
          objects: [
            { id: genId(), type: 'rect', x: 0, y: 0, width: 640, height: 50, bgColor: 'rgba(0,0,0,0.4)', borderColor: 'transparent', borderWidth: 0, borderRadius: 0 } as RectObject,
            { id: genId(), type: 'text', x: 20, y: 13, width: 200, height: 26, text: '◆ ABOUT', fontSize: 16, color: '#ffffff', bold: true, italic: false } as TextObject,
            { id: genId(), type: 'button', x: 540, y: 10, width: 80, height: 30, label: '← Home', bgColor: 'transparent', textColor: '#6688cc', script: `goToCard("${c1}");` } as ButtonObject,
            { id: genId(), type: 'rect', x: 40, y: 80, width: 100, height: 100, bgColor: '#1a2a4a', borderColor: '#3a5a8a', borderWidth: 2, borderRadius: 50 } as RectObject,
            { id: genId(), type: 'text', x: 58, y: 110, width: 64, height: 40, text: '👩‍💻', fontSize: 36, color: '#ffffff', bold: false, italic: false } as TextObject,
            { id: genId(), type: 'text', x: 170, y: 80, width: 400, height: 30, text: 'Jane Nova', fontSize: 24, color: '#ffffff', bold: true, italic: false } as TextObject,
            { id: genId(), type: 'text', x: 170, y: 115, width: 400, height: 24, text: 'Creative Developer & Designer', fontSize: 14, color: '#6688cc', bold: false, italic: true } as TextObject,
            { id: genId(), type: 'text', x: 40, y: 200, width: 560, height: 80, text: 'Passionate about building tools that empower creators. Combining design sensibility with engineering precision to craft digital experiences that feel magical.', fontSize: 14, color: '#a0a0cc', bold: false, italic: false } as TextObject,
            { id: genId(), type: 'button', x: 440, y: 300, width: 160, height: 36, label: 'Contact →', bgColor: '#4a6aff', textColor: '#ffffff', script: `goToCard("${c5}");` } as ButtonObject,
          ],
        },
        {
          id: c5, title: 'Contact',
          background: { type: '2d-gradient', color: '#0a0a2e', gradientTo: '#1a0a2a' },
          objects: [
            { id: genId(), type: 'rect', x: 0, y: 0, width: 640, height: 50, bgColor: 'rgba(0,0,0,0.4)', borderColor: 'transparent', borderWidth: 0, borderRadius: 0 } as RectObject,
            { id: genId(), type: 'text', x: 20, y: 13, width: 200, height: 26, text: '◆ CONTACT', fontSize: 16, color: '#ffffff', bold: true, italic: false } as TextObject,
            { id: genId(), type: 'button', x: 540, y: 10, width: 80, height: 30, label: '← Home', bgColor: 'transparent', textColor: '#6688cc', script: `goToCard("${c1}");` } as ButtonObject,
            { id: genId(), type: 'text', x: 120, y: 80, width: 400, height: 40, text: 'Let\'s work together', fontSize: 28, color: '#ffffff', bold: true, italic: false } as TextObject,
            { id: genId(), type: 'text', x: 120, y: 130, width: 400, height: 24, text: 'Fill out the form and we\'ll get back to you.', fontSize: 14, color: '#6688cc', bold: false, italic: false } as TextObject,
            { id: genId(), type: 'text', x: 120, y: 175, width: 80, height: 24, text: 'Name', fontSize: 13, color: '#8888bb', bold: false, italic: false } as TextObject,
            { id: genId(), type: 'field', x: 120, y: 195, width: 400, height: 34, placeholder: 'Your name…', value: '', fontSize: 14 } as FieldObject,
            { id: genId(), type: 'text', x: 120, y: 240, width: 80, height: 24, text: 'Message', fontSize: 13, color: '#8888bb', bold: false, italic: false } as TextObject,
            { id: genId(), type: 'field', x: 120, y: 260, width: 400, height: 34, placeholder: 'Your message…', value: '', fontSize: 14 } as FieldObject,
            { id: genId(), type: 'button', x: 380, y: 310, width: 140, height: 36, label: '✉ Send', bgColor: '#4a6aff', textColor: '#ffffff', script: `alert("Thanks for reaching out!");` } as ButtonObject,
          ],
        },
      ],
    }],
    assets: { images: {} },
    library: [],
  };
}

// ---------------------------------------------------------------------------
// 4. Retro RPG Character Creator
// ---------------------------------------------------------------------------

function createCharacterCreator(): HyperNovaProject {
  const cTitle = genId(), cClass = genId(), cName = genId(), cStats = genId(), cResult = genId();

  return {
    version: 1,
    name: 'RPG Character Creator',
    stacks: [{
      id: genId(),
      title: 'Character Creator',
      cards: [
        {
          id: cTitle, title: 'Title Screen',
          background: { type: '2d-gradient', color: '#1a0a0a', gradientTo: '#0a0a1a' },
          objects: [
            { id: genId(), type: 'rect', x: 120, y: 30, width: 400, height: 100, bgColor: '#0a0a1a', borderColor: '#8a4a2a', borderWidth: 3, borderRadius: 8 } as RectObject,
            { id: genId(), type: 'text', x: 140, y: 42, width: 360, height: 40, text: '⚔️ REALM OF NOVA', fontSize: 30, color: '#ffd700', bold: true, italic: false } as TextObject,
            { id: genId(), type: 'text', x: 180, y: 88, width: 280, height: 24, text: 'Character Creation', fontSize: 16, color: '#cc8844', bold: false, italic: true } as TextObject,
            { id: genId(), type: 'rect', x: 140, y: 155, width: 360, height: 120, bgColor: '#1a0a08', borderColor: '#4a2a1a', borderWidth: 1, borderRadius: 6 } as RectObject,
            { id: genId(), type: 'text', x: 160, y: 165, width: 320, height: 100, text: 'Welcome, adventurer!\n\nBefore you embark on your quest, you must forge your hero. Choose wisely — your path through the realm depends on it.', fontSize: 13, color: '#cc9966', bold: false, italic: false } as TextObject,
            { id: genId(), type: 'button', x: 220, y: 300, width: 200, height: 42, label: '⚔️ Begin', bgColor: '#8a4a2a', textColor: '#ffd700', script: `goToCard("${cClass}");` } as ButtonObject,
          ],
        },
        {
          id: cClass, title: 'Choose Class',
          background: { type: '2d-color', color: '#0d0810' },
          objects: [
            { id: genId(), type: 'text', x: 40, y: 15, width: 560, height: 36, text: 'Choose Your Class', fontSize: 24, color: '#ffd700', bold: true, italic: false } as TextObject,
            { id: genId(), type: 'rect', x: 20, y: 60, width: 190, height: 180, bgColor: '#1a0808', borderColor: '#aa3333', borderWidth: 2, borderRadius: 8 } as RectObject,
            { id: genId(), type: 'text', x: 30, y: 68, width: 170, height: 24, text: '⚔️ Warrior', fontSize: 18, color: '#ff6644', bold: true, italic: false } as TextObject,
            { id: genId(), type: 'text', x: 30, y: 96, width: 170, height: 80, text: 'STR ████████░░\nDEF ██████░░░░\nMAG ██░░░░░░░░\nSPD ████░░░░░░', fontSize: 11, color: '#cc8866', bold: false, italic: false } as TextObject,
            { id: genId(), type: 'button', x: 40, y: 200, width: 150, height: 30, label: 'Choose Warrior', bgColor: '#aa3333', textColor: '#ffffff', script: `goToCard("${cName}");` } as ButtonObject,
            { id: genId(), type: 'rect', x: 225, y: 60, width: 190, height: 180, bgColor: '#080818', borderColor: '#3366cc', borderWidth: 2, borderRadius: 8 } as RectObject,
            { id: genId(), type: 'text', x: 235, y: 68, width: 170, height: 24, text: '🧙 Mage', fontSize: 18, color: '#6688ff', bold: true, italic: false } as TextObject,
            { id: genId(), type: 'text', x: 235, y: 96, width: 170, height: 80, text: 'STR ██░░░░░░░░\nDEF ████░░░░░░\nMAG ████████░░\nSPD ██████░░░░', fontSize: 11, color: '#8888cc', bold: false, italic: false } as TextObject,
            { id: genId(), type: 'button', x: 245, y: 200, width: 150, height: 30, label: 'Choose Mage', bgColor: '#3366cc', textColor: '#ffffff', script: `goToCard("${cName}");` } as ButtonObject,
            { id: genId(), type: 'rect', x: 430, y: 60, width: 190, height: 180, bgColor: '#081008', borderColor: '#33aa55', borderWidth: 2, borderRadius: 8 } as RectObject,
            { id: genId(), type: 'text', x: 440, y: 68, width: 170, height: 24, text: '🏹 Ranger', fontSize: 18, color: '#55cc66', bold: true, italic: false } as TextObject,
            { id: genId(), type: 'text', x: 440, y: 96, width: 170, height: 80, text: 'STR ██████░░░░\nDEF ████░░░░░░\nMAG ████░░░░░░\nSPD ████████░░', fontSize: 11, color: '#88cc88', bold: false, italic: false } as TextObject,
            { id: genId(), type: 'button', x: 450, y: 200, width: 150, height: 30, label: 'Choose Ranger', bgColor: '#33aa55', textColor: '#ffffff', script: `goToCard("${cName}");` } as ButtonObject,
            { id: genId(), type: 'text', x: 120, y: 260, width: 400, height: 20, text: 'Each class has unique strengths — choose the one that fits your play style!', fontSize: 11, color: '#555555', bold: false, italic: true } as TextObject,
            { id: genId(), type: 'button', x: 20, y: 310, width: 100, height: 30, label: '← Back', bgColor: '#2a2a3a', textColor: '#888888', script: `goToCard("${cTitle}");` } as ButtonObject,
          ],
        },
        {
          id: cName, title: 'Name Your Hero',
          background: { type: '2d-gradient', color: '#0a0810', gradientTo: '#0a0a1a' },
          objects: [
            { id: genId(), type: 'text', x: 120, y: 60, width: 400, height: 40, text: 'Name Your Hero', fontSize: 26, color: '#ffd700', bold: true, italic: false } as TextObject,
            { id: genId(), type: 'text', x: 120, y: 110, width: 400, height: 24, text: 'Every legend begins with a name…', fontSize: 14, color: '#888888', bold: false, italic: true } as TextObject,
            { id: genId(), type: 'field', x: 160, y: 160, width: 320, height: 40, placeholder: 'Enter hero name…', value: '', fontSize: 18 } as FieldObject,
            { id: genId(), type: 'button', x: 240, y: 240, width: 160, height: 42, label: 'Continue →', bgColor: '#8a4a2a', textColor: '#ffd700', script: `goToCard("${cStats}");` } as ButtonObject,
            { id: genId(), type: 'button', x: 20, y: 310, width: 120, height: 30, label: '← Class', bgColor: '#2a2a3a', textColor: '#888888', script: `goToCard("${cClass}");` } as ButtonObject,
          ],
        },
        {
          id: cStats, title: 'Allocate Stats',
          background: { type: '2d-color', color: '#080810' },
          objects: [
            { id: genId(), type: 'text', x: 40, y: 15, width: 560, height: 36, text: 'Allocate Bonus Points', fontSize: 22, color: '#ffd700', bold: true, italic: false } as TextObject,
            { id: genId(), type: 'text', x: 40, y: 50, width: 300, height: 20, text: 'Distribute 5 points among your stats', fontSize: 12, color: '#666688', bold: false, italic: false } as TextObject,
            { id: genId(), type: 'rect', x: 60, y: 80, width: 520, height: 180, bgColor: '#0a0a18', borderColor: '#2a2a5a', borderWidth: 1, borderRadius: 8 } as RectObject,
            { id: genId(), type: 'text', x: 80, y: 95, width: 480, height: 30, text: '⚔️ Strength        ████████░░░░░░  +0', fontSize: 15, color: '#ff8866', bold: false, italic: false } as TextObject,
            { id: genId(), type: 'text', x: 80, y: 125, width: 480, height: 30, text: '🛡️ Defense          ██████░░░░░░░░  +0', fontSize: 15, color: '#66aaff', bold: false, italic: false } as TextObject,
            { id: genId(), type: 'text', x: 80, y: 155, width: 480, height: 30, text: '✨ Magic            ██████░░░░░░░░  +0', fontSize: 15, color: '#aa88ff', bold: false, italic: false } as TextObject,
            { id: genId(), type: 'text', x: 80, y: 185, width: 480, height: 30, text: '💨 Speed            ████████░░░░░░  +0', fontSize: 15, color: '#66cc88', bold: false, italic: false } as TextObject,
            { id: genId(), type: 'text', x: 200, y: 225, width: 240, height: 20, text: 'Remaining points: 5', fontSize: 13, color: '#ffd700', bold: true, italic: false } as TextObject,
            { id: genId(), type: 'button', x: 240, y: 280, width: 160, height: 42, label: 'Forge Hero! ⚔️', bgColor: '#8a4a2a', textColor: '#ffd700', script: `goToCard("${cResult}");` } as ButtonObject,
            { id: genId(), type: 'button', x: 20, y: 310, width: 120, height: 30, label: '← Name', bgColor: '#2a2a3a', textColor: '#888888', script: `goToCard("${cName}");` } as ButtonObject,
          ],
        },
        {
          id: cResult, title: 'Hero Created',
          background: { type: '2d-gradient', color: '#1a1a00', gradientTo: '#0a0a1a' },
          objects: [
            { id: genId(), type: 'text', x: 120, y: 30, width: 400, height: 40, text: '🏆 Hero Forged!', fontSize: 30, color: '#ffd700', bold: true, italic: false } as TextObject,
            { id: genId(), type: 'rect', x: 120, y: 80, width: 400, height: 200, bgColor: '#0a0a18', borderColor: '#ffd700', borderWidth: 2, borderRadius: 10 } as RectObject,
            { id: genId(), type: 'text', x: 140, y: 90, width: 360, height: 180, text: '━━━ CHARACTER SHEET ━━━\n\n  ⚔️ Name: Brave Adventurer\n  🎭 Class: Warrior\n  📊 Level: 1\n\n  STR: 12  DEF: 8\n  MAG: 4   SPD: 6\n\n━━━━━━━━━━━━━━━━━━━━', fontSize: 14, color: '#e8d888', bold: false, italic: false } as TextObject,
            { id: genId(), type: 'button', x: 180, y: 300, width: 120, height: 36, label: '↺ New Hero', bgColor: '#4a2a1a', textColor: '#ffd700', script: `goToCard("${cTitle}");` } as ButtonObject,
            { id: genId(), type: 'button', x: 320, y: 300, width: 140, height: 36, label: '✏️ Edit in Editor', bgColor: '#2a2a5a', textColor: '#aaaaff', script: '' } as ButtonObject,
          ],
        },
      ],
    }],
    assets: { images: {} },
    library: [],
  };
}

// ---------------------------------------------------------------------------
// 5. Flashcard Study App
// ---------------------------------------------------------------------------

function createFlashcards(): HyperNovaProject {
  const cHome = genId();
  const cF1 = genId(), cA1 = genId();
  const cF2 = genId(), cA2 = genId();
  const cF3 = genId(), cA3 = genId();
  const cF4 = genId(), cA4 = genId();
  const cDone = genId();

  return {
    version: 1,
    name: 'Study Flashcards',
    stacks: [{
      id: genId(),
      title: 'Flashcards',
      cards: [
        {
          id: cHome, title: 'Home',
          background: { type: '2d-gradient', color: '#0a1a2a', gradientTo: '#1a1a3a' },
          objects: [
            { id: genId(), type: 'text', x: 140, y: 40, width: 360, height: 50, text: '📚 Study Flashcards', fontSize: 32, color: '#ffffff', bold: true, italic: false } as TextObject,
            { id: genId(), type: 'text', x: 160, y: 100, width: 320, height: 24, text: 'Computer Science Fundamentals', fontSize: 15, color: '#6688bb', bold: false, italic: false } as TextObject,
            { id: genId(), type: 'rect', x: 160, y: 140, width: 320, height: 100, bgColor: '#0a1520', borderColor: '#1a3a5a', borderWidth: 1, borderRadius: 10 } as RectObject,
            { id: genId(), type: 'text', x: 180, y: 152, width: 280, height: 76, text: '📇 4 flashcards\n🔄 Flip to reveal answers\n⏭️ Navigate forward & back', fontSize: 13, color: '#88aacc', bold: false, italic: false } as TextObject,
            { id: genId(), type: 'button', x: 220, y: 270, width: 200, height: 44, label: '▶ Start Studying', bgColor: '#2a6abb', textColor: '#ffffff', script: `goToCard("${cF1}");` } as ButtonObject,
          ],
        },
        // --- Card 1 ---
        {
          id: cF1, title: 'Card 1 - Front',
          background: { type: '2d-color', color: '#111122' },
          objects: [
            { id: genId(), type: 'rect', x: 0, y: 0, width: 640, height: 40, bgColor: '#0a0a1a', borderColor: '#1a1a3a', borderWidth: 0, borderRadius: 0 } as RectObject,
            { id: genId(), type: 'text', x: 20, y: 10, width: 200, height: 22, text: 'Card 1 of 4', fontSize: 12, color: '#4a6a9a', bold: true, italic: false } as TextObject,
            { id: genId(), type: 'rect', x: 80, y: 60, width: 480, height: 200, bgColor: '#1a1a38', borderColor: '#3a3a8a', borderWidth: 2, borderRadius: 12 } as RectObject,
            { id: genId(), type: 'text', x: 120, y: 80, width: 400, height: 30, text: 'QUESTION', fontSize: 12, color: '#4a4a8a', bold: true, italic: false } as TextObject,
            { id: genId(), type: 'text', x: 120, y: 120, width: 400, height: 100, text: 'What is the time complexity\nof binary search?', fontSize: 24, color: '#e0e0ff', bold: true, italic: false } as TextObject,
            { id: genId(), type: 'button', x: 240, y: 275, width: 160, height: 38, label: '🔄 Flip Card', bgColor: '#3a5abb', textColor: '#ffffff', script: `goToCard("${cA1}");` } as ButtonObject,
            { id: genId(), type: 'button', x: 520, y: 310, width: 100, height: 28, label: 'Skip →', bgColor: '#2a2a3a', textColor: '#666688', script: `goToCard("${cF2}");` } as ButtonObject,
          ],
        },
        {
          id: cA1, title: 'Card 1 - Answer',
          background: { type: '2d-color', color: '#111122' },
          objects: [
            { id: genId(), type: 'rect', x: 0, y: 0, width: 640, height: 40, bgColor: '#0a0a1a', borderColor: '#1a1a3a', borderWidth: 0, borderRadius: 0 } as RectObject,
            { id: genId(), type: 'text', x: 20, y: 10, width: 200, height: 22, text: 'Card 1 of 4 — Answer', fontSize: 12, color: '#4a9a4a', bold: true, italic: false } as TextObject,
            { id: genId(), type: 'rect', x: 80, y: 60, width: 480, height: 200, bgColor: '#0a1a0a', borderColor: '#2a8a3a', borderWidth: 2, borderRadius: 12 } as RectObject,
            { id: genId(), type: 'text', x: 120, y: 80, width: 400, height: 30, text: 'ANSWER', fontSize: 12, color: '#2a6a2a', bold: true, italic: false } as TextObject,
            { id: genId(), type: 'text', x: 120, y: 110, width: 400, height: 50, text: 'O(log n)', fontSize: 36, color: '#5ae85a', bold: true, italic: false } as TextObject,
            { id: genId(), type: 'text', x: 120, y: 170, width: 400, height: 60, text: 'Binary search halves the search space with each comparison, resulting in logarithmic time.', fontSize: 13, color: '#88cc88', bold: false, italic: false } as TextObject,
            { id: genId(), type: 'button', x: 240, y: 275, width: 160, height: 38, label: 'Next Card →', bgColor: '#2a7a3a', textColor: '#ffffff', script: `goToCard("${cF2}");` } as ButtonObject,
          ],
        },
        // --- Card 2 ---
        {
          id: cF2, title: 'Card 2 - Front',
          background: { type: '2d-color', color: '#111122' },
          objects: [
            { id: genId(), type: 'rect', x: 0, y: 0, width: 640, height: 40, bgColor: '#0a0a1a', borderColor: '#1a1a3a', borderWidth: 0, borderRadius: 0 } as RectObject,
            { id: genId(), type: 'text', x: 20, y: 10, width: 200, height: 22, text: 'Card 2 of 4', fontSize: 12, color: '#4a6a9a', bold: true, italic: false } as TextObject,
            { id: genId(), type: 'rect', x: 80, y: 60, width: 480, height: 200, bgColor: '#1a1a38', borderColor: '#3a3a8a', borderWidth: 2, borderRadius: 12 } as RectObject,
            { id: genId(), type: 'text', x: 120, y: 80, width: 400, height: 30, text: 'QUESTION', fontSize: 12, color: '#4a4a8a', bold: true, italic: false } as TextObject,
            { id: genId(), type: 'text', x: 120, y: 120, width: 400, height: 100, text: 'What does "HTTP" stand for?', fontSize: 24, color: '#e0e0ff', bold: true, italic: false } as TextObject,
            { id: genId(), type: 'button', x: 240, y: 275, width: 160, height: 38, label: '🔄 Flip Card', bgColor: '#3a5abb', textColor: '#ffffff', script: `goToCard("${cA2}");` } as ButtonObject,
            { id: genId(), type: 'button', x: 20, y: 310, width: 100, height: 28, label: '← Prev', bgColor: '#2a2a3a', textColor: '#666688', script: `goToCard("${cF1}");` } as ButtonObject,
            { id: genId(), type: 'button', x: 520, y: 310, width: 100, height: 28, label: 'Skip →', bgColor: '#2a2a3a', textColor: '#666688', script: `goToCard("${cF3}");` } as ButtonObject,
          ],
        },
        {
          id: cA2, title: 'Card 2 - Answer',
          background: { type: '2d-color', color: '#111122' },
          objects: [
            { id: genId(), type: 'rect', x: 0, y: 0, width: 640, height: 40, bgColor: '#0a0a1a', borderColor: '#1a1a3a', borderWidth: 0, borderRadius: 0 } as RectObject,
            { id: genId(), type: 'text', x: 20, y: 10, width: 200, height: 22, text: 'Card 2 of 4 — Answer', fontSize: 12, color: '#4a9a4a', bold: true, italic: false } as TextObject,
            { id: genId(), type: 'rect', x: 80, y: 60, width: 480, height: 200, bgColor: '#0a1a0a', borderColor: '#2a8a3a', borderWidth: 2, borderRadius: 12 } as RectObject,
            { id: genId(), type: 'text', x: 120, y: 80, width: 400, height: 30, text: 'ANSWER', fontSize: 12, color: '#2a6a2a', bold: true, italic: false } as TextObject,
            { id: genId(), type: 'text', x: 120, y: 110, width: 400, height: 40, text: 'HyperText Transfer Protocol', fontSize: 22, color: '#5ae85a', bold: true, italic: false } as TextObject,
            { id: genId(), type: 'text', x: 120, y: 165, width: 400, height: 60, text: 'The foundation of data communication on the World Wide Web, defining how messages are formatted and transmitted.', fontSize: 13, color: '#88cc88', bold: false, italic: false } as TextObject,
            { id: genId(), type: 'button', x: 240, y: 275, width: 160, height: 38, label: 'Next Card →', bgColor: '#2a7a3a', textColor: '#ffffff', script: `goToCard("${cF3}");` } as ButtonObject,
          ],
        },
        // --- Card 3 ---
        {
          id: cF3, title: 'Card 3 - Front',
          background: { type: '2d-color', color: '#111122' },
          objects: [
            { id: genId(), type: 'rect', x: 0, y: 0, width: 640, height: 40, bgColor: '#0a0a1a', borderColor: '#1a1a3a', borderWidth: 0, borderRadius: 0 } as RectObject,
            { id: genId(), type: 'text', x: 20, y: 10, width: 200, height: 22, text: 'Card 3 of 4', fontSize: 12, color: '#4a6a9a', bold: true, italic: false } as TextObject,
            { id: genId(), type: 'rect', x: 80, y: 60, width: 480, height: 200, bgColor: '#1a1a38', borderColor: '#3a3a8a', borderWidth: 2, borderRadius: 12 } as RectObject,
            { id: genId(), type: 'text', x: 120, y: 80, width: 400, height: 30, text: 'QUESTION', fontSize: 12, color: '#4a4a8a', bold: true, italic: false } as TextObject,
            { id: genId(), type: 'text', x: 120, y: 120, width: 400, height: 100, text: 'What data structure uses\nFIFO (First In, First Out)?', fontSize: 24, color: '#e0e0ff', bold: true, italic: false } as TextObject,
            { id: genId(), type: 'button', x: 240, y: 275, width: 160, height: 38, label: '🔄 Flip Card', bgColor: '#3a5abb', textColor: '#ffffff', script: `goToCard("${cA3}");` } as ButtonObject,
            { id: genId(), type: 'button', x: 20, y: 310, width: 100, height: 28, label: '← Prev', bgColor: '#2a2a3a', textColor: '#666688', script: `goToCard("${cF2}");` } as ButtonObject,
            { id: genId(), type: 'button', x: 520, y: 310, width: 100, height: 28, label: 'Skip →', bgColor: '#2a2a3a', textColor: '#666688', script: `goToCard("${cF4}");` } as ButtonObject,
          ],
        },
        {
          id: cA3, title: 'Card 3 - Answer',
          background: { type: '2d-color', color: '#111122' },
          objects: [
            { id: genId(), type: 'rect', x: 0, y: 0, width: 640, height: 40, bgColor: '#0a0a1a', borderColor: '#1a1a3a', borderWidth: 0, borderRadius: 0 } as RectObject,
            { id: genId(), type: 'text', x: 20, y: 10, width: 200, height: 22, text: 'Card 3 of 4 — Answer', fontSize: 12, color: '#4a9a4a', bold: true, italic: false } as TextObject,
            { id: genId(), type: 'rect', x: 80, y: 60, width: 480, height: 200, bgColor: '#0a1a0a', borderColor: '#2a8a3a', borderWidth: 2, borderRadius: 12 } as RectObject,
            { id: genId(), type: 'text', x: 120, y: 80, width: 400, height: 30, text: 'ANSWER', fontSize: 12, color: '#2a6a2a', bold: true, italic: false } as TextObject,
            { id: genId(), type: 'text', x: 120, y: 110, width: 400, height: 40, text: 'Queue', fontSize: 36, color: '#5ae85a', bold: true, italic: false } as TextObject,
            { id: genId(), type: 'text', x: 120, y: 165, width: 400, height: 60, text: 'A queue processes elements in the order they arrive. Think of a line at a store — first person in line gets served first.', fontSize: 13, color: '#88cc88', bold: false, italic: false } as TextObject,
            { id: genId(), type: 'button', x: 240, y: 275, width: 160, height: 38, label: 'Next Card →', bgColor: '#2a7a3a', textColor: '#ffffff', script: `goToCard("${cF4}");` } as ButtonObject,
          ],
        },
        // --- Card 4 ---
        {
          id: cF4, title: 'Card 4 - Front',
          background: { type: '2d-color', color: '#111122' },
          objects: [
            { id: genId(), type: 'rect', x: 0, y: 0, width: 640, height: 40, bgColor: '#0a0a1a', borderColor: '#1a1a3a', borderWidth: 0, borderRadius: 0 } as RectObject,
            { id: genId(), type: 'text', x: 20, y: 10, width: 200, height: 22, text: 'Card 4 of 4', fontSize: 12, color: '#4a6a9a', bold: true, italic: false } as TextObject,
            { id: genId(), type: 'rect', x: 80, y: 60, width: 480, height: 200, bgColor: '#1a1a38', borderColor: '#3a3a8a', borderWidth: 2, borderRadius: 12 } as RectObject,
            { id: genId(), type: 'text', x: 120, y: 80, width: 400, height: 30, text: 'QUESTION', fontSize: 12, color: '#4a4a8a', bold: true, italic: false } as TextObject,
            { id: genId(), type: 'text', x: 120, y: 120, width: 400, height: 100, text: 'What is recursion?', fontSize: 28, color: '#e0e0ff', bold: true, italic: false } as TextObject,
            { id: genId(), type: 'button', x: 240, y: 275, width: 160, height: 38, label: '🔄 Flip Card', bgColor: '#3a5abb', textColor: '#ffffff', script: `goToCard("${cA4}");` } as ButtonObject,
            { id: genId(), type: 'button', x: 20, y: 310, width: 100, height: 28, label: '← Prev', bgColor: '#2a2a3a', textColor: '#666688', script: `goToCard("${cF3}");` } as ButtonObject,
          ],
        },
        {
          id: cA4, title: 'Card 4 - Answer',
          background: { type: '2d-color', color: '#111122' },
          objects: [
            { id: genId(), type: 'rect', x: 0, y: 0, width: 640, height: 40, bgColor: '#0a0a1a', borderColor: '#1a1a3a', borderWidth: 0, borderRadius: 0 } as RectObject,
            { id: genId(), type: 'text', x: 20, y: 10, width: 200, height: 22, text: 'Card 4 of 4 — Answer', fontSize: 12, color: '#4a9a4a', bold: true, italic: false } as TextObject,
            { id: genId(), type: 'rect', x: 80, y: 60, width: 480, height: 200, bgColor: '#0a1a0a', borderColor: '#2a8a3a', borderWidth: 2, borderRadius: 12 } as RectObject,
            { id: genId(), type: 'text', x: 120, y: 80, width: 400, height: 30, text: 'ANSWER', fontSize: 12, color: '#2a6a2a', bold: true, italic: false } as TextObject,
            { id: genId(), type: 'text', x: 120, y: 110, width: 400, height: 130, text: 'A function that calls itself to solve smaller sub-problems until it reaches a base case.\n\nfunction factorial(n) {\n  if (n <= 1) return 1;\n  return n * factorial(n - 1);\n}', fontSize: 13, color: '#5ae85a', bold: false, italic: false } as TextObject,
            { id: genId(), type: 'button', x: 220, y: 275, width: 200, height: 38, label: '🎉 Done! Review →', bgColor: '#2a7a3a', textColor: '#ffffff', script: `goToCard("${cDone}");` } as ButtonObject,
          ],
        },
        {
          id: cDone, title: 'Complete',
          background: { type: '2d-gradient', color: '#0a1a3a', gradientTo: '#1a0a3a' },
          objects: [
            { id: genId(), type: 'text', x: 140, y: 60, width: 360, height: 50, text: '🎉 All Done!', fontSize: 36, color: '#ffffff', bold: true, italic: false } as TextObject,
            { id: genId(), type: 'text', x: 140, y: 120, width: 360, height: 30, text: 'You reviewed all 4 flashcards.', fontSize: 16, color: '#8888cc', bold: false, italic: false } as TextObject,
            { id: genId(), type: 'rect', x: 180, y: 165, width: 280, height: 80, bgColor: '#0a1020', borderColor: '#2a4a6a', borderWidth: 1, borderRadius: 8 } as RectObject,
            { id: genId(), type: 'text', x: 200, y: 178, width: 240, height: 50, text: 'Tip: Switch to Edit mode to add\nyour own flashcards to this deck!', fontSize: 13, color: '#88aacc', bold: false, italic: false } as TextObject,
            { id: genId(), type: 'button', x: 220, y: 270, width: 200, height: 40, label: '↺ Study Again', bgColor: '#3a5abb', textColor: '#ffffff', script: `goToCard("${cF1}");` } as ButtonObject,
          ],
        },
      ],
    }],
    assets: { images: {} },
    library: [],
  };
}

// ---------------------------------------------------------------------------
// 6. Mini Dashboard / App
// ---------------------------------------------------------------------------

function createDashboard(): HyperNovaProject {
  const cMain = genId(), cTasks = genId(), cNotes = genId(), cSettings = genId();

  return {
    version: 1,
    name: 'Personal Dashboard',
    stacks: [{
      id: genId(),
      title: 'Dashboard',
      cards: [
        {
          id: cMain, title: 'Dashboard',
          background: { type: '2d-color', color: '#0d1117' },
          objects: [
            { id: genId(), type: 'rect', x: 0, y: 0, width: 640, height: 56, bgColor: '#161b22', borderColor: '#30363d', borderWidth: 0, borderRadius: 0 } as RectObject,
            { id: genId(), type: 'text', x: 20, y: 14, width: 200, height: 28, text: '⚡ My Dashboard', fontSize: 18, color: '#f0f6fc', bold: true, italic: false } as TextObject,
            { id: genId(), type: 'button', x: 400, y: 13, width: 70, height: 30, label: '📋 Tasks', bgColor: '#21262d', textColor: '#8b949e', script: `goToCard("${cTasks}");` } as ButtonObject,
            { id: genId(), type: 'button', x: 476, y: 13, width: 70, height: 30, label: '📝 Notes', bgColor: '#21262d', textColor: '#8b949e', script: `goToCard("${cNotes}");` } as ButtonObject,
            { id: genId(), type: 'button', x: 552, y: 13, width: 70, height: 30, label: '⚙️ Prefs', bgColor: '#21262d', textColor: '#8b949e', script: `goToCard("${cSettings}");` } as ButtonObject,

            // Stats row
            { id: genId(), type: 'rect', x: 20, y: 75, width: 185, height: 90, bgColor: '#161b22', borderColor: '#30363d', borderWidth: 1, borderRadius: 8 } as RectObject,
            { id: genId(), type: 'text', x: 35, y: 85, width: 155, height: 18, text: 'Tasks Done', fontSize: 12, color: '#8b949e', bold: false, italic: false } as TextObject,
            { id: genId(), type: 'text', x: 35, y: 108, width: 155, height: 40, text: '47', fontSize: 36, color: '#3fb950', bold: true, italic: false } as TextObject,

            { id: genId(), type: 'rect', x: 220, y: 75, width: 185, height: 90, bgColor: '#161b22', borderColor: '#30363d', borderWidth: 1, borderRadius: 8 } as RectObject,
            { id: genId(), type: 'text', x: 235, y: 85, width: 155, height: 18, text: 'In Progress', fontSize: 12, color: '#8b949e', bold: false, italic: false } as TextObject,
            { id: genId(), type: 'text', x: 235, y: 108, width: 155, height: 40, text: '12', fontSize: 36, color: '#d29922', bold: true, italic: false } as TextObject,

            { id: genId(), type: 'rect', x: 420, y: 75, width: 200, height: 90, bgColor: '#161b22', borderColor: '#30363d', borderWidth: 1, borderRadius: 8 } as RectObject,
            { id: genId(), type: 'text', x: 435, y: 85, width: 170, height: 18, text: 'Streak', fontSize: 12, color: '#8b949e', bold: false, italic: false } as TextObject,
            { id: genId(), type: 'text', x: 435, y: 108, width: 170, height: 40, text: '🔥 14 days', fontSize: 28, color: '#f85149', bold: true, italic: false } as TextObject,

            // Recent activity
            { id: genId(), type: 'rect', x: 20, y: 185, width: 600, height: 155, bgColor: '#161b22', borderColor: '#30363d', borderWidth: 1, borderRadius: 8 } as RectObject,
            { id: genId(), type: 'text', x: 35, y: 195, width: 200, height: 22, text: 'Recent Activity', fontSize: 14, color: '#f0f6fc', bold: true, italic: false } as TextObject,
            { id: genId(), type: 'text', x: 35, y: 222, width: 570, height: 105, text: '✅  Completed "Design review for v2"         2h ago\n🔄  Started "API integration tests"            5h ago\n📝  Added note "Sprint planning ideas"        yesterday\n✅  Completed "Fix login page layout"         yesterday\n🚀  Deployed dashboard v1.3                   2 days ago', fontSize: 12, color: '#8b949e', bold: false, italic: false } as TextObject,
          ],
        },
        {
          id: cTasks, title: 'Tasks',
          background: { type: '2d-color', color: '#0d1117' },
          objects: [
            { id: genId(), type: 'rect', x: 0, y: 0, width: 640, height: 50, bgColor: '#161b22', borderColor: '#30363d', borderWidth: 0, borderRadius: 0 } as RectObject,
            { id: genId(), type: 'text', x: 20, y: 13, width: 200, height: 26, text: '📋 Tasks', fontSize: 18, color: '#f0f6fc', bold: true, italic: false } as TextObject,
            { id: genId(), type: 'button', x: 540, y: 10, width: 80, height: 30, label: '← Back', bgColor: '#21262d', textColor: '#8b949e', script: `goToCard("${cMain}");` } as ButtonObject,

            { id: genId(), type: 'rect', x: 20, y: 65, width: 600, height: 270, bgColor: '#161b22', borderColor: '#30363d', borderWidth: 1, borderRadius: 8 } as RectObject,
            { id: genId(), type: 'text', x: 35, y: 75, width: 570, height: 250, text: '☐  Review pull request #142\n     Priority: High  •  Due: Today\n\n☐  Write unit tests for auth module\n     Priority: Medium  •  Due: Tomorrow\n\n☐  Update documentation\n     Priority: Low  •  Due: Friday\n\n✅  Fix responsive layout — Done!\n\n✅  Set up CI pipeline — Done!', fontSize: 13, color: '#c9d1d9', bold: false, italic: false } as TextObject,
          ],
        },
        {
          id: cNotes, title: 'Notes',
          background: { type: '2d-color', color: '#0d1117' },
          objects: [
            { id: genId(), type: 'rect', x: 0, y: 0, width: 640, height: 50, bgColor: '#161b22', borderColor: '#30363d', borderWidth: 0, borderRadius: 0 } as RectObject,
            { id: genId(), type: 'text', x: 20, y: 13, width: 200, height: 26, text: '📝 Notes', fontSize: 18, color: '#f0f6fc', bold: true, italic: false } as TextObject,
            { id: genId(), type: 'button', x: 540, y: 10, width: 80, height: 30, label: '← Back', bgColor: '#21262d', textColor: '#8b949e', script: `goToCard("${cMain}");` } as ButtonObject,

            { id: genId(), type: 'text', x: 30, y: 60, width: 100, height: 20, text: 'Quick Note', fontSize: 12, color: '#8b949e', bold: false, italic: false } as TextObject,
            { id: genId(), type: 'field', x: 30, y: 82, width: 580, height: 36, placeholder: 'Write a quick note…', value: '', fontSize: 14 } as FieldObject,
            { id: genId(), type: 'rect', x: 30, y: 135, width: 580, height: 190, bgColor: '#161b22', borderColor: '#30363d', borderWidth: 1, borderRadius: 8 } as RectObject,
            { id: genId(), type: 'text', x: 45, y: 145, width: 200, height: 20, text: 'Saved Notes', fontSize: 13, color: '#f0f6fc', bold: true, italic: false } as TextObject,
            { id: genId(), type: 'text', x: 45, y: 170, width: 550, height: 140, text: '📌  Sprint planning ideas\n     - Focus on performance optimizations\n     - Add dark mode support\n     - User feedback survey\n\n📌  Architecture decisions\n     - Use Zustand for state management\n     - Component-based window system\n     - Plugin API for extensions', fontSize: 12, color: '#c9d1d9', bold: false, italic: false } as TextObject,
          ],
        },
        {
          id: cSettings, title: 'Settings',
          background: { type: '2d-color', color: '#0d1117' },
          objects: [
            { id: genId(), type: 'rect', x: 0, y: 0, width: 640, height: 50, bgColor: '#161b22', borderColor: '#30363d', borderWidth: 0, borderRadius: 0 } as RectObject,
            { id: genId(), type: 'text', x: 20, y: 13, width: 200, height: 26, text: '⚙️ Preferences', fontSize: 18, color: '#f0f6fc', bold: true, italic: false } as TextObject,
            { id: genId(), type: 'button', x: 540, y: 10, width: 80, height: 30, label: '← Back', bgColor: '#21262d', textColor: '#8b949e', script: `goToCard("${cMain}");` } as ButtonObject,

            { id: genId(), type: 'text', x: 40, y: 70, width: 560, height: 24, text: 'Display', fontSize: 16, color: '#f0f6fc', bold: true, italic: false } as TextObject,
            { id: genId(), type: 'text', x: 60, y: 100, width: 300, height: 24, text: 'Username', fontSize: 13, color: '#8b949e', bold: false, italic: false } as TextObject,
            { id: genId(), type: 'field', x: 60, y: 124, width: 300, height: 32, placeholder: 'Enter username…', value: '', fontSize: 13 } as FieldObject,
            { id: genId(), type: 'text', x: 60, y: 170, width: 300, height: 24, text: 'Theme', fontSize: 13, color: '#8b949e', bold: false, italic: false } as TextObject,
            { id: genId(), type: 'button', x: 60, y: 194, width: 100, height: 30, label: '🌙 Dark', bgColor: '#238636', textColor: '#ffffff', script: '' } as ButtonObject,
            { id: genId(), type: 'button', x: 170, y: 194, width: 100, height: 30, label: '☀️ Light', bgColor: '#21262d', textColor: '#8b949e', script: '' } as ButtonObject,

            { id: genId(), type: 'text', x: 40, y: 250, width: 560, height: 24, text: 'Notifications', fontSize: 16, color: '#f0f6fc', bold: true, italic: false } as TextObject,
            { id: genId(), type: 'button', x: 60, y: 280, width: 140, height: 30, label: '🔔 Enabled', bgColor: '#238636', textColor: '#ffffff', script: '' } as ButtonObject,
            { id: genId(), type: 'text', x: 210, y: 286, width: 300, height: 20, text: 'Receive notifications for task updates', fontSize: 11, color: '#484f58', bold: false, italic: false } as TextObject,
          ],
        },
      ],
    }],
    assets: { images: {} },
    library: [],
  };
}

// ---------------------------------------------------------------------------
// Catalog
// ---------------------------------------------------------------------------

export const EXAMPLE_CATALOG: ExampleEntry[] = [
  {
    id: 'story',
    name: 'Interactive Story',
    description: 'A branching choose-your-own-adventure sci-fi story with multiple paths',
    icon: '🚀',
    create: createStoryBook,
  },
  {
    id: 'quiz',
    name: 'Space Quiz',
    description: 'A multiple-choice quiz app with scoring and results',
    icon: '🧠',
    create: createQuizApp,
  },
  {
    id: 'portfolio',
    name: 'Creative Portfolio',
    description: 'A professional portfolio website with navigation, projects, and contact form',
    icon: '💼',
    create: createPortfolio,
  },
  {
    id: 'rpg',
    name: 'RPG Character Creator',
    description: 'A fantasy RPG character builder with class selection, naming, and stat allocation',
    icon: '⚔️',
    create: createCharacterCreator,
  },
  {
    id: 'flashcards',
    name: 'Study Flashcards',
    description: 'A flip-card study app with CS fundamentals — add your own cards!',
    icon: '📚',
    create: createFlashcards,
  },
  {
    id: 'dashboard',
    name: 'Personal Dashboard',
    description: 'A GitHub-styled productivity dashboard with tasks, notes, and settings',
    icon: '⚡',
    create: createDashboard,
  },
];
