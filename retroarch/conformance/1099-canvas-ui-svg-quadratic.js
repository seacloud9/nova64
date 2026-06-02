// Conformance cart 1099: parseCanvasUI SVG path Q/q and T/t commands.

let ui;

export function init() {
  ui = nova64.ui.parseCanvasUI(`
    <ui>
      <rect x="0" y="0" width="640" height="360" fill="#08101a" />
      <svg x="40" y="36" width="240" height="120">
        <path d="M 0 80 Q 40 0 80 80 T 160 80"
          fill="none" stroke="#7fffd4ff" />
      </svg>
      <svg x="310" y="42" width="220" height="120">
        <path d="M 10 90 q 35 -75 70 0 t 70 0"
          fill="none" stroke="#ffd166ff" />
      </svg>
      <svg x="92" y="190" width="360" height="120">
        <path d="M 0 100 Q 60 8 120 100 T 240 100 L 240 112 L 0 112 Z"
          fill="#233554aa" stroke="#ff6b6bff" />
      </svg>
    </ui>`);
}

export function draw() {
  nova64.ui.renderCanvasUI(ui, {});
}
