// Conformance cart 1100: parseCanvasUI SVG path S/s smooth cubic commands.

let ui;

export function init() {
  ui = nova64.ui.parseCanvasUI(`
    <ui>
      <rect x="0" y="0" width="640" height="360" fill="#0a0f18" />
      <svg x="42" y="34" width="250" height="130">
        <path d="M 10 92 C 42 8 88 8 120 92 S 198 176 230 92"
          fill="none" stroke="#7fffd4ff" />
      </svg>
      <svg x="318" y="36" width="220" height="130">
        <path d="M 8 88 c 32 -76 72 -76 104 0 s 72 76 104 0"
          fill="none" stroke="#ffd166ff" />
      </svg>
      <svg x="96" y="192" width="370" height="120">
        <path d="M 0 88 S 58 8 116 88 S 232 168 348 88"
          fill="none" stroke="#ff6b6bff" />
        <path d="M 0 106 C 58 42 116 42 174 106 S 290 170 348 106 L 348 118 L 0 118 Z"
          fill="#203850aa" stroke="#9ad2ffff" />
      </svg>
    </ui>`);
}

export function draw() {
  nova64.ui.renderCanvasUI(ui, {});
}
