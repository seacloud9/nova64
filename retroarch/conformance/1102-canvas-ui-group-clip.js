// Conformance cart 1102: parseCanvasUI group/panel child clipping.

let ui;

export function init() {
  ui = nova64.ui.parseCanvasUI(`
    <ui>
      <rect x="0" y="0" width="640" height="360" fill="#071018" />
      <group x="34" y="34" width="120" height="72" clip="true">
        <rect x="-16" y="-12" width="154" height="98" fill="#ff6b6bff" />
        <line x1="-20" y1="70" x2="140" y2="8" color="#ffd166ff" />
        <text x="8" y="28" color="#ffffffff">clipped words</text>
      </group>
      <rect x="34" y="34" width="120" height="72" stroke="#7fffd4ff" />
      <group x="210" y="34" width="120" height="72">
        <rect x="-16" y="-12" width="154" height="98" fill="#24466dff" />
        <line x1="-20" y1="70" x2="140" y2="8" color="#ffd166ff" />
        <text x="8" y="28" color="#ffffffff">open words</text>
      </group>
      <rect x="210" y="34" width="120" height="72" stroke="#7fffd4ff" />
      <panel x="76" y="166" width="280" height="94" fill="#102030ff"
        stroke="#7fffd4ff" title="panel" clip="true">
        <rect x="-24" y="38" width="340" height="54" fill="#4f9effff" />
        <group x="64" y="24" width="108" height="48" clip="true">
          <rect x="-42" y="-18" width="190" height="84" fill="#ff6b6bff" />
          <line x1="-32" y1="46" x2="142" y2="0" color="#ffffffff" />
        </group>
      </panel>
    </ui>`);
}

export function draw() {
  nova64.ui.renderCanvasUI(ui, {});
}
