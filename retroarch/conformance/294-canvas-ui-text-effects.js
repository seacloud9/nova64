// Conformance cart 294: parseCanvasUI text shadow and outline attributes.

let ui;

export function init() {
  ui = nova64.ui.parseCanvasUI(`
    <ui>
      <rect x="0" y="0" width="640" height="360" fill="#090b12" />
      <text x="24" y="28" color="#ffffffff" shadow="true"
        shadow-color="#0000aaff" shadow-blur="8">shadow</text>
      <text x="24" y="54" color="#ffd166ff" outline="true"
        outline-color="#2a0b00ff" outline-width="2">outline</text>
      <text x="24" y="82" color="#7fffd4ff" shadow="true"
        shadow-color="#003344ff" shadow-x="2" shadow-y="3"
        outline-color="#001111ff">both</text>
    </ui>`);
}

export function draw() {
  nova64.ui.renderCanvasUI(ui, {});
}
