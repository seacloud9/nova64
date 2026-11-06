// Conformance cart 1136: UTF-8 text folds to one glyph per codepoint.
// Before this, a multi-byte character such as '▶' drew as three solid blocks
// and threw off measureText/centering by two extra cells per character.

let errors = [];

export function init() {
  const cell = measureText('A').width + 1; // advance per glyph (trailing space trimmed)
  const cases = [
    ['▶ GO', 4],
    ['◆ ITEM ◆', 8],
    ['• a · b', 7],
    ['→←↑↓', 4],
    ['★✓♥●○■', 6],
    ['…', 3], // expands to "..."
    ['⚡️', 1], // emoji + variation selector: one tofu box
    ['—═─', 3],
  ];
  for (const [text, glyphs] of cases) {
    const w = measureText(text).width;
    if (w !== glyphs * cell - 1) {
      errors.push('width ' + text + ' ' + w);
      return;
    }
  }
}

export function update(dt) {}

export function draw() {
  cls(rgba8(8, 10, 18, 255));
  print('1136 UTF-8 GLYPHS', 4, 4, rgba8(200, 220, 255, 255));

  if (errors.length > 0) {
    print('FAIL', 4, 14, rgba8(255, 60, 60, 255));
    print(errors[0], 4, 24, rgba8(255, 120, 120, 255));
    return;
  }

  print('▶ START MISSION ◀', 320, 40, rgba8(120, 255, 180, 255), 2, 'center');
  print('◆ PRESS SPACE ◆', 320, 70, rgba8(255, 160, 0, 255), 2, 'center');
  print('• bullet · dot ■ square ● circle ○ ring', 20, 100, rgba8(230, 230, 255, 255));
  print('▲ ▼ ◀ ▶  → ← ↑ ↓  ★ ✓ ♥  ░▒█', 20, 116, rgba8(255, 220, 120, 255));
  print('box ┌─┐ │ └─┘  ═══  em—dash  wait…  12×4  90°', 20, 132, rgba8(160, 200, 255, 255));
  printTight('tight ▶ ◆ • ok', 20, 150, rgba8(80, 255, 210, 255));
  print('emoji 🚀🎮✨ ⚡️ tofu', 20, 166, rgba8(255, 140, 200, 255));

  print('ok', 4, 14, rgba8(80, 255, 120, 255));
}
