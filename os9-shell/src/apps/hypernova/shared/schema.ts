// hyperNova – data schema
// All card stack data structures and factory helpers

export type CardObjectType = 'text' | 'button' | 'field' | 'image' | 'rect' | 'symbol-instance';
export type ToolType = 'select' | 'button' | 'text' | 'field' | 'image' | 'rect';

// ---------------------------------------------------------------------------
// Object types
// ---------------------------------------------------------------------------

export interface TextObject {
  id: string;
  type: 'text';
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  fontSize: number;
  color: string;
  bold: boolean;
  italic: boolean;
  script?: string;
}

export interface ButtonObject {
  id: string;
  type: 'button';
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  bgColor: string;
  textColor: string;
  script: string;
}

export interface FieldObject {
  id: string;
  type: 'field';
  x: number;
  y: number;
  width: number;
  height: number;
  placeholder: string;
  value: string;
  fontSize: number;
  script?: string; // onChange script
}

export interface ImageObject {
  id: string;
  type: 'image';
  x: number;
  y: number;
  width: number;
  height: number;
  asset: string; // key into project.assets.images
  script?: string;
}

export interface RectObject {
  id: string;
  type: 'rect';
  x: number;
  y: number;
  width: number;
  height: number;
  bgColor: string;
  borderColor: string;
  borderWidth: number;
  borderRadius: number;
  script?: string;
}

export interface SymbolInstanceObject {
  id: string;
  type: 'symbol-instance';
  x: number;
  y: number;
  width: number;
  height: number;
  symbolId: string;         // references Symbol.id in the library
  overrides: Record<string, unknown>; // per-instance property overrides
  currentFrame: number;     // for movie clip symbols
  script?: string;
}

export type CardObject =
  | TextObject
  | ButtonObject
  | FieldObject
  | ImageObject
  | RectObject
  | SymbolInstanceObject;

// ---------------------------------------------------------------------------
// Card / Stack
// ---------------------------------------------------------------------------

export interface CardBackground {
  type: '2d-color' | '2d-gradient';
  color: string;
  gradientTo?: string;
  gradientAngle?: number;
}

export interface Card {
  id: string;
  title: string;
  background: CardBackground;
  objects: CardObject[];
  script?: string;
}

export interface Stack {
  id: string;
  title: string;
  cards: Card[];
  script?: string;
}

// ---------------------------------------------------------------------------
// Assets
// ---------------------------------------------------------------------------

export interface ImageAsset {
  format: string; // e.g. 'png'
  data: string;   // base64-encoded
  name: string;
}

export interface Assets {
  images: Record<string, ImageAsset>;
}

// ---------------------------------------------------------------------------
// Symbol / MovieClip (Flash-inspired reusable components)
// ---------------------------------------------------------------------------

export type SymbolType = 'graphic' | 'movie-clip';

/**
 * Tween properties for interpolating an object between this keyframe and the next.
 * All positional values are in canvas pixels; rotation in degrees.
 */
export interface TweenProps {
  ease?: string;       // GSAP ease string, e.g. 'power2.inOut'
  duration?: number;   // override: seconds (defaults to frame-rate-derived duration)
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  opacity?: number;    // 0–1
  scale?: number;
  rotation?: number;   // degrees
  skewX?: number;
  skewY?: number;
}

/** A keyframe in a movie clip's timeline */
export interface Keyframe {
  frame: number;               // 1-based frame index
  objects: CardObject[];       // objects visible at this keyframe
  label?: string;              // optional frame label (for goToFrame("label"))
  script?: string;             // frame script (runs when playhead enters)
  /** Per-object tween from this keyframe to the next (keyed by object id) */
  tweens?: Record<string, TweenProps>;
}

/** A reusable symbol stored in the project library */
export interface HNSymbol {
  id: string;
  name: string;
  type: SymbolType;
  width: number;
  height: number;
  /** For 'graphic': single frame of objects. For 'movie-clip': timeline. */
  frames: Keyframe[];
  /** How many frames per second the movie clip plays at */
  fps: number;
  loop: boolean;
}

// ---------------------------------------------------------------------------
// Top-level project
// ---------------------------------------------------------------------------

export interface HyperNovaProject {
  version: 1;
  name: string;
  stacks: Stack[];
  assets: Assets;
  library: HNSymbol[];
}

// ---------------------------------------------------------------------------
// ID generation
// ---------------------------------------------------------------------------

let _seq = 0;
export function genId(): string {
  return `hn_${Date.now()}_${(++_seq).toString(36)}`;
}

// ---------------------------------------------------------------------------
// Object factories
// ---------------------------------------------------------------------------

export function createDefaultButton(x: number, y: number): ButtonObject {
  return {
    id: genId(),
    type: 'button',
    x,
    y,
    width: 120,
    height: 36,
    label: 'Button',
    bgColor: '#3a7bd5',
    textColor: '#ffffff',
    script: '// goNext(); or goToCard("card-id");',
  };
}

export function createDefaultText(x: number, y: number): TextObject {
  return {
    id: genId(),
    type: 'text',
    x,
    y,
    width: 220,
    height: 40,
    text: 'Text Label',
    fontSize: 20,
    color: '#1a1a1a',
    bold: false,
    italic: false,
  };
}

export function createDefaultField(x: number, y: number): FieldObject {
  return {
    id: genId(),
    type: 'field',
    x,
    y,
    width: 200,
    height: 36,
    placeholder: 'Enter text…',
    value: '',
    fontSize: 14,
  };
}

export function createDefaultRect(x: number, y: number): RectObject {
  return {
    id: genId(),
    type: 'rect',
    x,
    y,
    width: 160,
    height: 80,
    bgColor: '#ffffff',
    borderColor: '#555555',
    borderWidth: 2,
    borderRadius: 6,
  };
}

export function createDefaultImageObj(x: number, y: number): ImageObject {
  return {
    id: genId(),
    type: 'image',
    x,
    y,
    width: 120,
    height: 90,
    asset: '',
  };
}

export function createDefaultSymbol(name: string): HNSymbol {
  return {
    id: genId(),
    name,
    type: 'graphic',
    width: 100,
    height: 100,
    frames: [{ frame: 1, objects: [] }],
    fps: 12,
    loop: false,
  };
}

export function createDefaultMovieClip(name: string): HNSymbol {
  return {
    id: genId(),
    name,
    type: 'movie-clip',
    width: 100,
    height: 100,
    frames: [{ frame: 1, objects: [] }],
    fps: 12,
    loop: true,
  };
}

export function createSymbolInstance(symbolId: string, x: number, y: number, w: number, h: number): SymbolInstanceObject {
  return {
    id: genId(),
    type: 'symbol-instance',
    x,
    y,
    width: w,
    height: h,
    symbolId,
    overrides: {},
    currentFrame: 1,
  };
}

export function createDefaultCard(index: number): Card {
  return {
    id: genId(),
    title: `Card ${index}`,
    background: { type: '2d-color', color: '#f8f4ee' },
    objects: [],
  };
}

export function createDefaultProject(): HyperNovaProject {
  const stack: Stack = {
    id: genId(),
    title: 'Main Stack',
    cards: [createDefaultCard(1)],
  };
  return {
    version: 1,
    name: 'My Stack',
    stacks: [stack],
    assets: { images: {} },
    library: [],
  };
}

// ---------------------------------------------------------------------------
// Built-in example project
// ---------------------------------------------------------------------------

export function createExampleProject(): HyperNovaProject {
  const c1 = genId();
  const c2 = genId();
  const c3 = genId();
  const stackId = genId();

  return {
    version: 1,
    name: 'Welcome to hyperNova',
    stacks: [
      {
        id: stackId,
        title: 'Demo Stack',
        cards: [
          {
            id: c1,
            title: 'Welcome',
            background: { type: '2d-color', color: '#1a1a3e' },
            objects: [
              {
                id: genId(), type: 'text', x: 80, y: 60,
                width: 480, height: 60,
                text: '🃏 hyperNova', fontSize: 40,
                color: '#f0e68c', bold: true, italic: false,
              } as TextObject,
              {
                id: genId(), type: 'text', x: 80, y: 130,
                width: 480, height: 36,
                text: 'A HyperCard-like stack editor for novaOS',
                fontSize: 18, color: '#c8c8ff', bold: false, italic: false,
              } as TextObject,
              {
                id: genId(), type: 'text', x: 80, y: 180,
                width: 480, height: 60,
                text: '• Create interactive presentations\n• Build apps and simple games\n• Export to nova64 carts',
                fontSize: 15, color: '#a8d8a8', bold: false, italic: false,
              } as TextObject,
              {
                id: genId(), type: 'button', x: 480, y: 290,
                width: 140, height: 40,
                label: 'Start Tour →',
                bgColor: '#4a9eff', textColor: '#ffffff',
                script: `goToCard("${c2}");`,
              } as ButtonObject,
            ],
          },
          {
            id: c2,
            title: 'How It Works',
            background: { type: '2d-color', color: '#0d2b2b' },
            objects: [
              {
                id: genId(), type: 'text', x: 60, y: 40,
                width: 520, height: 50,
                text: '✏️ Building with hyperNova', fontSize: 28,
                color: '#7ecece', bold: true, italic: false,
              } as TextObject,
              {
                id: genId(), type: 'rect', x: 60, y: 100,
                width: 220, height: 150,
                bgColor: '#0a2020', borderColor: '#4ecece',
                borderWidth: 2, borderRadius: 8,
              } as RectObject,
              {
                id: genId(), type: 'text', x: 70, y: 110,
                width: 200, height: 130,
                text: '🖱️ Drag objects\n✏️ Edit properties\n📜 Write scripts\n▶ Play to test',
                fontSize: 14, color: '#a0ffa0', bold: false, italic: false,
              } as TextObject,
              {
                id: genId(), type: 'rect', x: 310, y: 100,
                width: 260, height: 150,
                bgColor: '#0a2020', borderColor: '#4ecece',
                borderWidth: 2, borderRadius: 8,
              } as RectObject,
              {
                id: genId(), type: 'text', x: 320, y: 110,
                width: 240, height: 130,
                text: '💾 Save as .hcard.json\n⬇️ Export to code.js\n🎮 Run in nova64 OS\n🔄 Import back anytime',
                fontSize: 14, color: '#a0ffa0', bold: false, italic: false,
              } as TextObject,
              {
                id: genId(), type: 'button', x: 60, y: 295,
                width: 120, height: 38,
                label: '← Back',
                bgColor: '#2a5555', textColor: '#ffffff',
                script: `goToCard("${c1}");`,
              } as ButtonObject,
              {
                id: genId(), type: 'button', x: 470, y: 295,
                width: 130, height: 38,
                label: 'Try It Out →',
                bgColor: '#4a9eff', textColor: '#ffffff',
                script: `goToCard("${c3}");`,
              } as ButtonObject,
            ],
          },
          {
            id: c3,
            title: 'Your Turn',
            background: { type: '2d-color', color: '#1a2e1a' },
            objects: [
              {
                id: genId(), type: 'text', x: 80, y: 60,
                width: 480, height: 60,
                text: '✨ Your Turn!', fontSize: 36,
                color: '#a8ff78', bold: true, italic: false,
              } as TextObject,
              {
                id: genId(), type: 'text', x: 80, y: 130,
                width: 480, height: 80,
                text: 'Click ✏️ Edit to switch back to edit mode.\nAdd objects from the toolbar, drag them around,\nedit their properties in the right panel, and\nwrite scripts to connect your cards!',
                fontSize: 16, color: '#ccffcc', bold: false, italic: false,
              } as TextObject,
              {
                id: genId(), type: 'field', x: 180, y: 230,
                width: 280, height: 36,
                placeholder: 'Type something here…', value: '',
                fontSize: 15,
              } as FieldObject,
              {
                id: genId(), type: 'button', x: 220, y: 290,
                width: 200, height: 40,
                label: '← Start Over',
                bgColor: '#3a7bd5', textColor: '#ffffff',
                script: `goToCard("${c1}");`,
              } as ButtonObject,
            ],
          },
        ],
      },
    ],
    assets: { images: {} },
    library: [],
  };
}
