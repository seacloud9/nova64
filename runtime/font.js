// runtime/font.js
// 5x7 bitmap font packed as strings for readability. Monospace, ASCII 32..126.
const FONT_W = 5, FONT_H = 7, FONT_SPACING = 1;
const GLYPHS = new Map();

// Source: simple 5x7 font, custom packed
const glyphRows = {
  'A':[ '  #  ',' # # ','#   #','#####','#   #','#   #','#   #'],
  'B':[ '#### ','#   #','#### ','#   #','#   #','#   #','#### '],
  'C':[ ' ### ','#   #','#    ','#    ','#    ','#   #',' ### '],
  'D':[ '#### ','#   #','#   #','#   #','#   #','#   #','#### '],
  'E':[ '#####','#    ','###  ','#    ','#    ','#    ','#####'],
  'F':[ '#####','#    ','###  ','#    ','#    ','#    ','#    '],
  'G':[ ' ### ','#   #','#    ','# ###','#   #','#   #',' ### '],
  'H':[ '#   #','#   #','#   #','#####','#   #','#   #','#   #'],
  'I':[ '#####','  #  ','  #  ','  #  ','  #  ','  #  ','#####'],
  'J':[ '#####','    #','    #','    #','#   #','#   #',' ### '],
  'K':[ '#   #','#  # ','###  ','#  # ','#  # ','#   #','#   #'],
  'L':[ '#    ','#    ','#    ','#    ','#    ','#    ','#####'],
  'M':[ '#   #','## ##','# # #','#   #','#   #','#   #','#   #'],
  'N':[ '#   #','##  #','# # #','#  ##','#   #','#   #','#   #'],
  'O':[ ' ### ','#   #','#   #','#   #','#   #','#   #',' ### '],
  'P':[ '#### ','#   #','#   #','#### ','#    ','#    ','#    '],
  'Q':[ ' ### ','#   #','#   #','#   #','# # #','#  # ',' ## #'],
  'R':[ '#### ','#   #','#   #','#### ','#  # ','#  # ','#   #'],
  'S':[ ' ### ','#   #','#    ',' ### ','    #','#   #',' ### '],
  'T':[ '#####','  #  ','  #  ','  #  ','  #  ','  #  ','  #  '],
  'U':[ '#   #','#   #','#   #','#   #','#   #','#   #',' ### '],
  'V':[ '#   #','#   #','#   #','#   #','#   #',' # # ','  #  '],
  'W':[ '#   #','#   #','#   #','# # #','# # #','## ##','#   #'],
  'X':[ '#   #',' # # ','  #  ','  #  ','  #  ',' # # ','#   #'],
  'Y':[ '#   #',' # # ','  #  ','  #  ','  #  ','  #  ','  #  '],
  'Z':[ '#####','    #','   # ','  #  ',' #   ','#    ','#####'],
  '0':[ ' ### ','#   #','#  ##','# # #','##  #','#   #',' ### '],
  '1':[ '  #  ',' ##  ','  #  ','  #  ','  #  ','  #  ','#####'],
  '2':[ ' ### ','#   #','    #','   # ','  #  ',' #   ','#####'],
  '3':[ ' ### ','#   #','    #',' ### ','    #','#   #',' ### '],
  '4':[ '   # ','  ## ',' # # ','#  # ','#####','   # ','   # '],
  '5':[ '#####','#    ','#### ','    #','    #','#   #',' ### '],
  '6':[ ' ### ','#    ','#    ','#### ','#   #','#   #',' ### '],
  '7':[ '#####','    #','   # ','  #  ','  #  ','  #  ','  #  '],
  '8':[ ' ### ','#   #','#   #',' ### ','#   #','#   #',' ### '],
  '9':[ ' ### ','#   #','#   #',' ####','    #','    #',' ### '],
  ' ':[ '     ','     ','     ','     ','     ','     ','     '],
  '!':[ '  #  ','  #  ','  #  ','  #  ','  #  ','     ','  #  '],
  '?':[ ' ### ','#   #','    #','   # ','  #  ','     ','  #  '],
  '.':[ '     ','     ','     ','     ','     ',' ##  ',' ##  '],
  ',':[ '     ','     ','     ','     ','     ',' ##  ','  #  '],
  ':':[ '     ',' ##  ',' ##  ','     ',' ##  ',' ##  ','     '],
  '-':[ '     ','     ','     ',' ### ','     ','     ','     '],
  '_':[ '     ','     ','     ','     ','     ','     ','#####'],
  '/':[ '    #','   # ','  #  ','  #  ',' #   ','#    ','     ']
};

for (const [ch, rows] of Object.entries(glyphRows)) GLYPHS.set(ch, rows);

export const BitmapFont = {
  w: FONT_W, h: FONT_H, spacing: FONT_SPACING,
  draw(fb, text, x, y, colorBigInt) {
    const { r, g, b, a } = unpackRGBA64(colorBigInt);
    let cx = x|0, cy = y|0;
    for (let i=0;i<text.length;i++) {
      const ch = text[i];
      if (ch === '\n') { cy += FONT_H+FONT_SPACING; cx = x|0; continue; }
      const rows = GLYPHS.get(ch) || GLYPHS.get('?');
      for (let yy=0; yy<FONT_H; yy++) {
        const row = rows[FONT_H-1-yy]; // Flip Y to account for display coordinate system
        for (let xx=0; xx<FONT_W; xx++) {
          if (row[xx] !== ' ') fb.pset(cx+xx, cy+yy, r,g,b,a);
        }
      }
      cx += FONT_W + FONT_SPACING;
    }
  }
};

// Local copy of unpack to avoid circular dep; duplicated from api.js
function unpackRGBA64(c) {
  // Handle both BigInt and regular number inputs
  if (typeof c === 'bigint') {
    return {
      r: Number((c >> 48n) & 0xffffn),
      g: Number((c >> 32n) & 0xffffn),
      b: Number((c >> 16n) & 0xffffn),
      a: Number(c & 0xffffn)
    };
  } else {
    // Handle regular number input - convert to BigInt first
    const bigC = BigInt(c);
    return {
      r: Number((bigC >> 48n) & 0xffffn),
      g: Number((bigC >> 32n) & 0xffffn),
      b: Number((bigC >> 16n) & 0xffffn),
      a: Number(bigC & 0xffffn)
    };
  }
}
