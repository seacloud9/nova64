// Conformance cart 1101: parseCanvasUI SVG path A/a elliptical arc commands.

let ui;

export function init() {
  ui = nova64.ui.parseCanvasUI(`
    <ui>
      <rect x="0" y="0" width="640" height="360" fill="#080d16" />
      <svg x="38" y="36" width="250" height="130">
        <path d="M 18 92 A 62 42 0 0 1 150 92 A 62 42 0 0 1 18 92"
          fill="none" stroke="#7fffd4ff" />
      </svg>
      <svg x="318" y="36" width="240" height="130">
        <path d="M 20 94 a 58 36 28 1 1 146 0"
          fill="none" stroke="#ffd166ff" />
        <path d="M 20 104 a 58 36 28 0 0 146 0"
          fill="none" stroke="#ff6b6bff" />
      </svg>
      <svg x="106" y="190" width="380" height="122">
        <path d="M 20 96 A 88 48 0 0 1 196 96 A 88 48 0 0 1 372 96 L 372 116 L 20 116 Z"
          fill="#203850aa" stroke="#9ad2ffff" />
      </svg>
    </ui>`);
}

export function draw() {
  nova64.ui.renderCanvasUI(ui, {});
}
